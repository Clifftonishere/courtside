/**
 * Edge Protocol - HTTP API Server
 * Exposes the odds engine as a REST API
 * 
 * Start: node server.js
 * Default port: 3747
 * 
 * Endpoints:
 *   POST  /price          — Price any bet
 *   PATCH /resolve        — Resolve a prediction outcome
 *   GET   /accuracy       — Accuracy & calibration report
 *   GET   /player/:name   — Player stats & splits
 *   GET   /defense/:team  — Team defensive ratings
 *   GET   /injuries       — Live NBA injury report
 *   GET   /games/today    — Today's NBA schedule
 *   GET   /health         — Health check
 */

const http = require('http');
const https = require('https');
const { calcProbability } = require('./calc');
const { pricebet } = require('./odds-agent');
const { buildContext, fetchInjuries } = require('./context');
const { logPrediction, resolvePrediction, getAccuracyReport } = require('./logger');
const { getRequestsUsed, getRequestsRemaining } = require('./market');
const { analyzeQuery } = require('./analyze');

const PORT = process.env.PORT || 3747;
const API_KEY = process.env.EDGE_API_KEY || 'edge-dev-key';

// ── Rate limiting ───────────────────────────────────────
const rateLimits = new Map(); // key → { count, resetAt }
const RATE_LIMITS = {
  '/price':   { max: 60,  windowMs: 60000 },  // 60 req/min
  '/analyze': { max: 10,  windowMs: 60000 },  // 10 req/min (expensive)
  default:    { max: 120, windowMs: 60000 },   // 120 req/min general
};

function checkRateLimit(pathname, clientKey) {
  const config = RATE_LIMITS[pathname] || RATE_LIMITS.default;
  const key = `${clientKey}:${pathname}`;
  const now = Date.now();
  let entry = rateLimits.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + config.windowMs };
    rateLimits.set(key, entry);
  }
  entry.count++;

  if (entry.count > config.max) {
    return { limited: true, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { limited: false };
}

// Clean up stale rate limit entries every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (now > entry.resetAt + 60000) rateLimits.delete(key);
  }
}, 300000);

// ── Crash monitoring ────────────────────────────────────
let requestCount = 0;
let errorCount = 0;
const startedAt = new Date().toISOString();

process.on('uncaughtException', (err) => {
  console.error('[CRASH] Uncaught exception:', err.message, err.stack);
  errorCount++;
  // Don't exit — let systemd restart if needed
});

process.on('unhandledRejection', (reason) => {
  console.error('[CRASH] Unhandled rejection:', reason);
  errorCount++;
});

// ── Helpers ──────────────────────────────────────────────
function json(res, status, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
  });
}

function authCheck(req, res) {
  const key = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (key !== API_KEY) {
    json(res, 401, { error: 'Invalid API key. Pass x-api-key header.' });
    return false;
  }
  return true;
}

// ── Route handlers ───────────────────────────────────────

