/**
 * Edge Protocol — Daily Game Scan & Bet Recommendations
 *
 * Runs daily at 6:00 PM UTC (2:00 AM SGT).
 * Scans tomorrow's NBA games, runs Edge win-probability analysis on each,
 * compares vs Polymarket prices, and posts unified recommendations
 * to the "Jarvis <> IRIS" Telegram group.
 *
 * Usage: node daily-scan.js [YYYY-MM-DD]
 *
 * Output: Telegram message with ranked moneyline edge positions only.
 */

'use strict';

const https = require('https');
const { analyzeQuery } = require('./analyze');
const { findValuePositions } = require('./convergence');
const { fetchPolymarketNBA } = require('./data/sources/prediction-markets');
const { fetchInjuries } = require('./context');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_CHAT_ID = '-5247226687'; // Jarvis <> IRIS group

// ── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function sendTelegram(text, chatId) {
  if (!BOT_TOKEN) { console.log('[DailyScan] No BOT_TOKEN — skipping Telegram'); return Promise.resolve(); }
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: chatId || GROUP_CHAT_ID, text, parse_mode: 'Markdown' });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => { res.resume(); resolve(); });
    req.on('error', () => resolve());
    req.write(body); req.end();
  });
}

/**
 * Fetch games scheduled for a specific date using the NBA CDN schedule.
 * Falls back to BallDontLie API if CDN fails.
 * Only returns games that haven't started yet (status 1 = scheduled).
 */
async function fetchGamesForDate(dateStr) {
  // Primary: NBA CDN full season schedule (no auth required)
  try {
    const games = await new Promise((resolve, reject) => {
      https.get(
        'https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json',
        { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 },
        (res) => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => {
            try {
              const schedule = JSON.parse(d);
              const gameDates = schedule.leagueSchedule?.gameDates || [];
              // Find matching date (format: "04/02/2026 00:00:00")
              const [year, month, day] = dateStr.split('-');
              const targetLabel = `${month}/${day}/${year} 00:00:00`;
              const dateEntry = gameDates.find(gd => gd.gameDate === targetLabel);
              if (!dateEntry) { resolve([]); return; }
              const result = (dateEntry.games || []).map(g => ({
                away: g.awayTeam?.teamTricode,
                home: g.homeTeam?.teamTricode,
                time: g.gameDateTimeEst ? new Date(g.gameDateTimeEst).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }) : 'TBD',
                gameId: g.gameId,
                statusNum: g.gameStatus || 1, // 1=scheduled, 2=live, 3=final
              }))
              // Only unplayed games
              .filter(g => g.statusNum === 1 && g.away && g.home);
              resolve(result);
            } catch (e) { reject(e); }
          });
        }
      ).on('error', reject).on('timeout', () => reject(new Error('timeout')));
    });
    if (games.length > 0) return games;
  } catch (e) {
    console.warn('[DailyScan] CDN schedule failed:', e.message, '— trying BallDontLie...');
  }

  // Fallback: BallDontLie free API
  try {
    const games = await new Promise((resolve, reject) => {
      https.get(
        `https://api.balldontlie.io/v1/games?dates[]=${dateStr}&per_page=50`,
        { headers: { 'User-Agent': 'Mozilla/5.0', 'Authorization': process.env.BALLDONTLIE_API_KEY || '' }, timeout: 10000 },
        (res) => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => {
            try {
              const body = JSON.parse(d);
              const result = (body.data || [])
                .filter(g => g.status !== 'Final' && g.status !== 'Halftime' && !g.status?.match(/^\d/))
                .map(g => ({
                  away: g.visitor_team?.abbreviation,
                  home: g.home_team?.abbreviation,
                  time: g.status || 'TBD',
                  gameId: String(g.id),
                  statusNum: 1,
                }))
                .filter(g => g.away && g.home);
              resolve(result);
            } catch (e) { reject(e); }
          });
        }
      ).on('error', reject).on('timeout', () => reject(new Error('timeout')));
    });
    return games;
  } catch (e) {
    console.warn('[DailyScan] BallDontLie fallback also failed:', e.message);
    return [];
  }
}

