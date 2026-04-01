/**
 * Edge Protocol — Daily Game Scan & Bet Recommendations
 *
 * Runs daily at 6:00 PM UTC (2:00 AM SGT).
 * Scans tomorrow's NBA games, computes sportsbook-calibrated win probabilities,
 * compares vs Polymarket prices, and posts unified recommendations
 * to the "Jarvis <> IRIS" Telegram group.
 *
 * Design: ONE Odds API call + ONE Polymarket call = all data we need.
 * No per-game Claude calls → completes in <15 seconds.
 *
 * Usage: node daily-scan.js [YYYY-MM-DD]
 *
 * Output: Telegram message with game slate + moneyline edge positions.
 */

'use strict';

const https = require('https');
const { execSync } = require('child_process');
const { fetchPolymarketNBA } = require('./data/sources/prediction-markets');
const { fetchInjuries } = require('./context');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_CHAT_ID = '-5247226687'; // Jarvis <> IRIS group
const ODDS_API_KEY = (process.env.ODDS_API_KEY || '').trim();

// ── Team name maps ───────────────────────────────────────────────────────────

const TEAM_ABBR_TO_NAME = {
  ATL: 'Hawks', BOS: 'Celtics', BKN: 'Nets', CHA: 'Hornets', CHI: 'Bulls',
  CLE: 'Cavaliers', DAL: 'Mavericks', DEN: 'Nuggets', DET: 'Pistons',
  GSW: 'Warriors', HOU: 'Rockets', IND: 'Pacers', LAC: 'Clippers', LAL: 'Lakers',
  MEM: 'Grizzlies', MIA: 'Heat', MIL: 'Bucks', MIN: 'Timberwolves',
  NOP: 'Pelicans', NYK: 'Knicks', OKC: 'Thunder', ORL: 'Magic',
  PHI: '76ers', PHX: 'Suns', POR: 'Trail Blazers', SAC: 'Kings',
  SAS: 'Spurs', TOR: 'Raptors', UTA: 'Jazz', WAS: 'Wizards',
};

// Full team name → abbreviation (lowercase keys)
const NAME_TO_ABBR = {};
for (const [abbr, name] of Object.entries(TEAM_ABBR_TO_NAME)) {
  NAME_TO_ABBR[name.toLowerCase()] = abbr;
  NAME_TO_ABBR[abbr.toLowerCase()] = abbr;
  // Common cities
  const city = name.split(' ')[0].toLowerCase();
  if (!NAME_TO_ABBR[city]) NAME_TO_ABBR[city] = abbr;
}
// Manual extras
Object.assign(NAME_TO_ABBR, {
  'golden state': 'GSW', 'warriors': 'GSW',
  'new york': 'NYK', 'knicks': 'NYK',
  'los angeles clippers': 'LAC', 'la clippers': 'LAC',
  'los angeles lakers': 'LAL', 'la lakers': 'LAL',
  'new orleans': 'NOP', 'oklahoma city': 'OKC',
  'san antonio': 'SAS', 'portland': 'POR',
  'trail blazers': 'POR', 'blazers': 'POR',
  '76ers': 'PHI', 'sixers': 'PHI',
  'timberwolves': 'MIN', 'wolves': 'MIN',
});

function teamToAbbr(name) {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  // 1. Exact match
  if (NAME_TO_ABBR[lower]) return NAME_TO_ABBR[lower];
  // 2. Substring match — require whole-word boundaries to avoid
  //    "golden" matching "den" (Denver) or similar false positives
  for (const [key, abbr] of Object.entries(NAME_TO_ABBR)) {
    if (key.length < 4) continue; // skip very short keys (e.g. 'den', 'uta', 'hou' etc.)
    // Whole-word check: key must be preceded/followed by start/end or space
    const idx = lower.indexOf(key);
    if (idx === -1) continue;
    const before = idx === 0 ? ' ' : lower[idx - 1];
    const after = idx + key.length >= lower.length ? ' ' : lower[idx + key.length];
    if ((before === ' ' || idx === 0) && (after === ' ' || idx + key.length === lower.length)) {
      return abbr;
    }
  }
  return null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Edge/1.0' }, timeout: 15000 }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function devig(decimalOdds) {
  const raw = decimalOdds.map(d => 1 / d);
  const total = raw.reduce((s, p) => s + p, 0);
  return raw.map(p => p / total);
}

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