// POST /price
// Body: { player, stat, condition, threshold, opponent?, home?, game_date?, player_team?, notes? }
async function handlePrice(req, res) {
  const body = await parseBody(req);
  const { player, stat, condition, threshold, ...context } = body;

  if (!player || !stat || !condition || threshold === undefined) {
    return json(res, 400, { 
      error: 'Required fields: player, stat, condition, threshold',
      example: {
        player: 'Jalen Brunson',
        stat: 'points',
        condition: 'over',
        threshold: 27,
        opponent: 'BOS',
        home: false,
        game_date: '2026-03-09',
        player_team: 'NYK',
      }
    });
  }

  try {
    const result = await pricebet(player, stat, condition, Number(threshold), {
      game_date: context.game_date || context.date || new Date().toISOString().split('T')[0],
      ...context,
    });

    if (result.error) return json(res, 404, { error: result.error });

    // Log prediction
    const requestPayload = { player, stat, condition, threshold: Number(threshold), ...context };
    const responsePayload = {
      probability: result.probability,
      decimal_odds: result.decimal_odds,
      confidence_tier: result.confidence_tier,
      confidence_score: result.confidence_score,
    };
    const predictionId = logPrediction(requestPayload, responsePayload);

    json(res, 200, {
      prediction_id: predictionId,
      bet: result.bet,
      player: result.player,
      stat: result.stat,
      condition: result.condition,
      threshold: result.threshold,
      opponent: result.opponent,
      probability: result.probability,
      calibrated_probability: result.calibrated_probability,
      baseline_probability: result.baseline_probability,
      confidence_score: result.confidence_score,
      confidence_tier: result.confidence_tier,
      confidence_breakdown: result.confidence_breakdown,
      vig_applied: result.vig_applied,
      decimal_odds: result.decimal_odds,
      fair_decimal: result.fair_decimal,
      american: result.american,
      fair_american: result.fair_american,
      implied_probability: result.implied_probability,
      max_bet_size: result.max_bet_size,
      max_payout: result.max_payout,
      pool_size: result.pool_size,
      has_market_comp: result.has_market_comp,
      market_reference: result.market_reference,
      calibration_note: result.calibration_note,
      data_points_used: result.data_points_used,
      recent_games_30d: result.recent_games_30d,
      reasoning: result.reasoning,
      key_risk: result.key_risk,
      adjustment_from_baseline: result.adjustment_from_baseline,
      context: result.enriched_context ? {
        player_status: result.enriched_context.player_status,
        opponent_injuries: result.enriched_context.opponent_key_injuries,
        team_defense: result.enriched_context.team_defense,
        positional_defense: result.enriched_context.positional_defense,
        back_to_back: result.enriched_context.back_to_back,
      } : null,
      splits: result.splits,
      recent_5: result.recent_5,
    });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
}

// PATCH /resolve
// Body: { id, outcome, actual_value? }
async function handleResolve(req, res) {
  const body = await parseBody(req);
  const { id, outcome, actual_value } = body;

  if (!id || outcome === undefined) {
    return json(res, 400, { error: 'Required fields: id, outcome (true/false)' });
  }

  const updated = resolvePrediction(id, outcome, actual_value);
  if (!updated) return json(res, 404, { error: `Prediction not found: ${id}` });

  json(res, 200, updated);
}

// GET /accuracy?days=30
function handleAccuracy(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const days = parseInt(url.searchParams.get('days') || '30', 10);
  const report = getAccuracyReport(days);
  json(res, 200, report);
}

// GET /player/:name
function handlePlayer(req, res, name) {
  const fs = require('fs');
  const path = require('path');

  const decoded = decodeURIComponent(name.replace(/\+/g, ' '));
  const stats = ['points', 'rebounds', 'assists', 'turnovers', 'blocks', 'steals', 'fg3_made'];
  const thresholds = { points: [20, 25, 30], rebounds: [8, 10, 12], assists: [7, 9, 11], turnovers: [3, 4, 5], blocks: [1, 2, 3], steals: [1, 2], fg3_made: [3, 4, 5] };

  const summary = {};
  let playerResolved = null;

  for (const stat of stats) {
    const t = thresholds[stat][1]; // middle threshold
    const result = calcProbability(decoded, stat, 'over', t);
    if (result.error) continue;
    playerResolved = result.player;
    summary[stat] = {
      avg: result.context.avg,
      std_dev: result.context.std_dev,
      range: `${result.context.min}–${result.context.max}`,
      thresholds: {},
    };
    for (const th of thresholds[stat] || [t]) {
      const r = calcProbability(decoded, stat, 'over', th);
      if (!r.error) {
        summary[stat].thresholds[`over_${th}`] = {
          pct: r.baseline_pct,
          l10: r.splits.last_10?.pct ?? null,
          sample: r.sample_size,
        };
      }
    }
  }

  if (!playerResolved) return json(res, 404, { error: `Player not found: ${decoded}` });

  json(res, 200, { player: playerResolved, stats: summary });
}

// GET /defense/:team
function handleDefense(req, res, team) {
  const fs = require('fs');
  const path = require('path');
  const DATA_DIR = path.join(__dirname, 'data');

  let teamDef = {}, posDef = {};
  try {
    const tdFile = path.join(DATA_DIR, 'team_defense.json');
    const pdFile = path.join(DATA_DIR, 'pos_defense.json');
    if (fs.existsSync(tdFile)) teamDef = JSON.parse(fs.readFileSync(tdFile));
    if (fs.existsSync(pdFile)) posDef = JSON.parse(fs.readFileSync(pdFile));
  } catch (e) {
    return json(res, 500, { error: `Failed to load defense data: ${e.message}` });
  }

  const t = team.toUpperCase();
  const td = teamDef[t];
  if (!td) return json(res, 404, { error: `Team not found: ${t}` });

  json(res, 200, {
    team: t,
    overall: td,
    by_position: posDef.ratings[t] || {},
    league_avg_by_position: posDef.leagueAvg || {},
  });
}

// GET /injuries
async function handleInjuries(req, res) {
  const injuries = await fetchInjuries();
  const byStatus = { Out: [], DayToDay: [], Questionable: [] };
  for (const p of injuries.values()) {
    if (p.status === 'Out') byStatus.Out.push(p);
    else if (p.status === 'Day-To-Day') byStatus.DayToDay.push(p);
    else byStatus.Questionable.push(p);
  }
  json(res, 200, { total: injuries.size, ...byStatus });
}

// GET /games/today
async function handleGames(req, res) {
  const https = require('https');
  const data = await new Promise((resolve, reject) => {
    https.get('https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json', 
      { headers: { 'User-Agent': 'Mozilla/5.0' } },
      (r) => {
        let d = ''; r.on('data', c => d += c);
        r.on('end', () => resolve(JSON.parse(d)));
      }
    ).on('error', reject);
  });
  
  const games = data.scoreboard.games.map(g => ({
    game_id: g.gameId,
    status: g.gameStatusText,
    away: { team: g.awayTeam.teamTricode, score: g.awayTeam.score },
    home: { team: g.homeTeam.teamTricode, score: g.homeTeam.score },
    period: g.period,
  }));

  json(res, 200, { date: data.scoreboard.gameDate, games });
}

// ── Markets Today — Courtside Integration ────────────────

const ODDS_API_KEY = process.env.ODDS_API_KEY || '';
const POLYMARKET_GAMMA_API = 'https://gamma-api.polymarket.com';

// In-memory cache: { data, timestamp }
let marketsCache = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'EdgeProtocol/2.0' } }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch (e) { reject(new Error(`JSON parse failed for ${url}`)); }
      });
    }).on('error', reject);
  });
}

