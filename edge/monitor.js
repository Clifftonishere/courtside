/**
 * Edge Protocol — Hourly Lineup Monitor
 *
 * Runs every hour 8 AM–1 PM SGT (midnight–5 AM UTC).
 * 1. Fetches ESPN NBA RSS for injury/lineup news
 * 2. Cancels bets for OUT/Doubtful players
 * 3. Reprices replacement bets for unstarted games
 * 4. Saves updated bets file + cancellation log
 * 5. Outputs Telegram alert if changes found, else MONITOR_OK
 *
 * Usage: node monitor.js [YYYY-MM-DD]
 */

'use strict';

const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const { pricebet }    = require('./odds-agent');
const { calcMaxBet }  = require('./pricing');
const { loadSeasonOut, normName: ctxNormName } = require('./context-loader');

const DATA_DIR = path.join(__dirname, 'data');
const TODAY    = process.argv[2] || new Date().toISOString().split('T')[0];
const BETS_FILE = path.join(DATA_DIR, `bets-${TODAY}.json`);
const CANCEL_LOG = path.join(DATA_DIR, 'cancellations.jsonl');
const ODDS_API_KEY = process.env.ODDS_API_KEY || '';

// SGT = UTC+8
function toSGT(date = new Date()) {
  return new Date(date.getTime() + 8 * 3600000)
    .toISOString().replace('T', ' ').slice(0, 16) + ' SGT';
}
function sgtTime(date = new Date()) {
  return new Date(date.getTime() + 8 * 3600000)
    .toISOString().slice(11, 16) + ' SGT';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchRaw(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'EdgeProtocol/2.0', Accept: '*/*', ...opts.headers },
      timeout: 10000,
    }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function fetchJSON(url) {
  const { status, body } = await fetchRaw(url);
  try { return { status, data: JSON.parse(body) }; } catch { return { status, data: null }; }
}

// ── OUT keywords ──────────────────────────────────────────────────────────────
const OUT_KEYWORDS = ['ruled out', 'will not play', 'won\'t play', 'dnp', 'scratched', ' is out', 'out for'];
const DOUBT_KEYWORDS = ['doubtful', 'questionable'];

// ── Team maps ─────────────────────────────────────────────────────────────────
const NAME_TO_ABBR = {
  'atlanta hawks':'ATL','boston celtics':'BOS','brooklyn nets':'BKN','charlotte hornets':'CHA',
  'chicago bulls':'CHI','cleveland cavaliers':'CLE','dallas mavericks':'DAL','denver nuggets':'DEN',
  'detroit pistons':'DET','golden state warriors':'GSW','houston rockets':'HOU','indiana pacers':'IND',
  'los angeles clippers':'LAC','la clippers':'LAC','los angeles lakers':'LAL','la lakers':'LAL',
  'memphis grizzlies':'MEM','miami heat':'MIA','milwaukee bucks':'MIL','minnesota timberwolves':'MIN',
  'new orleans pelicans':'NOP','new york knicks':'NYK','oklahoma city thunder':'OKC','orlando magic':'ORL',
  'philadelphia 76ers':'PHI','phoenix suns':'PHX','portland trail blazers':'POR','sacramento kings':'SAC',
  'san antonio spurs':'SAS','toronto raptors':'TOR','utah jazz':'UTA','washington wizards':'WAS',
};
const ABBR_KEYWORDS = {
  ATL:['atlanta'],BOS:['boston'],BKN:['brooklyn'],CHA:['charlotte'],CHI:['chicago'],
  CLE:['cleveland'],DAL:['dallas'],DEN:['denver'],DET:['detroit'],GSW:['golden state','warriors'],
  HOU:['houston'],IND:['indiana'],LAC:['clippers'],LAL:['lakers'],MEM:['memphis'],MIA:['miami'],
  MIL:['milwaukee'],MIN:['minnesota','timberwolves'],NOP:['new orleans'],NYK:['new york','knicks'],
  OKC:['oklahoma','thunder'],ORL:['orlando'],PHI:['philadelphia','76ers'],PHX:['phoenix'],
  POR:['portland'],SAC:['sacramento'],SAS:['san antonio'],TOR:['toronto'],UTA:['utah'],WAS:['washington'],
};
function teamMatch(fullName, abbr) {
  const n = (fullName || '').toLowerCase();
  return (ABBR_KEYWORDS[abbr] || [abbr.toLowerCase()]).some(kw => n.includes(kw));
}
function normName(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z ]/g,'').trim();
}

