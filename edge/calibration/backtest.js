/**
 * Edge Protocol — Backtest Engine
 *
 * Run pricing model against historical outcomes to measure calibration,
 * hold rate, and P&L by bet type.
 *
 * Usage: node backtest.js [--days 30] [--type prop] [--verbose]
 */

'use strict';

const logger = require('../logger');

// ── CLI arg parsing ─────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { days: 30, type: null, verbose: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--days' && argv[i + 1]) {
      args.days = parseInt(argv[i + 1], 10) || 30;
      i++;
    } else if (argv[i] === '--type' && argv[i + 1]) {
      args.type = argv[i + 1];
      i++;
    } else if (argv[i] === '--verbose') {
      args.verbose = true;
    }
  }
  return args;
}

// ── Backtest logic ──────────────────────────────────────────────────────────

/**
 * Run a backtest over resolved predictions.
 * @param {object} opts
 * @param {number} opts.days - Lookback window (default 30)
 * @param {string|null} opts.type - Filter to specific bet type (optional)
 * @returns {object} Backtest results
 */
function runBacktest(opts = {}) {
  const days = opts.days || 30;
  const typeFilter = opts.type || null;

  const predictions = logger.loadRecent(days);
  let resolved = predictions.filter(p => p.outcome !== null);

  if (typeFilter) {
    resolved = resolved.filter(p => (p.request?.stat || 'unknown') === typeFilter);
  }

  if (resolved.length === 0) {
    return {
      period_days: days,
      generated_at: new Date().toISOString(),
      type_filter: typeFilter,
      total_resolved: 0,
      message: 'No resolved predictions found for backtest.',
      overall: null,
      by_type: {},
      by_tier: {},
      calibration_curve: [],
      per_bet: [],
    };
  }

  // ── Per-bet details ───────────────────────────────────────────────────
  const perBet = [];
  const ASSUMED_STAKE = 100; // normalize to $100 stakes for P&L

  for (const p of resolved) {
    const prob = p.response?.probability ?? 0.5;
    const odds = p.response?.decimal_odds ?? (1 / prob);
    const outcome = p.outcome ? 1 : 0;
    const correct = (prob >= 0.5 && p.outcome) || (prob < 0.5 && !p.outcome);

    // P&L: if won, profit = stake * (odds - 1); if lost, profit = -stake
    const profit = p.outcome ? ASSUMED_STAKE * (odds - 1) : -ASSUMED_STAKE;

    perBet.push({
      id: p.id,
      timestamp: p.timestamp,
      type: p.request?.stat || 'unknown',
      player: p.request?.player || null,
      tier: p.response?.confidence_tier || 'unknown',
      predicted_prob: round(prob, 4),
      decimal_odds: round(odds, 2),
      outcome: p.outcome,
      actual_value: p.actual_value,
      correct,
      profit: round(profit, 2),
    });
  }

  // ── Aggregate metrics ─────────────────────────────────────────────────
  const totalCorrect = perBet.filter(b => b.correct).length;
  const accuracy = totalCorrect / perBet.length;
  const totalProfit = perBet.reduce((s, b) => s + b.profit, 0);
  const totalVolume = perBet.length * ASSUMED_STAKE;

  // Simulated hold rate
  const winnerProfits = perBet.filter(b => b.outcome).reduce((s, b) => s + b.profit, 0);
  const loserStakes = perBet.filter(b => !b.outcome).length * ASSUMED_STAKE;
  const holdRate = totalVolume > 0 ? (loserStakes - winnerProfits) / totalVolume : 0;

  // Brier score
  let brierSum = 0;
  for (const p of resolved) {
    const prob = p.response?.probability ?? 0.5;
    brierSum += (prob - (p.outcome ? 1 : 0)) ** 2;
  }
  const brierScore = brierSum / resolved.length;

  // ── Calibration curve (10% buckets) ───────────────────────────────────
  const buckets = [];
  for (let i = 0; i < 10; i++) {
    buckets.push({
      range: `${i * 10}-${(i + 1) * 10}%`,
      min: i * 0.1,
      max: (i + 1) * 0.1,
      hits: 0,
      total: 0,
      prob_sum: 0,
    });
  }

  for (const p of resolved) {
    const prob = p.response?.probability ?? 0.5;
    const idx = Math.min(Math.floor(prob * 10), 9);
    buckets[idx].total++;
    buckets[idx].prob_sum += prob;
    if (p.outcome) buckets[idx].hits++;
  }

  const calibrationCurve = buckets
    .filter(b => b.total > 0)
    .map(b => ({
      range: b.range,
      predicted: round(b.prob_sum / b.total, 4),
      actual: round(b.hits / b.total, 4),
      error: round((b.hits / b.total) - (b.prob_sum / b.total), 4),
      sample: b.total,
    }));

  // ── By bet type ───────────────────────────────────────────────────────
  const byType = {};
  for (const b of perBet) {
    if (!byType[b.type]) byType[b.type] = [];
    byType[b.type].push(b);
  }

  const typeReport = {};
  for (const [type, bets] of Object.entries(byType)) {
    const correct = bets.filter(b => b.correct).length;
    const profit = bets.reduce((s, b) => s + b.profit, 0);
    const volume = bets.length * ASSUMED_STAKE;
    typeReport[type] = {
      sample: bets.length,
      accuracy: round(correct / bets.length, 4),
      total_profit: round(profit, 2),
      hold_rate: round(volume > 0 ? (bets.filter(b => !b.outcome).length * ASSUMED_STAKE - bets.filter(b => b.outcome).reduce((s, b2) => s + b2.profit, 0)) / volume : 0, 4),
      roi: round(profit / volume, 4),
    };
  }

  // ── By confidence tier ────────────────────────────────────────────────
  const byTier = {};
  for (const b of perBet) {
    if (!byTier[b.tier]) byTier[b.tier] = [];
    byTier[b.tier].push(b);
  }

  const tierReport = {};
  for (const [tier, bets] of Object.entries(byTier)) {
    const correct = bets.filter(b => b.correct).length;
    const profit = bets.reduce((s, b) => s + b.profit, 0);
    const volume = bets.length * ASSUMED_STAKE;
    tierReport[tier] = {
      sample: bets.length,
      accuracy: round(correct / bets.length, 4),
      total_profit: round(profit, 2),
      roi: round(profit / volume, 4),
    };
  }

  // ── Assemble result ───────────────────────────────────────────────────
  return {
    period_days: days,
    generated_at: new Date().toISOString(),
    type_filter: typeFilter,
    total_resolved: resolved.length,
    overall: {
      accuracy: round(accuracy, 4),
      brier_score: round(brierScore, 4),
      total_profit: round(totalProfit, 2),
      total_volume: round(totalVolume, 2),
      hold_rate: round(holdRate, 4),
      roi: round(totalProfit / totalVolume, 4),
    },
    by_type: typeReport,
    by_tier: tierReport,
    calibration_curve: calibrationCurve,
    per_bet: perBet,
  };
}