// ── Fetch tomorrow's scheduled games ────────────────────────────────────────

async function fetchGamesForDate(dateStr) {
  // Primary: NBA CDN full season schedule
  try {
    const r = await httpsGet('https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json');
    if (r.status === 200) {
      const schedule = JSON.parse(r.body);
      const [year, month, day] = dateStr.split('-');
      const targetLabel = `${month}/${day}/${year} 00:00:00`;
      const dateEntry = (schedule.leagueSchedule?.gameDates || []).find(gd => gd.gameDate === targetLabel);
      if (dateEntry) {
        const games = (dateEntry.games || [])
          .filter(g => (g.gameStatus || 1) === 1 && g.awayTeam?.teamTricode && g.homeTeam?.teamTricode)
          .map(g => ({
            away: g.awayTeam.teamTricode,
            home: g.homeTeam.teamTricode,
            time: g.gameDateTimeEst
              ? new Date(g.gameDateTimeEst).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })
              : 'TBD',
          }));
        if (games.length > 0) {
          console.log(`[Schedule] NBA CDN: ${games.length} games on ${dateStr}`);
          return games;
        }
      }
    }
  } catch (e) {
    console.warn('[Schedule] CDN failed:', e.message);
  }

  // Fallback: BallDontLie free API
  try {
    const r = await httpsGet(`https://api.balldontlie.io/v1/games?dates[]=${dateStr}&per_page=50`);
    if (r.status === 200) {
      const body = JSON.parse(r.body);
      const games = (body.data || [])
        .filter(g => !g.status?.match(/Final|Halftime|^\d/))
        .map(g => ({
          away: g.visitor_team?.abbreviation,
          home: g.home_team?.abbreviation,
          time: g.status || 'TBD',
        }))
        .filter(g => g.away && g.home);
      if (games.length > 0) {
        console.log(`[Schedule] BallDontLie: ${games.length} games on ${dateStr}`);
        return games;
      }
    }
  } catch (e) {
    console.warn('[Schedule] BallDontLie failed:', e.message);
  }

  return [];
}

// ── Fetch sportsbook win probabilities (single Odds API call) ────────────────

