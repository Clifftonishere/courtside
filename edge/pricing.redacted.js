/**
 * Edge Protocol — Confidence Scoring & Dynamic Vig Engine (Structure Only)
 *
 * Assigns a confidence score (0-100) to each prediction based on 5 factors,
 * maps it to a tier, and selects the appropriate vig (house edge).
 *
 * Confidence Factors:
 *   1. Data depth     — How many game logs support this prediction (0-30 pts)
 *   2. Variance       — Coefficient of variation of the stat (0-20 pts)
 *   3. Market comp    — Does a sportsbook line exist for comparison? (0-20 pts)
 *   4. Threshold      — How far is the line from the player's mean? (0-15 pts)
 *   5. Recency        — How many games in the last 30 days? (5-15 pts)
 *
 * Tiers: very_high (90-100), high (70-89), medium (50-69), low (30-49), very_low (0-29)
 * Each tier has a vig range — higher confidence = lower vig (tighter odds).
 *
 * Full vig values and tier boundaries are proprietary.
 */

const POOL_SIZE = process.env.EDGE_POOL_SIZE ? Number(process.env.EDGE_POOL_SIZE) : 1000000;

const TIERS = {
  very_high: { min: 90, max: 100, vigMin: '[REDACTED]', vigMax: '[REDACTED]', poolFraction: '[REDACTED]' },
  high:      { min: 70, max: 89,  vigMin: '[REDACTED]', vigMax: '[REDACTED]', poolFraction: '[REDACTED]' },
  medium:    { min: 50, max: 69,  vigMin: '[REDACTED]', vigMax: '[REDACTED]', poolFraction: '[REDACTED]' },
  low:       { min: 30, max: 49,  vigMin: '[REDACTED]', vigMax: '[REDACTED]', poolFraction: '[REDACTED]' },
  very_low:  { min: 0,  max: 29,  vigMin: '[REDACTED]', vigMax: '[REDACTED]', poolFraction: '[REDACTED]' },
};

function calcConfidence({ sampleSize, mean, stdDev, threshold, recentGames30d, hasDirectComp, hasPartialComp, stat }) {
  const breakdown = {};
  
  // Factor 1: Data depth (more game logs = higher confidence)
  breakdown.data_depth = sampleSize >= 60 ? 30 : sampleSize >= 30 ? 20 : sampleSize >= 10 ? 10 : 0;
  
  // Factor 2: Variance (low CV = more predictable player)
  const cv = (mean && mean > 0) ? stdDev / mean : 1;
  breakdown.variance = cv < 0.25 ? 20 : cv <= 0.40 ? 10 : 0;
  
  // Factor 3: Market comp (sportsbook line exists for calibration)
  breakdown.market_comp = hasDirectComp ? 20 : hasPartialComp ? 10 : 0;
  
  // Factor 4: Threshold proximity (closer to mean = more confident)
  const deviation = Math.abs(threshold - mean);
  breakdown.threshold = deviation <= stdDev ? 15 : deviation <= 2 * stdDev ? 10 : 0;
  
  // Factor 5: Recency (recent games in last 30 days)
  breakdown.recency = (recentGames30d >= 10) ? 15 : (recentGames30d >= 5) ? 10 : 5;

  let score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  
  // Caps and adjustments
  // [Specific cap logic redacted]
  
  score = Math.max(0, Math.min(100, score));
  const tier = getTier(score);
  const vig = getVig(score, tier);
  return { score, tier, vig, breakdown };
}

// Additional functions: calcMaxBet(), computeOdds(), getTier()
// [Implementations redacted]

module.exports = { calcConfidence, calcMaxBet: '[REDACTED]', computeOdds: '[REDACTED]' };
