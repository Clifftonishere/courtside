/**
 * Edge Protocol — Accuracy Tracker
 *
 * Daily accuracy reports broken down by bet type and confidence tier.
 * Computes hit rate, calibration error, Brier score per group.
 *
 * Usage: node accuracy-tracker.js [--days 14] [--type prop] [--telegram]
 */

'use strict';

const logger = require('../logger');

// ── CLI arg parsing ─────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { days: 14, type: null, telegram: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--days' && argv[i + 1]) {
      args.days = parseInt(argv[i + 1], 10) || 14;
      i++;
    } else if (argv[i] === '--type' && argv[i + 1]) {
      args.type = argv[i + 1];
      i++;
    } else if (argv[i] === '--telegram') {
      args.telegram = true;
    }
  }
  return args;
}

// ── Report generation ───────────────────────────────────────────────────────

/**
 * Generate a detailed accuracy report grouped by bet type and confidence tier.
 * @param {object} opts
 * @param {number} opts.days - Lookback window (default 14)
 * @param {string|null} opts.type - Filter to a specific bet type (optional)
 * @returns {object} Structured accuracy report
 */
function generateReport(opts = {}) {
  const days = opts.days || 14;
  const typeFilter = opts.type || null;

  const predictions = logger.loadRecent(days);
  const resolved = predictions.filter(p => p.outcome !== null);

  if (resolved.length === 0) {
    return {
      period_days: days,
      generated_at: new Date().toISOString(),
      total_predictions: predictions.length,
      resolved: 0,
      unresolved: predictions.length,
      by_type: {},
      by_tier: {},
      overall: null,
      message: 'No resolved predictions in this period.',
    };
  }

  // Optional type filter
  const filtered = typeFilter
    ? resolved.filter(p => (p.request?.stat || 'unknown') === typeFilter)
    : resolved;

  if (filtered.length === 0) {
    return {
      period_days: days,
      generated_at: new Date().toISOString(),
      total_predictions: predictions.length,
      resolved: resolved.length,
      filtered: 0,
      by_type: {},
      by_tier: {},
      overall: null,
      message: `No resolved predictions for type "${typeFilter}" in this period.`,
    };
  }

  // ── Group by bet type ───────────────────────────────────────────────────
  const byType = {};
  for (const p of filtered) {
    const type = p.request?.stat || 'unknown';
    if (!byType[type]) byType[type] = [];
    byType[type].push(p);
  }

  const typeReport = {};
  for (const [type, preds] of Object.entries(byType)) {
    typeReport[type] = computeGroupMetrics(preds);
  }

  // ── Group by confidence tier ──────────────────────────────────────────
  const byTier = {};
  for (const p of filtered) {
    const tier = p.response?.confidence_tier || 'unknown';
    if (!byTier[tier]) byTier[tier] = [];
    byTier[tier].push(p);
  }

  const tierReport = {};
  for (const [tier, preds] of Object.entries(byTier)) {
    tierReport[tier] = computeGroupMetrics(preds);
  }

  // ── Overall metrics ───────────────────────────────────────────────────
  const overall = computeGroupMetrics(filtered);

  return {
    period_days: days,
    generated_at: new Date().toISOString(),
    total_predictions: predictions.length,
    resolved: resolved.length,
    filtered: filtered.length,
    type_filter: typeFilter,
    overall,
    by_type: typeReport,
    by_tier: tierReport,
  };
}

/**
 * Compute accuracy metrics for a group of resolved predictions.
 * @param {object[]} preds - Array of resolved prediction entries
 * @returns {object} Group metrics
 */
function computeGroupMetrics(preds) {
  const total = preds.length;
  const wins = preds.filter(p => p.outcome === true).length;
  const hitRate = wins / total;

  // Average predicted probability
  let probSum = 0;
  let brierSum = 0;
  for (const p of preds) {
    const prob = p.response?.probability ?? 0.5;
    probSum += prob;
    const outcome = p.outcome ? 1 : 0;
    brierSum += (prob - outcome) ** 2;
  }
  const expectedHitRate = probSum / total;
  const brierScore = brierSum / total;
  const calibrationError = hitRate - expectedHitRate;

  return {
    sample_size: total,
    wins,
    losses: total - wins,
    hit_rate: round(hitRate, 4),
    expected_hit_rate: round(expectedHitRate, 4),
    calibration_error: round(calibrationError, 4),
    brier_score: round(brierScore, 4),
  };
}

function round(val, decimals) {
  return Math.round(val * 10 ** decimals) / 10 ** decimals;
}

// ── Telegram formatting ─────────────────────────────────────────────────────

/**
 * Format a report as a Telegram-friendly plain text summary.
 * @param {object} report - Output of generateReport()
 * @returns {string} Telegram message
 */
function formatTelegramSummary(report) {
  if (!report.overall) {
    return `Accuracy Report (${report.period_days}d)\n${report.message}`;
  }

  const lines = [];
  lines.push(`Accuracy Report (${report.period_days}d)`);
  lines.push(`Generated: ${report.generated_at}`);
  lines.push('');

  // Overall
  const o = report.overall;
  lines.push(`OVERALL (n=${o.sample_size})`);
  lines.push(`  Hit rate: ${(o.hit_rate * 100).toFixed(1)}%`);
  lines.push(`  Expected: ${(o.expected_hit_rate * 100).toFixed(1)}%`);
  lines.push(`  Cal error: ${(o.calibration_error * 100).toFixed(1)}pp`);
  lines.push(`  Brier: ${o.brier_score.toFixed(4)}`);
  lines.push('');

  // By type
  if (Object.keys(report.by_type).length > 0) {
    lines.push('BY TYPE:');
    for (const [type, m] of Object.entries(report.by_type)) {
      const arrow = m.calibration_error > 0.03 ? ' [underpriced]'
        : m.calibration_error < -0.03 ? ' [overpriced]' : '';
      lines.push(`  ${type}: ${(m.hit_rate * 100).toFixed(1)}% (n=${m.sample_size})${arrow}`);
    }
    lines.push('');
  }

  // By tier
  if (Object.keys(report.by_tier).length > 0) {
    lines.push('BY CONFIDENCE:');
    for (const [tier, m] of Object.entries(report.by_tier)) {
      lines.push(`  ${tier}: ${(m.hit_rate * 100).toFixed(1)}% hit, Brier ${m.brier_score.toFixed(4)} (n=${m.sample_size})`);
    }
  }

  return lines.join('\n');
}

// ── CLI execution ───────────────────────────────────────────────────────────

if (require.main === module) {
  const args = parseArgs(process.argv);
  const report = generateReport({ days: args.days, type: args.type });

  if (args.telegram) {
    console.log(formatTelegramSummary(report));
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

module.exports = { generateReport, formatTelegramSummary };