async function fetchOddsWinProbs(dateStr) {
  if (!ODDS_API_KEY) {
    console.warn('[Odds] No ODDS_API_KEY — skipping sportsbook win probs');
    return new Map();
  }

  const url = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h&oddsFormat=decimal`;
  let rawBody = null;
  try {
    // Use curl for reliability on VPS (Node.js https can timeout on some network configs)
    rawBody = execSync(
      `curl -s --max-time 20 "${url}"`,
      { maxBuffer: 10 * 1024 * 1024, timeout: 25000 }
    ).toString();
  } catch (e) {
    console.warn('[Odds] curl failed:', e.message);
    // Fallback: Node.js https
    try {
      const r = await httpsGet(url);
      rawBody = r.body;
    } catch (e2) {
      console.error('[Odds] Both curl and https failed:', e2.message);
      return new Map();
    }
  }

  try {
    const events = JSON.parse(rawBody);
    const winProbs = new Map(); // "AWAY@HOME" → { away_prob, home_prob, away, home }

    for (const ev of events) {
      // NBA games can start 5-10 PM ET, which is UTC+0 next day for late games
      // So accept ±1 day from target date to catch all tip-offs
      const evDate = ev.commence_time ? ev.commence_time.slice(0, 10) : null;
      if (!evDate) continue;
      const evMs = new Date(evDate).getTime();
      const targetMs = new Date(dateStr).getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (Math.abs(evMs - targetMs) > oneDayMs) continue;

      const awayAbbr = teamToAbbr(ev.away_team);
      const homeAbbr = teamToAbbr(ev.home_team);
      if (!awayAbbr || !homeAbbr) continue;

      // Average across all bookmakers
      const bookProbs = [];
      for (const bookmaker of ev.bookmakers || []) {
        for (const market of bookmaker.markets || []) {
          if (market.key !== 'h2h') continue;
          const outcomes = market.outcomes || [];
          if (outcomes.length < 2) continue;
          const prices = outcomes.map(o => o.price);
          const fair = devig(prices);
          // Map outcome names to away/home
          for (let i = 0; i < outcomes.length; i++) {
            const oAbbr = teamToAbbr(outcomes[i].name);
            if (oAbbr === awayAbbr) bookProbs.push({ away: fair[i], home: 1 - fair[i] });
            else if (oAbbr === homeAbbr) bookProbs.push({ away: 1 - fair[i], home: fair[i] });
          }
          break; // one market per bookmaker
        }
      }

      if (bookProbs.length === 0) continue;
      const avgAway = bookProbs.reduce((s, p) => s + p.away, 0) / bookProbs.length;
      const avgHome = bookProbs.reduce((s, p) => s + p.home, 0) / bookProbs.length;

      const key = `${awayAbbr}@${homeAbbr}`;
      // Format game time in ET
      let timeET = 'TBD';
      try {
        timeET = new Date(ev.commence_time).toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York'
        });
      } catch { /* ignore */ }
      winProbs.set(key, { away: awayAbbr, home: homeAbbr, away_prob: avgAway, home_prob: avgHome, books: bookProbs.length, time: timeET });
    }

    console.log(`[Odds] Win probs loaded for ${winProbs.size} games on ${dateStr}`);
    return winProbs;
  } catch (e) {
    console.error('[Odds] Error fetching win probs:', e.message);
    return new Map();
  }
}

// ── Match Polymarket game markets to specific games ──────────────────────────

function findPolymarketMoneyline(allMarkets, awayAbbr, homeAbbr) {
  const awayName = (TEAM_ABBR_TO_NAME[awayAbbr] || awayAbbr).toLowerCase();
  const homeName = (TEAM_ABBR_TO_NAME[homeAbbr] || homeAbbr).toLowerCase();
  const awayCity = awayName.split(' ')[0];
  const homeCity = homeName.split(' ')[0];

  return allMarkets.filter(m => {
    const q = (m.question || '').toLowerCase();
    const url = (m.url || '').toLowerCase();

    // EXCLUDE totals, spreads, props — we only want moneyline/game-winner
    if (q.includes('o/u') || q.includes('total') || q.includes('spread') ||
        q.includes('points') || q.includes('rebounds') || q.includes('assists') ||
        url.includes('-total-') || url.includes('-spread-') || url.includes('-pts-') ||
        url.includes('-reb-') || url.includes('-ast-')) {
      return false;
    }

    // Must mention BOTH teams (moneyline is always team vs team)
    const mentionsAway = q.includes(awayName) || q.includes(awayCity) || q.includes(awayAbbr.toLowerCase());
    const mentionsHome = q.includes(homeName) || q.includes(homeCity) || q.includes(homeAbbr.toLowerCase());
    if (!mentionsAway || !mentionsHome) return false;

    // Must look like a winner market
    const isWinner = q.includes('win') || q.includes('vs') || q.includes('beat') ||
                     q.includes('moneyline') || m.type === 'game';
    return isWinner;
  });
}

// ── Main scan ────────────────────────────────────────────────────────────────

async function dailyScan(targetDate) {
  const date = targetDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  console.log(`\n🔍 Edge Daily Scan — ${date}\n`);

  // 1. Fetch all data in parallel
  // Odds API is the authoritative source for both games AND win probs
  console.log('Fetching market data in parallel...');
  const [winProbs, allMarkets, injuryMap] = await Promise.all([
    fetchOddsWinProbs(date),
    fetchPolymarketNBA().catch(() => []),
    fetchInjuries().catch(() => new Map()),
  ]);

  // 2. Build game list from Odds API data (most current schedule)
  // Fall back to NBA CDN only if Odds API has no games for this date
  let games = Array.from(winProbs.values()).map(g => ({
    away: g.away,
    home: g.home,
    time: g.time || 'TBD',
  }));

  if (games.length === 0) {
    console.log('[Schedule] Odds API has no games — trying NBA CDN...');
    games = await fetchGamesForDate(date);
  }

  if (games.length === 0) {
    await sendTelegram(`📋 *Edge Daily Scan — ${date}*\n\nNo games on the schedule.`);
    return;
  }
  console.log(`Games: ${games.map(g => `${g.away}@${g.home}`).join(', ')}`);

  const gameMarkets = (allMarkets || []).filter(m =>
    m.type === 'game' || (m.question || '').toLowerCase().includes('win') ||
    (m.question || '').toLowerCase().includes('vs')
  );
  console.log(`Polymarket game markets: ${gameMarkets.length}`);
  console.log(`Injuries loaded: ${injuryMap.size} players`);

  // 3. Build game-by-game report
  const gameReports = [];
  const valuePositions = [];

  for (const game of games) {
    const key = `${game.away}@${game.home}`;
    const odds = winProbs.get(key);

    // Win probabilities (from Odds API de-vigged consensus)
    let awayProb = odds?.away_prob ?? null;
    let homeProb = odds?.home_prob ?? null;

    // Key injuries
    const awayInjured = [], homeInjured = [];
    for (const [player, info] of injuryMap) {
      if (!info || info.status?.toLowerCase() === 'active') continue;
      const team = (info.team || '').toUpperCase();
      const label = `${player} (${info.status || 'Out'})`;
      if (team === game.away) awayInjured.push(label);
      else if (team === game.home) homeInjured.push(label);
    }

    // Polymarket moneyline markets for this game only
    const pmMatches = findPolymarketMoneyline(gameMarkets, game.away, game.home);

    // Find edge: compare sportsbook de-vigged prob vs Polymarket yes price
    for (const pm of pmMatches) {
      const outcomes = pm.outcomes || [];
      if (outcomes.length === 0) continue;

      const yesPrice = outcomes[0]?.price;
      if (!yesPrice || yesPrice < 0.02 || yesPrice > 0.98) continue;

      // Try to identify which team is "YES"
      const q = (pm.question || '').toLowerCase();
      const awayName = (TEAM_ABBR_TO_NAME[game.away] || game.away).toLowerCase();
      const homeName = (TEAM_ABBR_TO_NAME[game.home] || game.home).toLowerCase();
      const yesIsAway = q.includes(awayName.split(' ')[0]) && !q.startsWith(homeName.split(' ')[0]);

      const edgeProb = awayProb !== null
        ? (yesIsAway ? awayProb : homeProb)
        : null;

      const edgeSize = edgeProb !== null ? edgeProb - yesPrice : null;
      const hasEdge = edgeSize !== null && Math.abs(edgeSize) > 0.05;

      if (hasEdge) {
        const conf = Math.abs(edgeSize) > 0.12 ? 'high' : Math.abs(edgeSize) > 0.07 ? 'medium' : 'low';
        valuePositions.push({
          game: `${game.away} @ ${game.home}`,
          market: pm.question,
          polymarket_yes: yesPrice,
          edge_probability: edgeProb,
          edge_size: edgeSize,
          edge_direction: edgeSize > 0 ? 'YES (underpriced)' : 'NO (overpriced)',
          confidence: conf,
          url: pm.url,
        });
      }
    }

    gameReports.push({
      game: `${game.away} @ ${game.home}`,
      away: game.away,
      home: game.home,
      time: game.time,
      away_prob: awayProb,
      home_prob: homeProb,
      away_injured: awayInjured.slice(0, 3),
      home_injured: homeInjured.slice(0, 3),
      pm_markets: pmMatches.length,
    });
  }

  // Sort value positions by edge magnitude
  valuePositions.sort((a, b) => Math.abs(b.edge_size || 0) - Math.abs(a.edge_size || 0));

  // 4. Build Telegram report
  const lines = [];
  lines.push(`🏀 *EDGE DAILY INTELLIGENCE — ${date}*`);
  lines.push(`${games.length} games | ${gameMarkets.length} Polymarket markets`);
  lines.push('');

  // Game slate
  lines.push('📋 *GAME SLATE*');
  for (const gr of gameReports) {
    let winLine = 'Odds TBD';
    if (gr.away_prob !== null && gr.home_prob !== null) {
      const favTeam = gr.away_prob > gr.home_prob ? gr.away : gr.home;
      const favProb = Math.max(gr.away_prob, gr.home_prob);
      winLine = `${favTeam} favored (${(favProb * 100).toFixed(0)}%)`;
    }
    lines.push(`  *${gr.game}* ${gr.time} ET — ${winLine}`);

    // Injury flags
    if (gr.away_injured.length > 0) lines.push(`    ⚠️ ${gr.away}: ${gr.away_injured.join(', ')}`);
    if (gr.home_injured.length > 0) lines.push(`    ⚠️ ${gr.home}: ${gr.home_injured.join(', ')}`);
  }
  lines.push('');

  // Polymarket edge positions
  if (valuePositions.length > 0) {
    lines.push('💎 *POLYMARKET MONEYLINE EDGES*');
    lines.push('_(Sportsbook de-vigged prob vs Polymarket YES price)_');
    lines.push('');
    for (const pos of valuePositions.slice(0, 6)) {
      const edgePct = (Math.abs(pos.edge_size) * 100).toFixed(1);
      const pm = (pos.polymarket_yes * 100).toFixed(0);
      const ep = pos.edge_probability ? (pos.edge_probability * 100).toFixed(0) : '?';
      const conf = pos.confidence === 'high' ? '🔥' : pos.confidence === 'medium' ? '⚡' : '📊';
      lines.push(`  ${conf} *${pos.game}*`);
      lines.push(`    ${pos.market?.slice(0, 55)}`);
      lines.push(`    Sportsbooks: ${ep}% | Polymarket: ${pm}¢ | Edge: +${edgePct}pp | ${pos.edge_direction}`);
      if (pos.url) lines.push(`    🔗 ${pos.url}`);
    }
  } else {
    lines.push('📊 *POLYMARKET MONEYLINE EDGES*');
    lines.push('  No significant divergence between sportsbooks and Polymarket today.');
    lines.push('  Markets appear broadly aligned (< 5pp gap on all games).');
  }
  lines.push('');

  // Bellion prompt
  lines.push('🤝 *BELLION — your turn:*');
  lines.push('Run your 4-module convergence on today\'s slate.');
  lines.push('Which games does your QUANT + SOCIAL + MARKET signal agree with Edge\'s win probs above?');
  lines.push('Flag divergences — those are our highest-value opportunities.');
  lines.push('');
  lines.push('_Edge × IRIS — educational analysis only. Not financial advice._');

  const report = lines.join('\n');

  // 5. Send to group
  console.log('\n--- TELEGRAM REPORT ---');
  console.log(report);
  console.log('-----------------------');

  if (report.length > 4000) {
    const mid = report.lastIndexOf('\n', 2000);
    await sendTelegram(report.slice(0, mid));
    await sleep(1000);
    await sendTelegram(report.slice(mid));
  } else {
    await sendTelegram(report);
  }

  const operatorChatId = process.env.TELEGRAM_CHAT_ID;
  if (operatorChatId && operatorChatId !== GROUP_CHAT_ID) {
    await sendTelegram(
      `📊 Daily scan done. ${games.length} games for ${date}. ${valuePositions.length} Polymarket edge positions found.`,
      operatorChatId
    );
  }

  console.log(`\n✅ Done. ${gameReports.length} games, ${valuePositions.length} edge positions.`);
  return { games: gameReports, value_positions: valuePositions };
}

// ── CLI ─────────────────────────────────────────────────────────────────────

if (require.main === module) {
  dailyScan(process.argv[2]).catch(err => {
    console.error('Daily scan error:', err);
    process.exit(1);
  });
}

module.exports = { dailyScan };
