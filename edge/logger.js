/**
 * Edge Protocol — Prediction Logger
 *
 * Logs every prediction to disk, resolves outcomes, and generates
 * accuracy reports. All data stored as JSONL for append-friendly writes.
 *
 * Storage: edge/data/predictions.jsonl
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const LOG_FILE = path.join(DATA_DIR, 'predictions.jsonl');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── In-memory index (loaded on startup) ─────────────────────────────────────
let predictions = null; // lazy-load

function ensureLoaded() {
  if (predictions !== null) return;
  predictions = new Map();
  if (!fs.existsSync(LOG_FILE)) return;

  const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      predictions.set(entry.id, entry);
    } catch { /* skip malformed lines */ }
  }
}

// ── Log a new prediction ────────────────────────────────────────────────────

/**
 * Log a prediction request + response pair.
 * @param {object} request - { player, stat, condition, threshold, opponent, ... }
 * @param {object} response - { probability, decimal_odds, confidence_tier, confidence_score }
 * @returns {string} prediction ID
 */
function logPrediction(request, response) {
  ensureLoaded();

  const id = `pred_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const entry = {
    id,
    timestamp: new Date().toISOString(),
    request,
    response,
    outcome: null,        // true (hit) | false (miss) | null (unresolved)
    actual_value: null,
    resolved_at: null,
  };

  predictions.set(id, entry);

  // Append to disk
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');

  return id;
}

// ── Resolve a prediction ────────────────────────────────────────────────────

/**
 * Mark a prediction as won or lost.
 * @param {string} id - Prediction ID
 * @param {boolean} outcome - true = hit, false = miss
 * @param {*} actual_value - The actual stat value (for auditing)
 * @returns {object|null} Updated entry, or null if not found
 */
function resolvePrediction(id, outcome, actual_value) {
  ensureLoaded();

  const entry = predictions.get(id);
  if (!entry) return null;

  entry.outcome = !!outcome;
  entry.actual_value = actual_value ?? null;
  entry.resolved_at = new Date().toISOString();

  predictions.set(id, entry);

  // Rewrite the full log (simple approach — works fine for <100K entries)
  flushToDisk();

  return entry;
}

// ── Load all predictions ────────────────────────────────────────────────────

/**
 * Returns all logged predictions as an array.
 */
function loadAll() {
  ensureLoaded();
  return [...predictions.values()];
}

/**
 * Load predictions within a date range.
 * @param {number} days - Number of days to look back
 * @returns {object[]}
 */
function loadRecent(days = 30) {
  ensureLoaded();
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  return [...predictions.values()].filter(p => p.timestamp >= cutoff);
}

// ── Accuracy report ─────────────────────────────────────────────────────────

/**
 * Generate an accuracy report for the last N days.
 * @param {number} days
 * @returns {object} Structured accuracy report
 */
function getAccuracyReport(days = 30) {
  const recent = loadRecent(days);
  const resolved = recent.filter(p => p.outcome !== null);

  if (resolved.length === 0) {
    return {
      period_days: days,
      total_predictions: recent.length,
      resolved: 0,
      unresolved: recent.length,
      accuracy: null,
      message: 'No resolved predictions in this period',
    };
  }

  const wins = resolved.filter(p => p.outcome === true);
  const losses = resolved.filter(p => p.outcome === false);

  // By bet type
  const byType = {};
  for (const p of resolved) {
    const type = p.request?.stat || 'unknown';
    if (!byType[type]) byType[type] = { wins: 0, losses: 0, total: 0, prob_sum: 0 };
    byType[type].total++;
    byType[type].prob_sum += p.response?.probability || 0;
    if (p.outcome) byType[type].wins++;
    else byType[type].losses++;
  }

  // By confidence tier
  const byTier = {};
  for (const p of resolved) {
    const tier = p.response?.confidence_tier || 'unknown';
    if (!byTier[tier]) byTier[tier] = { wins: 0, losses: 0, total: 0 };
    byTier[tier].total++;
    if (p.outcome) byTier[tier].wins++;
    else byTier[tier].losses++;
  }

  // Calibration: compare predicted probability vs actual hit rate
  const buckets = [
    { label: '0-20%', min: 0, max: 0.2, hits: 0, total: 0, prob_sum: 0 },
    { label: '20-40%', min: 0.2, max: 0.4, hits: 0, total: 0, prob_sum: 0 },
    { label: '40-60%', min: 0.4, max: 0.6, hits: 0, total: 0, prob_sum: 0 },
    { label: '60-80%', min: 0.6, max: 0.8, hits: 0, total: 0, prob_sum: 0 },
    { label: '80-100%', min: 0.8, max: 1.01, hits: 0, total: 0, prob_sum: 0 },
  ];
  for (const p of resolved) {
    const prob = p.response?.probability || 0.5;
    const bucket = buckets.find(b => prob >= b.min && prob < b.max) || buckets[buckets.length - 1];
    bucket.total++;
    bucket.prob_sum += prob;
    if (p.outcome) bucket.hits++;
  }

  const calibration = buckets
    .filter(b => b.total > 0)
    .map(b => ({
      range: b.label,
      predicted: (b.prob_sum / b.total * 100).toFixed(1) + '%',
      actual: (b.hits / b.total * 100).toFixed(1) + '%',
      sample: b.total,
      error: ((b.hits / b.total) - (b.prob_sum / b.total)).toFixed(3),
    }));

  // Brier score (lower = better, 0 = perfect)
  let brierSum = 0;
  for (const p of resolved) {
    const prob = p.response?.probability || 0.5;
    const outcome = p.outcome ? 1 : 0;
    brierSum += (prob - outcome) ** 2;
  }
  const brierScore = (brierSum / resolved.length).toFixed(4);

  // Format by-type with hit rates
  const typeReport = {};
  for (const [type, stats] of Object.entries(byType)) {
    typeReport[type] = {
      record: `${stats.wins}-${stats.losses}`,
      accuracy: ((stats.wins / stats.total) * 100).toFixed(1) + '%',
      avg_predicted: ((stats.prob_sum / stats.total) * 100).toFixed(1) + '%',
      sample: stats.total,
    };
  }

  const tierReport = {};
  for (const [tier, stats] of Object.entries(byTier)) {
    tierReport[tier] = {
      record: `${stats.wins}-${stats.losses}`,
      accuracy: ((stats.wins / stats.total) * 100).toFixed(1) + '%',
      sample: stats.total,
    };
  }

  return {
    period_days: days,
    total_predictions: recent.length,
    resolved: resolved.length,
    unresolved: recent.length - resolved.length,
    overall: {
      record: `${wins.length}-${losses.length}`,
      accuracy: ((wins.length / resolved.length) * 100).toFixed(1) + '%',
      brier_score: brierScore,
    },
    by_type: typeReport,
    by_tier: tierReport,
    calibration,
  };
}

// ── Disk operations ─────────────────────────────────────────────────────────

function flushToDisk() {
  ensureLoaded();
  const lines = [...predictions.values()].map(p => JSON.stringify(p));
  fs.writeFileSync(LOG_FILE, lines.join('\n') + '\n');
}

module.exports = {
  logPrediction,
  resolvePrediction,
  getAccuracyReport,
  loadAll,
  loadRecent,
  flushToDisk,
};