// NBA team tricode mappings for matching
const TEAM_NAMES = {
  'Atlanta Hawks': 'ATL', 'Boston Celtics': 'BOS', 'Brooklyn Nets': 'BKN',
  'Charlotte Hornets': 'CHA', 'Chicago Bulls': 'CHI', 'Cleveland Cavaliers': 'CLE',
  'Dallas Mavericks': 'DAL', 'Denver Nuggets': 'DEN', 'Detroit Pistons': 'DET',
  'Golden State Warriors': 'GSW', 'Houston Rockets': 'HOU', 'Indiana Pacers': 'IND',
  'Los Angeles Clippers': 'LAC', 'Los Angeles Lakers': 'LAL', 'Memphis Grizzlies': 'MEM',
  'Miami Heat': 'MIA', 'Milwaukee Bucks': 'MIL', 'Minnesota Timberwolves': 'MIN',
  'New Orleans Pelicans': 'NOP', 'New York Knicks': 'NYK', 'Oklahoma City Thunder': 'OKC',
  'Orlando Magic': 'ORL', 'Philadelphia 76ers': 'PHI', 'Phoenix Suns': 'PHX',
  'Portland Trail Blazers': 'POR', 'Sacramento Kings': 'SAC', 'San Antonio Spurs': 'SAS',
  'Toronto Raptors': 'TOR', 'Utah Jazz': 'UTA', 'Washington Wizards': 'WAS',
};

function teamNameToTricode(name) {
  return TEAM_NAMES[name] || name.split(' ').pop().substring(0, 3).toUpperCase();
}

// Convert American moneyline odds to implied probability
function mlToProb(ml) {
  if (ml < 0) return Math.abs(ml) / (Math.abs(ml) + 100);
  return 100 / (ml + 100);
}

// Convert decimal odds to implied probability
function decimalToProb(dec) {
  return 1 / dec;
}

// Consensus probability from multiple bookmakers (vig-removed)
function consensusProb(bookmakers, teamName) {
  const probs = [];
  for (const bk of bookmakers) {
    const h2h = bk.markets?.find(m => m.key === 'h2h');
    if (!h2h) continue;
    const outcome = h2h.outcomes?.find(o => o.name === teamName);
    const opponent = h2h.outcomes?.find(o => o.name !== teamName);
    if (!outcome || !opponent) continue;
    const raw = decimalToProb(outcome.price);
    const oppRaw = decimalToProb(opponent.price);
    const total = raw + oppRaw;
    probs.push(raw / total); // vig-removed
  }
  if (probs.length === 0) return null;
  return probs.reduce((a, b) => a + b, 0) / probs.length;
}

