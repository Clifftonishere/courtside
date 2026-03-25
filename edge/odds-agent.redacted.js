/**
 * Edge Protocol — Odds Agent (Pipeline Overview)
 * 
 * The core pricing brain. Takes a bet description, runs it through an 8-step
 * pipeline, and returns a fully priced prediction with odds and confidence.
 *
 * PIPELINE STEPS:
 *   1. calcProbability()       — Statistical baseline from 77K+ game logs
 *   2. buildContext()          — Enriched context (defense, injuries, B2B, form)
 *   3. Claude AI adjustment    — Contextual probability refinement (clamped ±5pp)
 *   4. getMarketComp()         — Fetch comparable sportsbook line from Odds API
 *   5. calibrateProbability()  — Blend model estimate with market when >5pp divergence
 *   6. antiArbitrage()         — Cap odds to prevent arb vs sportsbooks (>15% gap)
 *   7. calcConfidence()        — 5-factor composite score → tier → vig selection
 *   8. computeOdds()           — Apply vig, convert to decimal/american odds
 *
 * Supported stats:
 *   points, rebounds, assists, fg3_made, steals, blocks,
 *   double_double, game_win, total_points, quarter_leader, novelty_*
 *
 * Full implementation is proprietary. Contact for details.
 */

const { calcProbability } = require('./calc');
const { buildContext, formatContextForPrompt } = require('./context');
const { calcConfidence, calcMaxBet, computeOdds } = require('./pricing');
const { getMarketComp, calibrateProbability, antiArbitrage } = require('./market');

/**
 * Price a single bet through the full 8-step pipeline.
 * 
 * @param {string} playerName - Player name (fuzzy match supported)
 * @param {string} stat - Stat category (points, rebounds, etc.)
 * @param {string} condition - "over" or "under"
 * @param {number} threshold - The line (e.g., 27.5)
 * @param {object} context - Game context (opponent, home/away, date, injuries)
 * @returns {object} Full pricing result with odds, confidence, reasoning
 */
async function pricebet(playerName, stat, condition, threshold, context = {}) {
  // Step 1: Statistical baseline from historical game logs
  const baseline = calcProbability(playerName, stat, condition, threshold, context.opponent);
  if (baseline.error) return { error: baseline.error };

  // Step 2: Build enriched context (defense ratings, injuries, B2B)
  // [Implementation redacted]

  // Step 3: Claude AI contextual adjustment (clamped to ±5pp from baseline)
  // [Implementation redacted — uses Anthropic Claude API]

  // Step 4: Market calibration against sportsbook lines
  // [Implementation redacted — uses The Odds API]

  // Step 5-6: Calibration blend + anti-arbitrage check
  // [Implementation redacted]

  // Step 7: Confidence scoring (5-factor composite)
  // Factors: data_depth, variance, market_comp, threshold_proximity, recency
  // [Scoring formula redacted]

  // Step 8: Odds compilation with dynamic vig
  // [Vig tiers and computation redacted]

  return {
    player: baseline.player,
    bet: baseline.bet,
    probability: '[computed]',
    confidence_score: '[computed]',
    confidence_tier: '[computed]', // very_high | high | medium | low | very_low
    decimal_odds: '[computed]',
    american: '[computed]',
    has_market_comp: '[computed]',
    reasoning: '[computed]',
    key_risk: '[computed]',
    splits: baseline.splits,
    recent_5: baseline.recent_5,
  };
}

module.exports = { pricebet };
