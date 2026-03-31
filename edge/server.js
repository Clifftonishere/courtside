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
  console.log(`   GET   http://localhost:${PORT}/health\n`);
});