// Polymarket slug tricodes (lowercase)
const PM_TRICODES = {
  'Atlanta Hawks': 'atl', 'Boston Celtics': 'bos', 'Brooklyn Nets': 'bkn',
  'Charlotte Hornets': 'cha', 'Chicago Bulls': 'chi', 'Cleveland Cavaliers': 'cle',
  'Dallas Mavericks': 'dal', 'Denver Nuggets': 'den', 'Detroit Pistons': 'det',
  'Golden State Warriors': 'gsw', 'Houston Rockets': 'hou', 'Indiana Pacers': 'ind',
  'Los Angeles Clippers': 'lac', 'Los Angeles Lakers': 'lal', 'Memphis Grizzlies': 'mem',
  'Miami Heat': 'mia', 'Milwaukee Bucks': 'mil', 'Minnesota Timberwolves': 'min',
  'New Orleans Pelicans': 'nop', 'New York Knicks': 'nyk', 'Oklahoma City Thunder': 'okc',
  'Orlando Magic': 'orl', 'Philadelphia 76ers': 'phi', 'Phoenix Suns': 'phx',
  'Portland Trail Blazers': 'por', 'Sacramento Kings': 'sac', 'San Antonio Spurs': 'sas',
  'Toronto Raptors': 'tor', 'Utah Jazz': 'uta', 'Washington Wizards': 'was',
};

// Fetch Polymarket NBA game markets for a specific date
// Slug pattern: nba-{away}-{home}-{YYYY-MM-DD} for game winner
//               nba-{away}-{home}-{YYYY-MM-DD}-spread-... for spreads
//               nba-{away}-{home}-{YYYY-MM-DD}-total-... for totals
async function fetchPolymarketNBA(dateStr) {
  try {
    // Fetch high-volume active markets and filter by NBA game slug pattern
    const data = await httpGet(
      `${POLYMARKET_GAMMA_API}/markets?active=true&closed=false&limit=200&order=volume24hr&ascending=false`
    );
    if (!Array.isArray(data)) return [];
    return data.filter(m => {
      const slug = m.slug || '';
      return slug.startsWith('nba-') && slug.includes(dateStr);
    });
  } catch (e) {
    console.error('[Markets] Polymarket fetch failed:', e.message);
    return [];
  }
}

// Find Polymarket game-winner market for a matchup
function findPmGameWinner(pmMarkets, awayTricode, homeTricode, dateStr) {
  const awayLc = awayTricode.toLowerCase();
  const homeLc = homeTricode.toLowerCase();
  // Game winner slug: nba-{away}-{home}-{date} (no -spread- or -total-)
  return pmMarkets.find(m => {
    const slug = m.slug || '';
    return slug === `nba-${awayLc}-${homeLc}-${dateStr}` ||
           slug === `nba-${homeLc}-${awayLc}-${dateStr}`; // check both orderings
  }) || null;
}

// Find Polymarket total market for a matchup
function findPmTotal(pmMarkets, awayTricode, homeTricode, dateStr) {
  const awayLc = awayTricode.toLowerCase();
  const homeLc = homeTricode.toLowerCase();
  return pmMarkets.filter(m => {
    const slug = m.slug || '';
    return (slug.startsWith(`nba-${awayLc}-${homeLc}-${dateStr}-total`) ||
            slug.startsWith(`nba-${homeLc}-${awayLc}-${dateStr}-total`));
  });
}

// Find Polymarket spread markets for a matchup
function findPmSpread(pmMarkets, awayTricode, homeTricode, dateStr) {
  const awayLc = awayTricode.toLowerCase();
  const homeLc = homeTricode.toLowerCase();
  return pmMarkets.filter(m => {
    const slug = m.slug || '';
    return (slug.startsWith(`nba-${awayLc}-${homeLc}-${dateStr}-spread`) ||
            slug.startsWith(`nba-${homeLc}-${awayLc}-${dateStr}-spread`));
  });
}

