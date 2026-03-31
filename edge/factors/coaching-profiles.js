/**
 * coaching-profiles.js
 *
 * Static coaching intelligence for all 30 NBA teams (2025-26 season).
 * Provides contextual coaching data for the Edge NBA pricing engine,
 * including pace preference, defensive scheme, timeout tendencies,
 * in-game adjustment ability, and clutch execution ratings.
 */

const COACHING_PROFILES = {
  // ── Eastern Conference ─────────────────────────────────────────────

  // Atlantic Division
  BOS: {
    coach: "Joe Mazzulla",
    pace: "fast",
    defensiveScheme: "switch-everything",
    timeoutTendency: "aggressive",
    adjustmentSpeed: "high",
    clutchRating: 0.78,
    notes: "Champion coach, space-and-pace offense, elite 3-point volume"
  },
  BKN: {
    coach: "Jordi Fernandez",
    pace: "moderate",
    defensiveScheme: "drop-coverage",
    timeoutTendency: "strategic",
    adjustmentSpeed: "medium",
    clutchRating: 0.48,
    notes: "Development-focused rebuild, structured European-style offense"
  },
  NYK: {
    coach: "Mike Brown",
    pace: "moderate",
    defensiveScheme: "switch-heavy",
    timeoutTendency: "strategic",
    adjustmentSpeed: "medium",
    clutchRating: 0.60,
    notes: "Replaced Thibodeau, veteran coach emphasizing defensive identity"
  },
  PHI: {
    coach: "Nick Nurse",
    pace: "moderate",
    defensiveScheme: "zone-press-hybrid",
    timeoutTendency: "aggressive",
    adjustmentSpeed: "high",
    clutchRating: 0.62,
    notes: "Creative defensive schemes, full-court pressure, champion pedigree"
  },
  TOR: {
    coach: "Darko Rajakovic",
    pace: "fast",
    defensiveScheme: "switch-heavy",
    timeoutTendency: "strategic",
    adjustmentSpeed: "medium",
    clutchRating: 0.45,
    notes: "Player-development focus, modern motion offense, young roster"
  },

  // Central Division
  CHI: {
    coach: "Billy Donovan",
    pace: "moderate",
    defensiveScheme: "drop-coverage",
    timeoutTendency: "strategic",
    adjustmentSpeed: "medium",
    clutchRating: 0.55,
    notes: "Steady hand, balanced approach, mid-range heavy offense"
  },
  CLE: {
    coach: "Kenny Atkinson",
    pace: "fast",
    defensiveScheme: "switch-heavy",
    timeoutTendency: "strategic",
    adjustmentSpeed: "high",
    clutchRating: 0.65,
    notes: "Modern switching defense, pace-and-space, analytics-driven"
  },
  DET: {
    coach: "J.B. Bickerstaff",
    pace: "moderate",
    defensiveScheme: "drop-coverage",
    timeoutTendency: "passive",
    adjustmentSpeed: "medium",
    clutchRating: 0.47,
    notes: "Physical defensive identity, developing young core"
  },
  IND: {
    coach: "Rick Carlisle",
    pace: "fast",
    defensiveScheme: "switch-moderate",
    timeoutTendency: "aggressive",
    adjustmentSpeed: "high",
    clutchRating: 0.64,
    notes: "Champion coach, motion offense, creative ATO plays"
  },
  MIL: {
    coach: "Doc Rivers",
    pace: "moderate",
    defensiveScheme: "drop-switch-hybrid",
    timeoutTendency: "aggressive",
    adjustmentSpeed: "medium",
    clutchRating: 0.58,
    notes: "Veteran presence, drop-and-switch hybrid, relies on star talent"
  },

  // Southeast Division
  ATL: {
    coach: "Quin Snyder",
    pace: "moderate",
    defensiveScheme: "switch-heavy",
    timeoutTendency: "strategic",
    adjustmentSpeed: "high",
    clutchRating: 0.60,
    notes: "Motion offense, sophisticated schemes, strong ATO execution"
  },
  CHA: {
    coach: "Charles Lee",
    pace: "moderate",
    defensiveScheme: "switch-heavy",
    timeoutTendency: "strategic",
    adjustmentSpeed: "medium",
    clutchRating: 0.50,
    notes: "Celtics championship assistant, culture-builder, modern approach"
  },
  MIA: {
    coach: "Erik Spoelstra",
    pace: "moderate",
    defensiveScheme: "zone-defense",
    timeoutTendency: "strategic",
    adjustmentSpeed: "high",
    clutchRating: 0.82,
    notes: "Elite in-game adjustments, zone specialist, culture-driven"
  },
  ORL: {
    coach: "Jamahl Mosley",
    pace: "slow",
    defensiveScheme: "switch-heavy",
    timeoutTendency: "strategic",
    adjustmentSpeed: "medium",
    clutchRating: 0.58,
    notes: "Defense-first identity, length and athleticism, developing roster"
  },
  WAS: {
    coach: "Brian Keefe",
    pace: "moderate",
    defensiveScheme: "drop-coverage",
    timeoutTendency: "passive",
    adjustmentSpeed: "low",
    clutchRating: 0.38,
    notes: "Rebuild mode, player development emphasis, limited roster talent"
  },

  // ── Western Conference ─────────────────────────────────────────────

  // Northwest Division
  DEN: {
    coach: "David Adelman",
    pace: "moderate",
    defensiveScheme: "drop-coverage",
    timeoutTendency: "strategic",
    adjustmentSpeed: "medium",
    clutchRating: 0.58,
    notes: "Promoted from interim after Malone firing, Jokic-centric system"
  },
  MIN: {
    coach: "Chris Finch",
    pace: "moderate",
    defensiveScheme: "versatile-switch",
    timeoutTendency: "strategic",
    adjustmentSpeed: "high",
    clutchRating: 0.63,
    notes: "Versatile defensive schemes, strong offensive structure"
  },
  OKC: {
    coach: "Mark Daigneault",
    pace: "moderate",
    defensiveScheme: "switch-heavy",
    timeoutTendency: "strategic",
    adjustmentSpeed: "high",
    clutchRating: 0.72,
    notes: "Elite development coach, versatile offense"
  },
  POR: {
    coach: "Chauncey Billups",
    pace: "fast",
    defensiveScheme: "drop-coverage",
    timeoutTendency: "passive",
    adjustmentSpeed: "medium",
    clutchRating: 0.44,
    notes: "Developing young backcourt, up-tempo transition game"
  },
  UTA: {
    coach: "Will Hardy",
    pace: "moderate",
    defensiveScheme: "switch-heavy",
    timeoutTendency: "strategic",
    adjustmentSpeed: "medium",
    clutchRating: 0.46,
    notes: "Spurs coaching tree, modern schemes, long-term rebuild"
  },

  // Pacific Division
  GSW: {
    coach: "Steve Kerr",
    pace: "fast",
    defensiveScheme: "switch-defense",
    timeoutTendency: "strategic",
    adjustmentSpeed: "high",
    clutchRating: 0.76,
    notes: "Motion offense architect, dynasty coach, elite late-game plays"
  },
  LAC: {
    coach: "Tyronn Lue",
    pace: "moderate",
    defensiveScheme: "switch-heavy",
    timeoutTendency: "aggressive",
    adjustmentSpeed: "high",
    clutchRating: 0.70,
    notes: "Elite ATO coach, playoff pedigree, strong in-game adjustments"
  },
  LAL: {
    coach: "JJ Redick",
    pace: "fast",
    defensiveScheme: "switch-moderate",
    timeoutTendency: "strategic",
    adjustmentSpeed: "medium",
    clutchRating: 0.55,
    notes: "First-year head coach, motion offense, analytics-oriented"
  },
  PHX: {
    coach: "Jordan Ott",
    pace: "moderate",
    defensiveScheme: "drop-wall-hybrid",
    timeoutTendency: "strategic",
    adjustmentSpeed: "medium",
    clutchRating: 0.52,
    notes: "Promoted after Budenholzer departure, inherits star-heavy roster"
  },
  SAC: {
    coach: "Doug Christie",
    pace: "fast",
    defensiveScheme: "switch-moderate",
    timeoutTendency: "strategic",
    adjustmentSpeed: "medium",
    clutchRating: 0.50,
    notes: "Promoted from assistant, up-tempo attack, Kings identity builder"
  },

  // Southwest Division
  DAL: {
    coach: "Jason Kidd",
    pace: "moderate",
    defensiveScheme: "switch-heavy",
    timeoutTendency: "passive",
    adjustmentSpeed: "medium",
    clutchRating: 0.62,
    notes: "Switch-everything defense, Finals experience, star-dependent"
  },
  HOU: {
    coach: "Ime Udoka",
    pace: "moderate",
    defensiveScheme: "switch-heavy",
    timeoutTendency: "aggressive",
    adjustmentSpeed: "high",
    clutchRating: 0.61,
    notes: "Defense-first culture, physical play, rapid roster development"
  },
  MEM: {
    coach: "Tuomas Iisalo",
    pace: "fast",
    defensiveScheme: "aggressive-pressure",
    timeoutTendency: "strategic",
    adjustmentSpeed: "medium",
    clutchRating: 0.50,
    notes: "Replaced Taylor Jenkins, European coaching background, high-energy style"
  },
  NOP: {
    coach: "James Borrego",
    pace: "moderate",
    defensiveScheme: "drop-coverage",
    timeoutTendency: "passive",
    adjustmentSpeed: "medium",
    clutchRating: 0.45,
    notes: "Interim coach after Willie Green firing, stabilizing roster"
  },
  SAS: {
    coach: "Mitch Johnson",
    pace: "slow",
    defensiveScheme: "fundamental-defense",
    timeoutTendency: "strategic",
    adjustmentSpeed: "medium",
    clutchRating: 0.50,
    notes: "Succeeded Popovich, Spurs system continuity, Wembanyama development"
  }
};

/**
 * Look up the coaching profile for a given team abbreviation.
 *
 * @param {string} teamAbbr - Three-letter team abbreviation (e.g. "OKC").
 * @returns {object|null} The coaching profile object, or null if not found.
 */
function getCoachingProfile(teamAbbr) {
  if (!teamAbbr) return null;
  return COACHING_PROFILES[teamAbbr.toUpperCase()] || null;
}

module.exports = { COACHING_PROFILES, getCoachingProfile };