// ── ESPN RSS parser ───────────────────────────────────────────────────────────
async function fetchInjuryNews() {
  const injured = []; // { player, status, headline }
  try {
    const { status, body } = await fetchRaw('https://www.espn.com/espn/rss/nba/news');
    if (status !== 200) { console.log('[Monitor] ESPN RSS returned', status); return injured; }

    // Extract <item> blocks
    const items = body.match(/<item>([\s\S]*?)<\/item>/g) || [];
    const NAME_PAT = /([A-Z][a-záéíóúñ]+ [A-Z][a-záéíóúñ]+(?:-[A-Z][a-z]+)?)/g;

    for (const item of items) {
      const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
      const descMatch  = item.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/s);
      const title = (titleMatch?.[1] || '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
      const desc  = (descMatch?.[1]  || '').replace(/<[^>]+>/g,'').trim();
      const combined = `${title} ${desc}`.toLowerCase();

      const isOut    = OUT_KEYWORDS.some(kw => combined.includes(kw));
      const isDoubt  = !isOut && DOUBT_KEYWORDS.some(kw => combined.includes(kw));
      if (!isOut && !isDoubt) continue;

      // Extract player names from headline
      const names = [...(title + ' ' + desc).matchAll(NAME_PAT)].map(m => m[1]);
      for (const name of names) {
        injured.push({ player: name, status: isOut ? 'Out' : 'Doubtful', headline: title.slice(0,100) });
      }
    }

    console.log(`[Monitor] ESPN RSS: ${items.length} articles, ${injured.length} injury mentions found`);
  } catch (e) {
    console.error('[Monitor] ESPN RSS fetch failed:', e.message);
  }
  return injured;
}

// ── Odds API: which games haven't started ─────────────────────────────────────
async function fetchUnstartedGames() {
  if (!ODDS_API_KEY) return null; // null = unknown, assume all started (safe)
  try {
    const { status, data } = await fetchJSON(
      `https://api.the-odds-api.com/v4/sports/basketball_nba/events?apiKey=${ODDS_API_KEY}&dateFormat=iso`
    );
    if (status !== 200 || !Array.isArray(data)) return null;
    const now = Date.now();
    return data.filter(e => new Date(e.commence_time).getTime() > now);
  } catch (e) {
    console.error('[Monitor] Odds API fetch failed:', e.message);
    return null;
  }
}

// ── Load player logs for replacement candidates ───────────────────────────────
function loadPlayerLogs() {
  const file = path.join(DATA_DIR, 'player_game_logs_all_seasons.json');
  if (!fs.existsSync(file)) return [];
  const logs = JSON.parse(fs.readFileSync(file));
  // Build per-player season averages for 2025-26
  const playerMap = new Map();
  for (const row of logs) {
    if (row.season !== '2025-26') continue;
    const key = normName(row.player_name);
    if (!playerMap.has(key)) {
      playerMap.set(key, { name: row.player_name, team: row.team_abbreviation, games: [], pts_sum: 0, reb_sum: 0, ast_sum: 0 });
    }
    const p = playerMap.get(key);
    p.games.push(row);
    p.pts_sum += row.pts || 0;
    p.reb_sum += (row.reb || row.rebounds || 0);
    p.ast_sum += row.ast || 0;
  }
  return [...playerMap.values()].map(p => ({
    ...p,
    pts_avg: p.pts_sum / p.games.length,
    reb_avg: p.reb_sum / p.games.length,
    ast_avg: p.ast_sum / p.games.length,
  }));
}

// ── Find replacement player ───────────────────────────────────────────────────
function findReplacement(teamAbbr, excludeNames, players) {
  const excl = new Set(excludeNames.map(normName));
  return players
    .filter(p => p.team === teamAbbr && !excl.has(normName(p.name)) && p.pts_avg >= 8)
    .sort((a, b) => b.pts_avg - a.pts_avg)[0] || null;
}

