/**
 * Edge Protocol — Historical Re-Resolution Script
 *
 * Re-resolves all historical bets using the corrected player-names matching.
 * Specifically targets:
 *   1. Bets with actual_value=0 that were likely false matches (player not found → defaulted to 0)
 *   2. Bets that were "unresolved" due to old name matching bugs
 *
 * Usage: node scripts/re-resolve.js [--dry-run] [--date YYYY-MM-DD]
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');

const { matchBoxScore, normalize } = require('../player-names');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DRY_RUN = process.argv.includes('--dry-run');
const SINGLE_DATE = process.argv.find((a, i) => process.argv[i-1] === '--date');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, timeout: 10000 }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, data: null }); } });
    }).on('error', reject);
  });
}

// ── Fetch box score from NBA CDN ────────────────────────────────────────────

async function fetchBoxScore(gameId) {
  try {
    const { status, data } = await fetchJSON(`https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`);
    if (status !== 200 || !data?.game) return null;

    const game = data.game;
    const players = [];

    const addPlayers = (teamData, abbr) => {
      for (const p of teamData.players || []) {
        const s = p.statistics;
        if (!s) continue;
        players.push({
          name: `${p.firstName} ${p.familyName}`.trim(),
          pts: s.points || 0,
          reb: s.reboundsTotal || s.rebounds || 0,
          ast: s.assists || 0,
          fg3: s.threePointersMade || s.fg3_made || 0,
          stl: s.steals || 0,
          blk: s.blocks || 0,
          team: abbr,
          minutes: s.minutesCalculated || s.minutes || '',
        });
      }
    };

    addPlayers(game.homeTeam, game.homeTeam?.teamTricode);
    addPlayers(game.awayTeam, game.awayTeam?.teamTricode);

    return {
      game_id: gameId,
      home_team: game.homeTeam?.teamTricode,
      away_team: game.awayTeam?.teamTricode,
      home_score: game.homeTeam?.score || 0,
      away_score: game.awayTeam?.score || 0,
      total_score: (game.homeTeam?.score || 0) + (game.awayTeam?.score || 0),
      winner: (game.homeTeam?.score || 0) > (game.awayTeam?.score || 0) ? game.homeTeam?.teamTricode : game.awayTeam?.teamTricode,
      players,
    };
  } catch (e) {
    return null;
  }
}

// ── Resolve a single prop bet ───────────────────────────────────────────────

function resolveProp(bet, box) {
  const stat = bet.stat;
  const player = bet.player;
  const condition = bet.condition || (bet.bet && bet.bet.includes(' O') ? 'over' : 'under');
  const threshold = bet.threshold;

  if (!stat || !player) return null;

  const statMap = { points:'pts', rebounds:'reb', assists:'ast', fg3_made:'fg3', steals:'stl', blocks:'blk' };
  const field = statMap[stat];
  if (!field) return null;

  // Use corrected player matching
  const playerRow = matchBoxScore(player, box.players);
  if (!playerRow) return null;

  // Check if player actually played (has minutes)
  const mins = playerRow.minutes || '';
  const parsedMins = parseInt(mins) || 0;
  // If player has 0 in every stat and we can detect no minutes, they likely didn't play
  if (playerRow.pts === 0 && playerRow.reb === 0 && playerRow.ast === 0 && parsedMins === 0) {
    return { dnp: true, player_matched: playerRow.name };
  }

  const actual = playerRow[field];
  if (actual === undefined || actual === null) return null;

  const hit = condition === 'over' ? actual > threshold : actual < threshold;
  return { outcome: hit, actual_value: actual, player_matched: playerRow.name };
}

// ── Get game IDs for a date from schedule ───────────────────────────────────

async function getGameIds(date) {
  // 1. Try static game_results.json
  const resultsFile = path.join(DATA_DIR, 'game_results.json');
  if (fs.existsSync(resultsFile)) {
    const results = JSON.parse(fs.readFileSync(resultsFile));
    const found = results.filter(g => g.date === date);
    if (found.length > 0) return found;
  }

  // 2. Try NBA CDN schedule (2025-26 season)
  const scheduleUrls = [
    'https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_2.json',
    'https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json',
    'https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json',
  ];
  for (const url of scheduleUrls) {
    try {
      await sleep(300);
      const { status, data } = await fetchJSON(url);
      if (status === 200 && data?.leagueSchedule?.gameDates) {
        const dateCompact = date.replace(/-/g, '');
        for (const dayEntry of data.leagueSchedule.gameDates) {
          const entryDate = (dayEntry.gameDate || '').slice(0, 10).replace(/-/g, '').slice(0, 8);
          if (entryDate === dateCompact || dayEntry.gameDate?.startsWith(date)) {
            const games = (dayEntry.games || []).map(g => ({
              game_id: g.gameId,
              date,
              home_team: g.homeTeam?.teamTricode,
              away_team: g.awayTeam?.teamTricode,
            }));
            if (games.length > 0) return games;
          }
        }
      }
    } catch { /* try next */ }
  }

  // 3. Scan NBA CDN box scores by estimated game ID range
  // 2025-26 season: game IDs 0022500001-0022501230
  // Reference: March 29, 2026 = game ~0022501082. Season start Oct 21, 2025.
  // ~6.7 games/calendar day average
  const REFERENCE_DATE = new Date('2026-03-29');
  const REFERENCE_GAME_NUM = 1082;
  const GAMES_PER_DAY = 6.7;

  const targetDate = new Date(date);
  const daysDiff = Math.round((targetDate - REFERENCE_DATE) / 86400000);
  const estimatedGameNum = Math.max(1, Math.round(REFERENCE_GAME_NUM + daysDiff * GAMES_PER_DAY));
  const scanStart = Math.max(1, estimatedGameNum - 15);
  const scanEnd = estimatedGameNum + 15;

  console.log(`   🔍 Scanning game IDs ${scanStart}-${scanEnd} for ${date}`);

  const found = [];
  for (let i = scanStart; i <= scanEnd; i++) {
    const gameId = `002250${String(i).padStart(4, '0')}`;
    await sleep(100);
    try {
      const { status, data } = await fetchJSON(`https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`);
      if (status !== 200 || !data?.game) continue;
      const g = data.game;
      const gameDate = (g.gameTimeUTC || '').slice(0, 10);
      // Allow ±1 day for UTC/ET offset
      const gd = new Date(gameDate);
      if (Math.abs(gd - targetDate) <= 86400000 * 1.5) {
        found.push({
          game_id: gameId, date,
          home_team: g.homeTeam?.teamTricode,
          away_team: g.awayTeam?.teamTricode,
        });
      }
      // Stop if we've gone too far past
      if (gd - targetDate > 86400000 * 2) break;
    } catch { /* skip */ }
  }
  if (found.length > 0) return found;

  return [];
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const betFiles = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('bets-') && f.endsWith('.json'))
    .sort();

  const targetFiles = SINGLE_DATE
    ? betFiles.filter(f => f.includes(SINGLE_DATE))
    : betFiles;

  console.log(`\n🔄 Edge Protocol — Re-Resolution Script`);
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Files: ${targetFiles.length}\n`);

  let totalFixed = 0;
  let totalNewResolved = 0;
  let totalDNP = 0;
  let totalSkipped = 0;

  for (const file of targetFiles) {
    const filePath = path.join(DATA_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath));
    const date = file.replace('bets-', '').replace('.json', '');
    const predictions = data.predictions || [];

    // Find bets that need re-resolution
    const needsResolve = predictions.filter(p => {
      if (p.canceled) return false;
      // Type 1: actual_value = 0 for suspicious stats (points/reb/ast shouldn't be 0 if player played)
      if (p.type === 'prop' && p.outcome && p.actual_value === 0 &&
          ['points', 'rebounds', 'assists'].includes(p.stat)) return true;
      // Type 2: actual_value = 0 for any stat (could be DNP)
      if (p.type === 'prop' && p.outcome && p.actual_value === 0) return true;
      // Type 3: unresolved
      if (!p.outcome) return true;
      return false;
    });

    if (needsResolve.length === 0) continue;

    console.log(`\n📅 ${date}: ${needsResolve.length} bets to re-check`);

    // Fetch box scores for this date
    const gameIds = await getGameIds(date);
    if (gameIds.length === 0) {
      console.log(`   ⚠️ No game IDs found — skipping`);
      continue;
    }

    const boxes = {};
    for (const g of gameIds) {
      await sleep(200);
      const box = await fetchBoxScore(g.game_id);
      if (box) {
        boxes[g.game_id] = box;
        // Also index by team matchup for easier lookup
        boxes[`${box.away_team}@${box.home_team}`] = box;
        boxes[`${box.home_team}_${box.away_team}`] = box;
      }
    }
    console.log(`   📦 Fetched ${Object.keys(boxes).length / 3 | 0} box scores`);

    let dateFixed = 0;
    let dateNewResolved = 0;
    let dateDNP = 0;

    for (const bet of needsResolve) {
      if (bet.type !== 'prop') {
        totalSkipped++;
        continue;
      }

      // Find the right box score
      const [awayAbbr, homeAbbr] = (bet.game || '').split(' @ ');
      const box = boxes[`${awayAbbr}@${homeAbbr}`]
              || boxes[`${homeAbbr}_${awayAbbr}`]
              || Object.values(boxes).find(b =>
                   b.players && ((b.home_team === homeAbbr) || (b.away_team === awayAbbr)));

      if (!box || !box.players) {
        totalSkipped++;
        continue;
      }

      const result = resolveProp(bet, box);
      if (!result) {
        totalSkipped++;
        continue;
      }

      if (result.dnp) {
        // Player didn't play — should be canceled, not resolved as loss
        if (!DRY_RUN) {
          bet.outcome = null;
          bet.actual_value = null;
          bet.re_resolved = true;
          bet.re_resolve_note = `DNP — ${result.player_matched} had 0 stats/minutes`;
        }
        dateDNP++;
        console.log(`   🚫 DNP: ${bet.player} (matched: ${result.player_matched}) — was marked as loss`);
        continue;
      }

      const wasWrong = bet.outcome && bet.actual_value === 0 && result.actual_value !== 0;
      const wasUnresolved = !bet.outcome;
      const wasZeroButCorrect = bet.outcome && bet.actual_value === 0 && result.actual_value === 0;
      const newOutcome = result.outcome ? 'won' : 'lost';

      if (wasZeroButCorrect) {
        // Player genuinely scored 0 (e.g. 0 blocks) — original resolution was correct
        totalSkipped++;
        continue;
      }

      if (wasWrong) {
        console.log(`   ✅ FIXED: ${bet.bet || bet.player} — was ${bet.outcome} (actual=0) → now ${newOutcome} (actual=${result.actual_value}, matched: ${result.player_matched})`);
        if (!DRY_RUN) {
          bet.outcome = newOutcome;
          bet.actual_value = result.actual_value;
          bet.re_resolved = true;
          bet.re_resolve_note = `Corrected from false-zero. Matched: ${result.player_matched}`;
        }
        dateFixed++;
      } else if (wasUnresolved) {
        console.log(`   🆕 RESOLVED: ${bet.bet || bet.player} → ${newOutcome} (actual=${result.actual_value}, matched: ${result.player_matched})`);
        if (!DRY_RUN) {
          bet.outcome = newOutcome;
          bet.actual_value = result.actual_value;
          bet.resolved_at = new Date().toISOString();
          bet.re_resolved = true;
          bet.re_resolve_note = `Newly resolved. Matched: ${result.player_matched}`;
        }
        dateNewResolved++;
      } else {
        totalSkipped++;
      }
    }

    totalFixed += dateFixed;
    totalNewResolved += dateNewResolved;
    totalDNP += dateDNP;

    if (!DRY_RUN && (dateFixed > 0 || dateNewResolved > 0 || dateDNP > 0)) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`   💾 Saved ${file}`);
    }

    console.log(`   Summary: ${dateFixed} fixed, ${dateNewResolved} newly resolved, ${dateDNP} DNP`);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`TOTAL: ${totalFixed} false-zeros fixed, ${totalNewResolved} newly resolved, ${totalDNP} DNPs detected, ${totalSkipped} skipped`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN — no files modified' : 'LIVE — files updated'}`);
}

main().catch(err => {
  console.error('Re-resolve error:', err);
  process.exit(1);
});