async function getMarketsToday() {
  // Check cache
  if (marketsCache && Date.now() - marketsCache.timestamp < CACHE_TTL) {
    return marketsCache.data;
  }

  const today = new Date().toISOString().split('T')[0];
  const markets = [];

  // 1. Fetch Odds API events + odds
  let oddsEvents = [];
  if (ODDS_API_KEY) {
    try {
      oddsEvents = await httpGet(
        `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=decimal&dateFormat=iso`
      );
      if (!Array.isArray(oddsEvents)) oddsEvents = [];
      // Filter to today's games only
      oddsEvents = oddsEvents.filter(ev => {
        const gameDate = new Date(ev.commence_time).toISOString().split('T')[0];
        return gameDate === today;
      });
    } catch (e) {
      console.error('[Markets] Odds API failed:', e.message);
    }
  }

  // 2. Fetch Polymarket NBA game markets for today
  const pmMarkets = await fetchPolymarketNBA(today);
  console.log(`[Markets] Found ${pmMarkets.length} Polymarket NBA markets for ${today}`);

  // 3. Build markets from Odds API events + Polymarket prices
  for (const ev of oddsEvents) {
    const homeTricode = teamNameToTricode(ev.home_team);
    const awayTricode = teamNameToTricode(ev.away_team);
    const pmAway = PM_TRICODES[ev.away_team] || awayTricode.toLowerCase();
    const pmHome = PM_TRICODES[ev.home_team] || homeTricode.toLowerCase();
    const gameLabel = `${awayTricode} @ ${homeTricode}`;
    const homeProb = consensusProb(ev.bookmakers || [], ev.home_team);

    // ── Game Winner ──────────────────────────────────────
    const pmGW = findPmGameWinner(pmMarkets, pmAway, pmHome, today);
    // Polymarket game-winner: outcomes[0] = away YES price, outcomes[1] = away NO (= home YES)
    // Slug is nba-{away}-{home}-{date}, question is "{Away} vs. {Home}"
    // outcomePrices[0] = probability of first-listed team (away)
    let pmHomePrice = null;
    let pmUrl = '';
    if (pmGW) {
      const prices = JSON.parse(pmGW.outcomePrices || '[]');
      const slug = pmGW.slug || '';
      // If slug starts with nba-{away}-, then prices[0] = away, prices[1] = home
      // If slug starts with nba-{home}-, then prices[0] = home
      if (slug.startsWith(`nba-${pmAway}-`)) {
        pmHomePrice = parseFloat(prices[1]) || null; // second outcome = home
      } else {
        pmHomePrice = parseFloat(prices[0]) || null; // first outcome = home
      }
      pmUrl = `https://polymarket.com/event/${slug}`;
    }

    if (homeProb !== null) {
      const marketPrice = pmHomePrice || homeProb; // use edge prob as market price when no PM
      const edgeValue = homeProb - marketPrice;
      const confidence = homeProb >= 0.65 ? 'HIGH' : homeProb >= 0.50 ? 'MED' : 'COND';
      let recommendation;
      if (confidence === 'COND') recommendation = 'HOLD';
      else if (edgeValue > 0.05) recommendation = 'BUY_YES';
      else if (edgeValue < -0.05) recommendation = 'BUY_NO';
      else recommendation = 'NO_EDGE';

      const reasoning = [];
      if (homeProb >= 0.65) reasoning.push(`${ev.home_team} are strong favorites at ${Math.round(homeProb * 100)}% consensus`);
      if (edgeValue > 0.03) reasoning.push(`Market underpricing by ${Math.round(edgeValue * 100)}pp`);
      if (edgeValue < -0.03) reasoning.push(`Market overpricing by ${Math.round(Math.abs(edgeValue) * 100)}pp`);
      if (pmGW) reasoning.push(`Polymarket: ${pmUrl}`);
      else reasoning.push('No Polymarket game-winner market found');

      markets.push({
        id: `mkt-${ev.id || `${homeTricode}${awayTricode}${today}`}`,
        platform: pmGW ? 'polymarket' : 'sportsbook',
        url: pmUrl,
        title: `${ev.home_team} to beat ${ev.away_team}`,
        category: 'game_winner',
        edge_probability: Math.round(homeProb * 100) / 100,
        market_price: Math.round(marketPrice * 100) / 100,
        edge_value: Math.round(edgeValue * 100) / 100,
        recommendation,
        confidence,
        reasoning,
        game: gameLabel,
        expires_at: ev.commence_time,
      });
    }

    // ── Totals ───────────────────────────────────────────
    const totalsBookmaker = (ev.bookmakers || []).find(bk => bk.markets?.some(m => m.key === 'totals'));
    const pmTotals = findPmTotal(pmMarkets, pmAway, pmHome, today);
    if (totalsBookmaker) {
      const totalsMarket = totalsBookmaker.markets.find(m => m.key === 'totals');
      const overOutcome = totalsMarket?.outcomes?.find(o => o.name === 'Over');
      if (overOutcome) {
        const totalLine = overOutcome.point;
        const overProb = decimalToProb(overOutcome.price);
        // Find matching PM total by line
        const pmTotal = pmTotals.find(m => (m.slug || '').includes(String(totalLine).replace('.', 'pt')));
        let pmTotalPrice = null;
        let pmTotalUrl = '';
        if (pmTotal) {
          const prices = JSON.parse(pmTotal.outcomePrices || '[]');
          pmTotalPrice = parseFloat(prices[0]) || null; // Over is first outcome
          pmTotalUrl = `https://polymarket.com/event/${pmTotal.slug}`;
        }
        const mktPrice = pmTotalPrice || overProb;
        const totalEdge = overProb - mktPrice;

        markets.push({
          id: `mkt-total-${ev.id || `${homeTricode}${awayTricode}${today}`}`,
          platform: pmTotal ? 'polymarket' : 'sportsbook',
          url: pmTotalUrl,
          title: `${gameLabel} Over ${totalLine}`,
          category: 'total',
          edge_probability: Math.round(overProb * 100) / 100,
          market_price: Math.round(mktPrice * 100) / 100,
          edge_value: Math.round(totalEdge * 100) / 100,
          recommendation: Math.abs(totalEdge) > 0.05 ? (totalEdge > 0 ? 'BUY_YES' : 'BUY_NO') : 'NO_EDGE',
          confidence: overProb >= 0.55 ? 'MED' : 'COND',
          reasoning: [`Total line: ${totalLine}`, `Over implied at ${Math.round(overProb * 100)}%`, pmTotal ? `PM: ${pmTotalUrl}` : 'Sportsbook only'].filter(Boolean),
          game: gameLabel,
          expires_at: ev.commence_time,
        });
      }
    }

    // ── Spreads ──────────────────────────────────────────
    const spreadsBookmaker = (ev.bookmakers || []).find(bk => bk.markets?.some(m => m.key === 'spreads'));
    const pmSpreads = findPmSpread(pmMarkets, pmAway, pmHome, today);
    if (spreadsBookmaker) {
      const spreadsMarket = spreadsBookmaker.markets.find(m => m.key === 'spreads');
      const homeSpread = spreadsMarket?.outcomes?.find(o => o.name === ev.home_team);
      if (homeSpread && homeSpread.point) {
        const spreadProb = decimalToProb(homeSpread.price);
        // Find matching PM spread
        const spreadStr = String(Math.abs(homeSpread.point)).replace('.', 'pt');
        const pmSpread = pmSpreads.find(m => (m.slug || '').includes(spreadStr));
        let pmSpreadPrice = null;
        let pmSpreadUrl = '';
        if (pmSpread) {
          const prices = JSON.parse(pmSpread.outcomePrices || '[]');
          pmSpreadPrice = parseFloat(prices[0]) || null;
          pmSpreadUrl = `https://polymarket.com/event/${pmSpread.slug}`;
        }
        const mktPrice = pmSpreadPrice || spreadProb;
        const spreadEdge = spreadProb - mktPrice;

        markets.push({
          id: `mkt-spread-${ev.id || `${homeTricode}${awayTricode}${today}`}`,
          platform: pmSpread ? 'polymarket' : 'sportsbook',
          url: pmSpreadUrl,
          title: `${ev.home_team} ${homeSpread.point > 0 ? '+' : ''}${homeSpread.point}`,
          category: 'special',
          edge_probability: Math.round(spreadProb * 100) / 100,
          market_price: Math.round(mktPrice * 100) / 100,
          edge_value: Math.round(spreadEdge * 100) / 100,
          recommendation: Math.abs(spreadEdge) > 0.05 ? (spreadEdge > 0 ? 'BUY_YES' : 'BUY_NO') : 'NO_EDGE',
          confidence: 'MED',
          reasoning: [`${ev.home_team} spread: ${homeSpread.point > 0 ? '+' : ''}${homeSpread.point}`, pmSpread ? `PM: ${pmSpreadUrl}` : 'Sportsbook only'],
          game: gameLabel,
          expires_at: ev.commence_time,
        });
      }
    }
  }

  // Sort: highest absolute edge first
  markets.sort((a, b) => Math.abs(b.edge_value) - Math.abs(a.edge_value));

  const result = { markets, date: today, source: 'edge' };
  marketsCache = { data: result, timestamp: Date.now() };
  return result;
}