// ── Report formatting ───────────────────────────────────────────────────────

/**
 * Format a backtest result as a human-readable summary.
 * @param {object} result - Output of runBacktest()
 * @returns {string}
 */
function formatReport(result) {
  if (!result.overall) {
    return `Backtest (${result.period_days}d): ${result.message}`;
  }

  const lines = [];
  const o = result.overall;

  lines.push(`=== BACKTEST REPORT (${result.period_days}d) ===`);
  lines.push(`Generated: ${result.generated_at}`);
  if (result.type_filter) lines.push(`Filter: ${result.type_filter}`);
  lines.push(`Resolved bets: ${result.total_resolved}`);
  lines.push('');

  lines.push('OVERALL:');
  lines.push(`  Accuracy:  ${(o.accuracy * 100).toFixed(1)}%`);
  lines.push(`  Brier:     ${o.brier_score.toFixed(4)}`);
  lines.push(`  Hold rate: ${(o.hold_rate * 100).toFixed(2)}%`);
  lines.push(`  P&L:       $${o.total_profit.toFixed(2)} on $${o.total_volume.toFixed(2)} volume`);
  lines.push(`  ROI:       ${(o.roi * 100).toFixed(2)}%`);
  lines.push('');

  // By type
  if (Object.keys(result.by_type).length > 0) {
    lines.push('BY TYPE:');
    for (const [type, m] of Object.entries(result.by_type)) {
      lines.push(`  ${type}: ${(m.accuracy * 100).toFixed(1)}% acc, ${(m.hold_rate * 100).toFixed(2)}% hold, $${m.total_profit.toFixed(2)} P&L (n=${m.sample})`);
    }
    lines.push('');
  }

  // By tier
  if (Object.keys(result.by_tier).length > 0) {
    lines.push('BY CONFIDENCE TIER:');
    for (const [tier, m] of Object.entries(result.by_tier)) {
      lines.push(`  ${tier}: ${(m.accuracy * 100).toFixed(1)}% acc, ${(m.roi * 100).toFixed(2)}% ROI, $${m.total_profit.toFixed(2)} P&L (n=${m.sample})`);
    }
    lines.push('');
  }

  // Calibration curve
  if (result.calibration_curve.length > 0) {
    lines.push('CALIBRATION CURVE:');
    lines.push('  Range      | Predicted | Actual   | Error   | n');
    lines.push('  -----------|-----------|----------|---------|---');
    for (const b of result.calibration_curve) {
      const pred = (b.predicted * 100).toFixed(1).padStart(6) + '%';
      const act = (b.actual * 100).toFixed(1).padStart(6) + '%';
      const err = (b.error > 0 ? '+' : '') + (b.error * 100).toFixed(1).padStart(5) + 'pp';
      lines.push(`  ${b.range.padEnd(10)} | ${pred}  | ${act} | ${err} | ${b.sample}`);
    }
  }

  return lines.join('\n');
}

function round(val, decimals) {
  return Math.round(val * 10 ** decimals) / 10 ** decimals;
}

// ── CLI execution ───────────────────────────────────────────────────────────

if (require.main === module) {
  const args = parseArgs(process.argv);
  const result = runBacktest({ days: args.days, type: args.type });

  if (args.verbose) {
    // Full JSON with per-bet details
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Human-readable summary (strip per_bet for cleaner output)
    console.log(formatReport(result));
    console.log('\n(Use --verbose for full JSON with per-bet details)');
  }
}

module.exports = { runBacktest, formatReport };
