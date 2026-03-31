/**
 * rivalry-intensity.js
 *
 * NBA rivalry intensity data for the Edge pricing engine.
 * Intensity scale: 0-1
 *   0.3  = standard matchup (default)
 *   0.7+ = meaningful rivalry
 *   0.9+ = historic / all-time rivalry
 *
 * Keys are sorted alphabetically (e.g. "ATL-NYK" not "NYK-ATL").
 * The lookup function handles team order automatically.
 */

const RIVALRIES = {
  // ---------- Historic / All-Time ----------
  'BOS-LAL': {
    intensity: 0.95,
    historicalEdge: 'BOS',
    notes: 'Greatest NBA rivalry — 17 championships each conference, 12 Finals matchups',
  },

  // ---------- Atlantic Division & Eastern Conference ----------
  'BOS-NYK': {
    intensity: 0.85,
    historicalEdge: 'BOS',
    notes: 'Atlantic division classic — decades of playoff battles',
  },
  'BOS-MIA': {
    intensity: 0.80,
    historicalEdge: null,
    notes: 'Eastern Conference playoff wars — 2020s contender clashes',
  },
  'BOS-PHI': {
    intensity: 0.70,
    historicalEdge: 'BOS',
    notes: 'Atlantic division rivalry — Dr. J vs Bird era through modern day',
  },
  'BKN-NYK': {
    intensity: 0.75,
    historicalEdge: null,
    notes: 'NYC crosstown rivalry — Barclays vs MSG',
  },
  'MIA-NYK': {
    intensity: 0.65,
    historicalEdge: null,
    notes: '90s/2000s playoff history — Mourning vs Ewing, Heat culture vs Knicks grit',
  },
  'NYK-PHI': {
    intensity: 0.70,
    historicalEdge: null,
    notes: 'I-95 corridor — Iverson era through Embiid/Brunson',
  },
  'BOS-MIL': {
    intensity: 0.65,
    historicalEdge: null,
    notes: 'Eastern Conference contenders — recent playoff series',
  },

  // ---------- Central Division ----------
  'CHI-DET': {
    intensity: 0.60,
    historicalEdge: 'CHI',
    notes: 'Bad Boys era legacy — Jordan Rules, physical playoff battles',
  },
  'CHI-CLE': {
    intensity: 0.55,
    historicalEdge: 'CHI',
    notes: 'Central division — Jordan over Ehlo, LeBron homecoming',
  },
  'CLE-IND': {
    intensity: 0.50,
    historicalEdge: null,
    notes: 'Central division — LeBron-era playoff matchups',
  },

  // ---------- California ----------
  'GSW-LAL': {
    intensity: 0.75,
    historicalEdge: null,
    notes: 'California rivalry — Curry vs LeBron, Bay vs LA',
  },
  'LAC-LAL': {
    intensity: 0.65,
    historicalEdge: 'LAL',
    notes: 'Arena rivalry — Lob City vs Showtime legacy, shared Staples Center era',
  },
  'GSW-LAC': {
    intensity: 0.50,
    historicalEdge: 'GSW',
    notes: 'California rivalry — Lob City vs Splash Brothers playoff clashes',
  },
  'LAL-SAC': {
    intensity: 0.55,
    historicalEdge: 'LAL',
    notes: 'Early 2000s playoff wars — controversial 2002 WCF',
  },

  // ---------- Texas Triangle ----------
  'DAL-HOU': {
    intensity: 0.65,
    historicalEdge: null,
    notes: 'Texas rivalry — Luka vs Houston rebuild, Lone Star pride',
  },
  'DAL-SAS': {
    intensity: 0.60,
    historicalEdge: 'SAS',
    notes: 'Texas triangle — Dirk vs Duncan, I-35 corridor',
  },
  'HOU-SAS': {
    intensity: 0.55,
    historicalEdge: 'SAS',
    notes: 'Texas triangle — Hakeem vs Robinson, Harden vs Kawhi playoff battles',
  },

  // ---------- Western Conference ----------
  'CLE-GSW': {
    intensity: 0.70,
    historicalEdge: 'GSW',
    notes: '2015-2018 Finals legacy — four consecutive Finals, The Block, 3-1 comeback',
  },
  'DEN-LAL': {
    intensity: 0.70,
    historicalEdge: 'DEN',
    notes: 'Western Conference Finals — 2023 sweep, 2024 rematch, Jokic vs LeBron',
  },
  'DEN-MIN': {
    intensity: 0.65,
    historicalEdge: 'DEN',
    notes: 'Northwest division — recent playoff battles, Jokic vs Edwards',
  },
  'LAL-PHX': {
    intensity: 0.60,
    historicalEdge: null,
    notes: 'Western Conference history — Suns eliminated Lakers in 2021 playoffs',
  },
  'MEM-MIN': {
    intensity: 0.60,
    historicalEdge: null,
    notes: '2022 playoff series — Ja vs Ant, new generation rivalry',
  },
  'GSW-OKC': {
    intensity: 0.55,
    historicalEdge: 'GSW',
    notes: 'Durant departure legacy — 2016 WCF collapse, KD to Warriors',
  },
  'DEN-PHX': {
    intensity: 0.55,
    historicalEdge: 'DEN',
    notes: 'Western Conference — 2023 playoff sweep, Jokic vs Booker/KD',
  },
  'DAL-PHX': {
    intensity: 0.55,
    historicalEdge: null,
    notes: 'Southwest vs Pacific — Nash legacy, Luka vs Booker/KD',
  },
  'LAL-SAS': {
    intensity: 0.60,
    historicalEdge: null,
    notes: 'Western Conference — Shaq/Kobe vs Duncan dynasty, multiple playoff clashes',
  },

  // ---------- Southeast Division ----------
  'ATL-MIA': {
    intensity: 0.50,
    historicalEdge: 'MIA',
    notes: 'Southeast division — playoff matchups, Heat culture dominance',
  },

  // ---------- Pacific / Northwest ----------
  'LAL-POR': {
    intensity: 0.50,
    historicalEdge: 'LAL',
    notes: '2000 WCF comeback — Shaq/Kobe rallied from 15 down in Game 7',
  },
  'OKC-MIN': {
    intensity: 0.50,
    historicalEdge: null,
    notes: 'Northwest division — young star matchup, SGA vs Edwards',
  },
  'OKC-DAL': {
    intensity: 0.50,
    historicalEdge: null,
    notes: 'Western Conference — 2024 playoff series, rising contenders',
  },
};

/**
 * Look up rivalry intensity between two teams.
 *
 * @param {string} teamA - Three-letter team abbreviation (e.g. "BOS")
 * @param {string} teamB - Three-letter team abbreviation (e.g. "LAL")
 * @returns {{ intensity: number, historicalEdge: string|null, notes: string }}
 */
function getRivalryIntensity(teamA, teamB) {
  const a = teamA.toUpperCase();
  const b = teamB.toUpperCase();
  const key = [a, b].sort().join('-');

  return (
    RIVALRIES[key] || {
      intensity: 0.3,
      historicalEdge: null,
      notes: 'Standard matchup',
    }
  );
}

module.exports = { RIVALRIES, getRivalryIntensity };