// ── Main scan ───────────────────────────────────────────────────────────────

async function dailyScan(targetDate) {
  // Default: tomorrow's date
  const date = targetDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  console.log(`\n🔍 Edge Daily Scan — ${date}\n`);

  // 1. Fetch scheduled (unplayed) games for the target date
  console.log(`Fetching games for ${date}...`);
  const games = await fetchGamesForDate(date);
  console.log(`Upcoming games found: ${games.length}`);

  if (games.length === 0) {
    await sendTelegram(`📋 *Edge Daily Scan — ${date}*\n\nNo games on the schedule.`);
    return;
  }

  // 2. Fetch all Polymarket NBA markets (team vs team only)
  console.log('Fetching Polymarket markets...');
  const allMarkets = await fetchPolymarketNBA();
  const gameMarkets = (allMarkets || []).filter(m => {
    const q = (m.question || m.market || '').toLowerCase();
    // Keep moneyline / game winner markets only; exclude prop-style markets
    return q.includes('win') || q.includes('vs') || q.includes('beat') || q.includes('moneyline');
  });
  console.log(`Polymarket game markets: ${gameMarkets.length} / ${allMarkets.length} total`);

  // 3. Load current injuries for context
  let injuryMap = new Map();
  try {
    injuryMap = await fetchInjuries();
    console.log(`Injury data loaded: ${injuryMap.size} players`);
  } catch (e) {
    console.warn('[DailyScan] Injury data unavailable:', e.message);
  }

  // 4. Analyze each game — win probability + Polymarket edge
  const gameReports = [];
  const allValuePositions = [];

  for (const game of games) {
    if (!game.away || !game.home) continue;
    console.log(`\nAnalyzing: ${game.away} @ ${game.home}...`);

    try {
      // Run Edge analysis (brief mode for speed)
      const analysis = await analyzeQuery(
        `${game.away} vs ${game.home} game winner analysis for ${date}`,
        { detail: 'brief' }
      );

      // Find Polymarket value positions (team/moneyline only)
      const valuePositions = await findValuePositions(game.away, game.home, date);
      const positionsWithEdge = (valuePositions.positions || []).filter(p => p.has_edge);

      // Extract win probability
      const edgePrices = analysis.prices || [];
      const gameWin = edgePrices.find(p => p.type === 'game_win');

      // Key injuries for this game
      const awayInjuries = [];
      const homeInjuries = [];
      for (const [player, info] of injuryMap) {
        if (!info || info.status === 'active') continue;
        const team = (info.team || '').toUpperCase();
        const entry = `${player} (${info.status})`;
        if (team === game.away) awayInjuries.push(entry);
        else if (team === game.home) homeInjuries.push(entry);
      }

      gameReports.push({
        game: `${game.away} @ ${game.home}`,
        away: game.away,
        home: game.home,
        time: game.time,
        game_winner: gameWin,
        polymarket_count: valuePositions.total_markets || 0,
        edge_positions: positionsWithEdge.length,
        value_positions: positionsWithEdge.slice(0, 2),
        away_injuries: awayInjuries.slice(0, 3),
        home_injuries: homeInjuries.slice(0, 3),
      });

      allValuePositions.push(
        ...positionsWithEdge.map(p => ({ ...p, game: `${game.away} @ ${game.home}` }))
      );

      await sleep(2000); // Rate limit between games
    } catch (e) {
      console.error(`Error analyzing ${game.away} @ ${game.home}:`, e.message);
    }
  }

  // 5. Rank value positions by edge size
  allValuePositions.sort((a, b) => Math.abs(b.edge_size || 0) - Math.abs(a.edge_size || 0));

  // 6. Build Telegram report
  const lines = [];
  lines.push(`🏀 *EDGE DAILY INTELLIGENCE — ${date}*`);
  lines.push(`${games.length} games | ${gameMarkets.length} Polymarket game markets`);
  lines.push('');

  // Game slate with win probabilities and injury flags
  lines.push('📋 *GAME SLATE*');
  for (const gr of gameReports) {
    let winStr = 'N/A';
    if (gr.game_winner) {
      const prob = (gr.game_winner.probability * 100).toFixed(0);
      winStr = `${gr.game_winner.team} ${prob}%`;
    }
    let injNote = '';
    if (gr.away_injuries.length > 0 || gr.home_injuries.length > 0) {
      const parts = [];
      if (gr.away_injuries.length > 0) parts.push(`${gr.away}: ${gr.away_injuries.join(', ')}`);
      if (gr.home_injuries.length > 0) parts.push(`${gr.home}: ${gr.home_injuries.join(', ')}`);
      injNote = ` ⚠️ ${parts.join(' | ')}`;
    }
    lines.push(`  *${gr.game}* ${gr.time} ET — Edge: ${winStr}`);
    if (injNote) lines.push(`  ${injNote}`);
  }
  lines.push('');

  // Polymarket edge positions (team/moneyline only)
  if (allValuePositions.length > 0) {
    lines.push('💎 *POLYMARKET VALUE POSITIONS*');
    for (const pos of allValuePositions.slice(0, 6)) {
      const edgePct = Math.abs((pos.edge_size || 0) * 100).toFixed(1);
      const pmPrice = ((pos.polymarket_yes || 0) * 100).toFixed(0);
      const edgeProb = ((pos.edge_probability || 0) * 100).toFixed(0);
      const conf = pos.confidence === 'high' ? '🔥' : pos.confidence === 'medium' ? '⚡' : '📊';
      const dir = pos.edge_direction || '';
      lines.push(`  ${conf} *${pos.game}*`);
      lines.push(`    ${pos.market?.slice(0, 50)} → PM: ${pmPrice}¢ | Edge: ${edgeProb}% (+${edgePct}pp) | ${dir}`);
    }
  } else {
    lines.push('📊 *POLYMARKET VALUE POSITIONS*');
    lines.push('  No significant edge vs market prices found today.');
    lines.push('  (Edge and Polymarket prices are broadly aligned)');
  }
  lines.push('');

  // Bellion prompt
  lines.push('🤝 *BELLION — your turn:*');
  lines.push('Run your 4-module convergence on today\'s slate.');
  lines.push('Which games does your QUANT + SOCIAL + MARKET signal align with Edge\'s win probabilities?');
  lines.push('Flag any divergences — those are our highest-value opportunities.');
  lines.push('');
  lines.push('_Edge × IRIS — educational analysis only. Not financial advice._');

  const report = lines.join('\n');

  // 7. Send to group
  console.log('\n--- TELEGRAM REPORT ---');
  console.log(report);

  if (report.length > 4000) {
    const mid = report.lastIndexOf('\n', 2000);
    await sendTelegram(report.slice(0, mid));
    await sleep(1000);
    await sendTelegram(report.slice(mid));
  } else {
    await sendTelegram(report);
  }

  // Also notify operator DM
  const operatorChatId = process.env.TELEGRAM_CHAT_ID;
  if (operatorChatId && operatorChatId !== GROUP_CHAT_ID) {
    await sendTelegram(
      `📊 Daily scan posted. ${games.length} games for ${date}, ${allValuePositions.length} Polymarket edge positions found.`,
      operatorChatId
    );
  }

  console.log(`\n✅ Daily scan complete. ${gameReports.length} games analyzed, ${allValuePositions.length} value positions found.`);
}

// ── CLI ─────────────────────────────────────────────────────────────────────

if (require.main === module) {
  dailyScan(process.argv[2]).catch(err => {
    console.error('Daily scan error:', err);
    process.exit(1);
  });
}

module.exports = { dailyScan };