// ── Check if game has started ─────────────────────────────────────────────────
function gameStarted(gameLabel, unstartedEvents) {
  if (unstartedEvents === null) return true; // conservative: assume started
  const [awayAbbr, homeAbbr] = (gameLabel || '').split(' @ ');
  const found = unstartedEvents.find(e =>
    (teamMatch(e.home_team, homeAbbr) || teamMatch(e.away_team, homeAbbr)) &&
    (teamMatch(e.home_team, awayAbbr) || teamMatch(e.away_team, awayAbbr))
  );
  return !found; // not in unstarted list = started
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n[Monitor] Edge Protocol Lineup Monitor — ${toSGT()}`);

  if (!fs.existsSync(BETS_FILE)) {
    console.log('[Monitor] No bets file for today — nothing to monitor');
    process.stdout.write('MONITOR_OK\n');
    return;
  }

  // Load bets
  const betData = JSON.parse(fs.readFileSync(BETS_FILE));
  const predictions = betData.predictions || [];
  const activeBets  = predictions.filter(b => !b.canceled);
  console.log(`[Monitor] ${predictions.length} total bets, ${activeBets.length} active`);

  // Fetch data
  const [injuryNews, unstartedEvents, players] = await Promise.all([
    fetchInjuryNews(),
    fetchUnstartedGames(),
    Promise.resolve(loadPlayerLogs()),
  ]);

  if (injuryNews.length === 0) {
    console.log('[Monitor] No injury news found');
    process.stdout.write('MONITOR_OK\n');
    return;
  }

  // Build OUT player set
  const outPlayers = new Map(); // normName → { player, status, headline }
  for (const entry of injuryNews) {
    // Only cancel for definite Out; skip Doubtful
    if (entry.status === 'Out') {
      outPlayers.set(normName(entry.player), entry);
    }
  }

  // Merge season-out list (always OUT regardless of recent news)
  const seasonOut = loadSeasonOut();
  for (const [key, val] of seasonOut) outPlayers.set(key, val);

  if (outPlayers.size === 0) {
    console.log('[Monitor] No OUT players found');
    process.stdout.write('MONITOR_OK\n');
    return;
  }

  console.log(`[Monitor] OUT players: ${[...outPlayers.keys()].join(', ')}`);

  // Scan active bets for affected players
  const canceledBets  = [];
  const affectedGames = new Set();
  const canceledByGame = new Map(); // gameLabel → [canceledPlayerName]

  for (const bet of activeBets) {
    const playerKey = normName(bet.player || '');
    if (!outPlayers.has(playerKey)) continue;

    const info = outPlayers.get(playerKey);
    bet.canceled      = true;
    bet.cancel_reason = 'player_out';
    bet.cancel_ts     = new Date().toISOString();
    bet.refund_amount = bet.bet_amount || 0;
    bet.cancel_note   = info.headline;

    canceledBets.push(bet);
    affectedGames.add(bet.game);
    if (!canceledByGame.has(bet.game)) canceledByGame.set(bet.game, []);
    canceledByGame.get(bet.game).push(bet.player);
  }

  if (canceledBets.length === 0) {
    console.log('[Monitor] No active bets affected by OUT players');
    process.stdout.write('MONITOR_OK\n');
    return;
  }

  console.log(`[Monitor] Canceled ${canceledBets.length} bets across ${affectedGames.size} game(s)`);

  // Price replacement bets for unstarted games
  const replacements = [];
  for (const [gameLabel, canceledPlayers] of canceledByGame.entries()) {
    if (gameStarted(gameLabel, unstartedEvents)) {
      console.log(`[Monitor] ${gameLabel} already started — no replacements`);
      continue;
    }
    const [awayAbbr, homeAbbr] = gameLabel.split(' @ ');

    // Find replacement players for each affected team
    const affectedTeams = new Set(
      canceledBets.filter(b => b.game === gameLabel).map(b => b.player_team || b.team || '').filter(Boolean)
    );

    for (const teamAbbr of affectedTeams) {
      const isHome   = teamAbbr === homeAbbr;
      const opponent = isHome ? awayAbbr : homeAbbr;
      const excl     = canceledPlayers;
      const sub      = findReplacement(teamAbbr, excl, players);
      if (!sub) { console.log(`[Monitor] No replacement found for ${teamAbbr}`); continue; }

      const threshold = Math.max(0.5, Math.round((sub.pts_avg - 2) * 2) / 2);
      try {
        await sleep(250);
        const result = await pricebet(sub.name, 'points', threshold,
          { player_team: teamAbbr, is_home: isHome, opponent },
          100, 500
        );
        if (!result) continue;

        const rep = {
          id: crypto.randomUUID(),
          type: 'prop',
          player: sub.name,
          stat: 'points',
          condition: 'over',
          threshold,
          game: gameLabel,
          player_team: teamAbbr,
          opponent,
          is_replacement: true,
          replaced_player: excl[0],
          bet_amount: Math.min(result.max_bet_size || 200, 300),
          probability: result.probability,
          decimal_odds: result.decimal_odds,
          american: result.american,
          vig_applied: result.vig_applied,
          confidence_score: result.confidence_score,
          confidence_tier: result.confidence_tier,
          has_market_comp: result.has_market_comp,
          market_reference: result.market_reference,
          priced_at: new Date().toISOString(),
          bet: `${sub.name} O${threshold} pts`,
        };
        replacements.push(rep);
        predictions.push(rep);
        console.log(`[Monitor] Replacement: ${sub.name} O${threshold} pts (${teamAbbr} @ ${opponent}) → ${result.decimal_odds}x`);
      } catch (e) {
        console.error(`[Monitor] Replacement price error for ${sub.name}:`, e.message);
      }
    }
  }

  // Save updated bets file
  betData.predictions   = predictions;
  betData.last_monitor  = new Date().toISOString();
  betData.total_canceled = (betData.total_canceled || 0) + canceledBets.length;
  betData.total_refunded = (betData.total_refunded || 0) + canceledBets.reduce((a,b) => a+(b.refund_amount||0), 0);
  fs.writeFileSync(BETS_FILE, JSON.stringify(betData, null, 2));

  // Append to cancellation log
  const logEntry = {
    ts: new Date().toISOString(),
    date: TODAY,
    canceled_count: canceledBets.length,
    replacements_added: replacements.length,
    total_refunded: canceledBets.reduce((a,b) => a+(b.refund_amount||0), 0),
    details: canceledBets.map(b => ({
      id: b.id, player: b.player, game: b.game,
      stat: b.stat, threshold: b.threshold,
      refund: b.refund_amount, note: b.cancel_note,
    })),
  };
  fs.appendFileSync(CANCEL_LOG, JSON.stringify(logEntry) + '\n');

  // Build Telegram output
  const totalRefund  = canceledBets.reduce((a,b) => a+(b.refund_amount||0), 0);
  const fmt$ = n => `$${Math.round(n).toLocaleString()}`;

  const lines = [
    `⚠️ *Edge Protocol — Lineup Alert (${sgtTime()})*`,
    '',
    `❌ *Canceled bets (${canceledBets.length}):*`,
  ];

  for (const b of canceledBets) {
    lines.push(`• ${b.player} O${b.threshold} ${b.stat || 'pts'} (${b.game}) — OUT — ${fmt$(b.refund_amount)} refunded`);
  }

  if (replacements.length > 0) {
    lines.push('', `✅ *Replacement bets added (${replacements.length}):*`);
    for (const r of replacements) {
      const comp = r.has_market_comp ? `✅ ${r.market_reference?.split(' @')[0] || 'comp'}` : '⚠️ no comp';
      lines.push(`• ${r.player} O${r.threshold} pts (${r.game}) → ${r.decimal_odds}x | ${Math.round(r.probability*100)}% | ${comp}`);
    }
  } else {
    lines.push('', '⚠️ *No replacements added* (games already started or no eligible players)');
  }

  lines.push(
    '',
    `📊 *${affectedGames.size} game(s) affected | ${fmt$(totalRefund)} refunded | ${replacements.length} replacement(s) priced*`
  );

  const msg = lines.join('\n');
  console.log('\n─── TELEGRAM ALERT ───\n' + msg);
  process.stdout.write('\n' + msg + '\n');
}

main().catch(err => {
  console.error('[Monitor] Fatal error:', err);
  process.stdout.write('MONITOR_OK\n'); // don't crash the cron chain
  process.exit(0);
});