// GET /markets/today
async function handleMarketsToday(req, res) {
  try {
    const data = await getMarketsToday();
    json(res, 200, data);
  } catch (e) {
    console.error('[Markets] Error:', e.message);
    json(res, 500, { error: e.message, markets: [], date: new Date().toISOString().split('T')[0], source: 'edge' });
  }
}

// ── Articles Today — PrizePicks-style game previews ─────

const TEAM_STARS = {
  ATL: 'Trae Young', BOS: 'Jayson Tatum', BKN: 'Cam Thomas', CHA: 'LaMelo Ball',
  CHI: 'Zach LaVine', CLE: 'Donovan Mitchell', DAL: 'Luka Doncic', DEN: 'Nikola Jokic',
  DET: 'Cade Cunningham', GSW: 'Stephen Curry', HOU: 'Jalen Green', IND: 'Tyrese Haliburton',
  LAC: 'James Harden', LAL: 'LeBron James', MEM: 'Ja Morant', MIA: 'Jimmy Butler',
  MIL: 'Giannis Antetokounmpo', MIN: 'Anthony Edwards', NOP: 'Zion Williamson',
  NYK: 'Jalen Brunson', OKC: 'Shai Gilgeous-Alexander', ORL: 'Paolo Banchero',
  PHI: 'Joel Embiid', PHX: 'Kevin Durant', POR: 'Anfernee Simons', SAC: "De'Aaron Fox",
  SAS: 'Victor Wembanyama', TOR: 'Scottie Barnes', UTA: 'Lauri Markkanen', WAS: 'Jordan Poole',
};

