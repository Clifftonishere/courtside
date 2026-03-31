/**
 * Edge Protocol — Vig Optimizer
 *
 * Auto-adjust vig per bet type based on trailing accuracy.
 * Tightens vig when users win too much, widens when we overprice.
 *
 * Usage: node vig-optimizer.js [--days 14] [--apply] [--dry-run]
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { generateReport } = require('./accuracy-tracker');

const OVERRIDES_FILE = path.join(__dirname, '..', 'data', 'vig-overrides.json');

// ── Safety bounds ───────────────────────────────────────────────────────────

const MAX_ADJUSTMENT_PP = 0.02;   // max +/-2pp per cycle
const VIG_FLOOR         = 0.02;   // 2% minimum vig
const VIG_CEILING       = 0.18;   // 18% maximum vig
const THRESHOLD_PP      = 0.03;   // only adjust if error > 3pp
const DAMPING           = 0.5;    // damping factor to prevent oscillation

// ── CLI arg parsing ─────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { days: 14, apply: false, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--days' && argv[i + 1]) {
      args.days = parseInt(argv[i + 1], 10) || 14;
      i++;
    } else if (argv[i] === '--apply') {
      args.apply = true;
    } else if (argv[i] === '--dry-run') {
      args.dryRun = true;
    }
  }
  return args;
}

// ── Load existing overrides ─────────────────────────────────────────────────

/**
 * Load current vig overrides from disk.
 * @returns {object} Map of bet_type -> { vig, updated_at, reason }
 */
function loadOverrides() {
  if (!fs.existsSync(OVERRIDES_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Save vig overrides to disk.
 * @param {object} overrides
 */
function saveOverrides(overrides) {
  const dir = path.dirname(OVERRIDES_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2) + '\n');
}

// ── Optimization logic ─────────────────────────────────────────────────────

/**
 * Compute vig adjustment recommendations based on trailing accuracy.
 * @param {object} opts
 * @param {number} opts.days - Lookback window (default 14)
 * @returns {object} { recommendations, summary }
 */
function optimizeVig(opts = {}) {
  const days = opts.days || 14;
  const report = generateReport({ days });

  if (!report.overall) {
    return {
      days,
      generated_at: new Date().toISOString(),
      recommendations: [],
      message: report.message || 'No data available for optimization.',
    };
  }

  const overrides = loadOverrides();
  const recommendations = [];

  for (const [type, metrics] of Object.entries(report.by_type)) {
    const { hit_rate, expected_hit_rate, calibration_error, sample_size } = metrics;

    // Skip small samples — not enough data to be confident
    if (sample_size < 5) {
      recommendations.push({
        type,
        current_vig_avg: overrides[type]?.vig ?? null,
        recommended_adjustment: 0,
        new_vig: overrides[type]?.vig ?? null,
        reason: `Insufficient sample (n=${sample_size}, need 5+). No adjustment.`,
        skipped: true,
      });
      continue;
    }

    const error = calibration_error; // hit_rate - expected_hit_rate

    if (Math.abs(error) <= THRESHOLD_PP) {
      recommendations.push({
        type,
        current_vig_avg: overrides[type]?.vig ?? null,
        recommended_adjustment: 0,
        new_vig: overrides[type]?.vig ?? null,
        reason: `Calibration error (${(error * 100).toFixed(1)}pp) within threshold. No adjustment needed.`,
        skipped: false,
      });
      continue;
    }

    // Damped adjustment
    let adjustment = error * DAMPING;

    // Clamp to max adjustment per cycle
    adjustment = Math.max(-MAX_ADJUSTMENT_PP, Math.min(MAX_ADJUSTMENT_PP, adjustment));

    // Current vig (use override if set, otherwise assume a baseline of 5%)
    const currentVig = overrides[type]?.vig ?? 0.05;

    // Apply adjustment: positive error means we're underpricing (tighten = increase vig)
    let newVig = currentVig + adjustment;

    // Enforce floor/ceiling
    newVig = Math.max(VIG_FLOOR, Math.min(VIG_CEILING, newVig));

    const direction = error > 0 ? 'tighten' : 'widen';
    const reason = error > 0
      ? `Hit rate (${(hit_rate * 100).toFixed(1)}%) exceeds predicted (${(expected_hit_rate * 100).toFixed(1)}%) by ${(error * 100).toFixed(1)}pp. Tightening vig.`
      : `Hit rate (${(hit_rate * 100).toFixed(1)}%) below predicted (${(expected_hit_rate * 100).toFixed(1)}%) by ${(Math.abs(error) * 100).toFixed(1)}pp. Widening vig.`;

    recommendations.push({
      type,
      current_vig_avg: round(currentVig, 4),
      recommended_adjustment: round(adjustment, 4),
      new_vig: round(newVig, 4),
      direction,
      reason,
      skipped: false,
    });
  }

  return {
    days,
    generated_at: new Date().toISOString(),
    recommendations,
  };
}

/**
 * Apply vig recommendations to the overrides file.
 * @param {object[]} recommendations - From optimizeVig().recommendations
 * @returns {object} Updated overrides
 */
function applyRecommendations(recommendations) {
  const overrides = loadOverrides();
  const now = new Date().toISOString();

  for (const rec of recommendations) {
    if (rec.skipped || rec.recommended_adjustment === 0) continue;
    overrides[rec.type] = {
      vig: rec.new_vig,
      previous_vig: rec.current_vig_avg,
      adjustment: rec.recommended_adjustment,
      updated_at: now,
      reason: rec.reason,
    };
  }

  saveOverrides(overrides);
  return overrides;
}

function round(val, decimals) {
  return Math.round(val * 10 ** decimals) / 10 ** decimals;
}

// ── CLI execution ───────────────────────────────────────────────────────────

if (require.main === module) {
  const args = parseArgs(process.argv);
  const result = optimizeVig({ days: args.days });

  console.log(JSON.stringify(result, null, 2));

  if (result.recommendations.length === 0) {
    process.exit(0);
  }

  const actionable = result.recommendations.filter(r => !r.skipped && r.recommended_adjustment !== 0);

  if (actionable.length === 0) {
    console.log('\nNo adjustments recommended.');
    process.exit(0);
  }

  if (args.apply && !args.dryRun) {
    const updated = applyRecommendations(result.recommendations);
    console.log('\nApplied overrides:');
    console.log(JSON.stringify(updated, null, 2));
  } else if (args.dryRun) {
    console.log('\n[DRY RUN] Would apply the above adjustments. Use --apply to write.');
  } else {
    console.log('\nUse --apply to write adjustments to vig-overrides.json.');
  }
}

module.exports = { optimizeVig, loadOverrides };