let articlesCache = null;
const ARTICLES_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function generateArticles() {
  // Check cache
  if (articlesCache && Date.now() - articlesCache.timestamp < ARTICLES_CACHE_TTL) {
    return articlesCache.data;
  }

  const marketsData = await getMarketsToday();
  const markets = marketsData.markets || [];

  // Deduplicate by game label
  const seenGames = new Set();
  const gameMarkets = [];
  for (const m of markets) {
    if (!m.game || seenGames.has(m.game)) continue;
    seenGames.add(m.game);
    // Gather all markets for this game
    const related = markets.filter(r => r.game === m.game);
    gameMarkets.push({ game: m.game, markets: related });
  }

  const articles = [];

  for (const { game, markets: gameMkts } of gameMarkets) {
    // Parse game label "CHI @ NYK" → away, home
    const parts = game.split(' @ ');
    if (parts.length !== 2) continue;
    const [awayTri, homeTri] = parts;

    // Find the game_winner market for edge data
    const gwMarket = gameMkts.find(m => m.category === 'game_winner');
    const edgeProb = gwMarket ? gwMarket.edge_probability : 0.5;
    const edgeValue = gwMarket ? gwMarket.edge_value : 0;
    const homeProb = edgeProb;
    const awayProb = 1 - edgeProb;

    // Determine favored team
    const favoredTri = homeProb >= awayProb ? homeTri : awayTri;
    const favoredProb = Math.max(homeProb, awayProb);
    const favoredPct = Math.round(favoredProb * 100);
    const underdogTri = favoredTri === homeTri ? awayTri : homeTri;
    const playerFocus = TEAM_STARS[favoredTri] || TEAM_STARS[homeTri] || null;

    let category, title, excerpt;

    if (favoredProb >= 0.65) {
      // HIGH confidence — Edge Pick
      category = 'EDGE PICK';
      title = `${favoredTri} Primed to Dominate ${underdogTri} Tonight`;
      excerpt = `Edge models give ${favoredTri} a commanding ${favoredPct}% win probability. ${playerFocus || favoredTri} should set the tone early in what projects as a lopsided affair. The market hasn't fully adjusted to the mismatch.`;
    } else if (Math.abs(edgeValue) > 0.03) {
      // Significant edge_value — Matchup / mispricing
      const direction = edgeValue > 0 ? 'underpriced' : 'overpriced';
      const edgePP = Math.round(Math.abs(edgeValue) * 100);
      category = 'MATCHUP';
      title = `Market Mispricing: ${favoredTri} vs ${underdogTri} Edge Alert`;
      excerpt = `Our models flag ${favoredTri} as ${direction} by ${edgePP} percentage points against ${underdogTri}. ${playerFocus ? playerFocus + ' leads a squad' : favoredTri + ' fields a roster'} the market is sleeping on tonight.`;
    } else if (favoredProb >= 0.45 && favoredProb <= 0.55) {
      // Close game
      category = 'GAME PREVIEW';
      title = `Coin Flip: ${awayTri} at ${homeTri} Should Be a Thriller`;
      excerpt = `Edge models have this as a near-toss-up at ${favoredPct}-${100 - favoredPct}. Both teams are evenly matched, making this one of the most competitive games on tonight's slate. Watch for ${playerFocus || homeTri} to be the difference-maker.`;
    } else {
      // Default — Player Watch
      category = 'PLAYER WATCH';
      title = `${playerFocus || favoredTri} Spotlight: ${awayTri} at ${homeTri}`;
      excerpt = `${playerFocus || favoredTri} takes center stage as ${awayTri} visits ${homeTri}. Edge models lean ${favoredTri} at ${favoredPct}% — look for a big performance to tilt the outcome.`;
    }

    articles.push({
      id: `edge-article-${awayTri}-${homeTri}-${marketsData.date}`,
      category,
      title,
      excerpt,
      readTime: '3 min',
      game,
      playerFocus,
    });
  }

  const result = { articles, date: marketsData.date, source: 'edge' };
  articlesCache = { data: result, timestamp: Date.now() };
  return result;
}

// GET /articles/today
async function handleArticlesToday(req, res) {
  try {
    const data = await generateArticles();
    json(res, 200, data);
  } catch (e) {
    console.error('[Articles] Error:', e.message);
    json(res, 500, { error: e.message, articles: [], date: new Date().toISOString().split('T')[0], source: 'edge' });
  }
}

// POST /analyze
// Body: { query, detail? }
async function handleAnalyze(req, res) {
  const body = await parseBody(req);
  const { query, detail } = body;

  if (!query) {
    return json(res, 400, {
      error: 'Required field: query',
      example: { query: 'Who wins MIA vs PHI tonight?', detail: 'full' },
    });
  }

  try {
    const result = await analyzeQuery(query, { detail: detail || 'full' });
    json(res, 200, result);
  } catch (e) {
    json(res, 500, { error: e.message });
  }
}

// ── Main router ──────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH', 'Access-Control-Allow-Headers': 'Content-Type,x-api-key,Authorization' });
    return res.end();
  }

  // Auth (skip for health)
  if (pathname !== '/health' && !authCheck(req, res)) return;

  // Rate limiting (skip for health)
  if (pathname !== '/health') {
    const clientKey = req.headers['x-api-key'] || req.socket.remoteAddress || 'unknown';
    const rateCheck = checkRateLimit(pathname, clientKey);
    if (rateCheck.limited) {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': String(rateCheck.retryAfter) });
      return res.end(JSON.stringify({ error: 'Rate limit exceeded', retry_after_seconds: rateCheck.retryAfter }));
    }
  }

  requestCount++;

  try {
    if (pathname === '/health' && req.method === 'GET') {
      const remaining = getRequestsRemaining();
      return json(res, 200, {
        status: 'ok',
        engine: 'Edge Protocol v2',
        uptime: Math.round(process.uptime()),
        started_at: startedAt,
        requests_served: requestCount,
        errors: errorCount,
        odds_api: {
          enabled: !!process.env.ODDS_API_KEY,
          requests_used_session: getRequestsUsed(),
          requests_remaining: remaining !== null ? remaining : 'unknown',
        },
      });
    }
    if (pathname === '/price' && req.method === 'POST') return await handlePrice(req, res);
    if (pathname === '/analyze' && req.method === 'POST') return await handleAnalyze(req, res);
    if (pathname === '/resolve' && req.method === 'PATCH') return await handleResolve(req, res);
    if (pathname === '/accuracy' && req.method === 'GET') return handleAccuracy(req, res);
    if (pathname.startsWith('/player/') && req.method === 'GET') return handlePlayer(req, res, pathname.split('/player/')[1]);
    if (pathname.startsWith('/defense/') && req.method === 'GET') return handleDefense(req, res, pathname.split('/defense/')[1]);
    if (pathname === '/injuries' && req.method === 'GET') return await handleInjuries(req, res);
    if (pathname === '/games/today' && req.method === 'GET') return await handleGames(req, res);
    if (pathname === '/markets/today' && req.method === 'GET') return await handleMarketsToday(req, res);
    if (pathname === '/articles/today' && req.method === 'GET') return await handleArticlesToday(req, res);

    json(res, 404, {
      error: 'Not found',
      endpoints: {
        'POST  /price': 'Price a bet',
        'POST  /analyze': 'Analyze a game (natural language)',
        'PATCH /resolve': 'Resolve prediction outcome',
        'GET   /accuracy': 'Accuracy & calibration report',
        'GET   /player/:name': 'Player stats',
        'GET   /defense/:team': 'Team defensive ratings',
        'GET   /injuries': 'Live injury report',
        'GET   /games/today': "Today's NBA schedule",
        'GET   /markets/today': "Today's markets with Edge intelligence",
        'GET   /articles/today': "Today's AI-generated game preview articles",
        'GET   /health': 'Health check',
      }
    });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`\n🎯 Edge Protocol API running on port ${PORT}`);
  console.log(`   Auth: x-api-key: ${API_KEY}`);
  console.log('\n   Endpoints:');
  console.log(`   POST  http://localhost:${PORT}/price`);
  console.log(`   PATCH http://localhost:${PORT}/resolve`);
  console.log(`   GET   http://localhost:${PORT}/accuracy`);
  console.log(`   GET   http://localhost:${PORT}/player/Jalen+Brunson`);
  console.log(`   GET   http://localhost:${PORT}/defense/BOS`);
  console.log(`   GET   http://localhost:${PORT}/injuries`);
  console.log(`   GET   http://localhost:${PORT}/games/today`);
  console.log(`   GET   http://localhost:${PORT}/markets/today`);
  console.log(`   GET   http://localhost:${PORT}/articles/today`);
  console.log(`   GET   http://localhost:${PORT}/health\n`);
});
