/**
 * Edge Protocol — Player Name Normalization
 *
 * Solves the #1 cause of unresolved bets: name mismatches between
 * bet files ("Shai Gilgeous-Alexander") and box scores ("S. Gilgeous-Alexander").
 *
 * Usage:
 *   const { normalize, fuzzyMatch, toCanonical } = require('./player-names');
 *   normalize("S. Gilgeous-Alexander")  // → "shai gilgeous-alexander"
 *   fuzzyMatch("Giannis", playerList)   // → "Giannis Antetokounmpo"
 */

'use strict';

// ── Known aliases: short form → canonical full name ─────────────────────────
// NBA CDN box scores use "FirstInitial. LastName" format
const ALIASES = {
  // Stars with commonly abbreviated names
  'sga': 'Shai Gilgeous-Alexander',
  's. gilgeous-alexander': 'Shai Gilgeous-Alexander',
  'gilgeous-alexander': 'Shai Gilgeous-Alexander',
  'giannis': 'Giannis Antetokounmpo',
  'g. antetokounmpo': 'Giannis Antetokounmpo',
  'the greek freak': 'Giannis Antetokounmpo',
  'lebron': 'LeBron James',
  'l. james': 'LeBron James',
  'luka': 'Luka Doncic',
  'l. doncic': 'Luka Doncic',
  'jokic': 'Nikola Jokic',
  'n. jokic': 'Nikola Jokic',
  'steph': 'Stephen Curry',
  'steph curry': 'Stephen Curry',
  's. curry': 'Stephen Curry',
  'embiid': 'Joel Embiid',
  'j. embiid': 'Joel Embiid',
  'ad': 'Anthony Davis',
  'a. davis': 'Anthony Davis',
  'kd': 'Kevin Durant',
  'k. durant': 'Kevin Durant',
  'jimmy': 'Jimmy Butler',
  'j. butler': 'Jimmy Butler',
  'tatum': 'Jayson Tatum',
  'j. tatum': 'Jayson Tatum',
  'brunson': 'Jalen Brunson',
  'j. brunson': 'Jalen Brunson',
  'ant': 'Anthony Edwards',
  'a. edwards': 'Anthony Edwards',
  'ant edwards': 'Anthony Edwards',
  'ja': 'Ja Morant',
  'j. morant': 'Ja Morant',
  'dame': 'Damian Lillard',
  'd. lillard': 'Damian Lillard',
  'dame lillard': 'Damian Lillard',
  'book': 'Devin Booker',
  'd. booker': 'Devin Booker',
  'trae': 'Trae Young',
  't. young': 'Trae Young',
  'lamelo': 'LaMelo Ball',
  'l. ball': 'LaMelo Ball',
  'pg': 'Paul George',
  'p. george': 'Paul George',
  'kawhi': 'Kawhi Leonard',
  'k. leonard': 'Kawhi Leonard',
  'kat': 'Karl-Anthony Towns',
  'k. towns': 'Karl-Anthony Towns',
  'k. anthony-towns': 'Karl-Anthony Towns',
  'karl anthony towns': 'Karl-Anthony Towns',
  'karl-anthony towns': 'Karl-Anthony Towns',
  'fox': 'De\'Aaron Fox',
  'd. fox': 'De\'Aaron Fox',
  'deaaron fox': 'De\'Aaron Fox',
  'cp3': 'Chris Paul',
  'c. paul': 'Chris Paul',
  'jaylen': 'Jaylen Brown',
  'j. brown': 'Jaylen Brown',
  'bam': 'Bam Adebayo',
  'b. adebayo': 'Bam Adebayo',
  'pascal': 'Pascal Siakam',
  'p. siakam': 'Pascal Siakam',
  'cade': 'Cade Cunningham',
  'c. cunningham': 'Cade Cunningham',
  'scottie': 'Scottie Barnes',
  's. barnes': 'Scottie Barnes',
  'wemby': 'Victor Wembanyama',
  'v. wembanyama': 'Victor Wembanyama',
  'wembanyama': 'Victor Wembanyama',
  'hali': 'Tyrese Haliburton',
  't. haliburton': 'Tyrese Haliburton',
  'maxey': 'Tyrese Maxey',
  't. maxey': 'Tyrese Maxey',
  'paolo': 'Paolo Banchero',
  'p. banchero': 'Paolo Banchero',
  'donovan': 'Donovan Mitchell',
  'd. mitchell': 'Donovan Mitchell',
  'spida': 'Donovan Mitchell',
  'lavine': 'Zach LaVine',
  'z. lavine': 'Zach LaVine',
  'dejounte': 'Dejounte Murray',
  'd. murray': 'Dejounte Murray',
  'jamal': 'Jamal Murray',
  'j. murray': 'Jamal Murray',
  'draymond': 'Draymond Green',
  'd. green': 'Draymond Green',
  'klay': 'Klay Thompson',
  'k. thompson': 'Klay Thompson',
  'zion': 'Zion Williamson',
  'z. williamson': 'Zion Williamson',
  'sabonis': 'Domantas Sabonis',
  'd. sabonis': 'Domantas Sabonis',
  'ingram': 'Brandon Ingram',
  'b. ingram': 'Brandon Ingram',
  'randle': 'Julius Randle',
  'j. randle': 'Julius Randle',
  'alperen': 'Alperen Sengun',
  'a. sengun': 'Alperen Sengun',
  'sengun': 'Alperen Sengun',
  'jrue': 'Jrue Holiday',
  'j. holiday': 'Jrue Holiday',
  'derrick white': 'Derrick White',
  'd. white': 'Derrick White',
  'mikal': 'Mikal Bridges',
  'm. bridges': 'Mikal Bridges',
  'og': 'OG Anunoby',
  'o. anunoby': 'OG Anunoby',
  'franz': 'Franz Wagner',
  'f. wagner': 'Franz Wagner',
};

// Build reverse map: canonical lower → canonical proper case
const CANONICAL_MAP = new Map();
for (const canonical of Object.values(ALIASES)) {
  CANONICAL_MAP.set(canonical.toLowerCase(), canonical);
}

// ── Core normalizer ─────────────────────────────────────────────────────────

/**
 * Normalize a player name to lowercase canonical form.
 * Strips accents, handles "F. LastName" format, resolves aliases.
 */
function normalize(name) {
  if (!name) return '';
  let s = name.trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/['']/g, "'")   // normalize apostrophes
    .replace(/\s+/g, ' ');   // collapse whitespace

  // Check alias map first
  if (ALIASES[s]) return ALIASES[s].toLowerCase();

  // Handle "F. LastName" → try alias lookup
  const initialMatch = s.match(/^([a-z])\.\s*(.+)$/);
  if (initialMatch) {
    const aliasKey = `${initialMatch[1]}. ${initialMatch[2]}`;
    if (ALIASES[aliasKey]) return ALIASES[aliasKey].toLowerCase();
  }

  // Check if it's already a canonical name
  if (CANONICAL_MAP.has(s)) return s;

  return s;
}

/**
 * Get the properly-cased canonical name, or return input if no mapping exists.
 */
function toCanonical(name) {
  const norm = normalize(name);
  return CANONICAL_MAP.get(norm) || name;
}

// ── Fuzzy matching ──────────────────────────────────────────────────────────

/**
 * Find the best matching player name from a list of candidates.
 * Uses last-name matching + Levenshtein distance as tiebreaker.
 *
 * @param {string} input - Player name to match
 * @param {string[]} candidates - List of full player names to match against
 * @param {number} maxDistance - Max edit distance for fuzzy match (default 3)
 * @returns {{ match: string|null, distance: number, exact: boolean }}
 */
function fuzzyMatch(input, candidates, maxDistance = 3) {
  if (!input || !candidates?.length) return { match: null, distance: Infinity, exact: false };

  const norm = normalize(input);

  // 1. Exact match
  for (const c of candidates) {
    if (normalize(c) === norm) return { match: c, distance: 0, exact: true };
  }

  // 2. Last name match
  const inputLast = norm.split(' ').pop().replace(/[^a-z]/g, '');
  const lastNameMatches = candidates.filter(c => {
    const cLast = normalize(c).split(' ').pop().replace(/[^a-z]/g, '');
    return cLast === inputLast || cLast.includes(inputLast) || inputLast.includes(cLast);
  });

  if (lastNameMatches.length === 1) {
    return { match: lastNameMatches[0], distance: 1, exact: false };
  }

  // 3. Levenshtein on full normalized name
  let best = null;
  let bestDist = Infinity;

  for (const c of candidates) {
    const d = levenshtein(norm, normalize(c));
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }

  if (bestDist <= maxDistance) {
    return { match: best, distance: bestDist, exact: false };
  }

  return { match: null, distance: Infinity, exact: false };
}

/**
 * Match a player name from a box score player list.
 * Box scores use "FirstName FamilyName" format from NBA CDN.
 */
function matchBoxScore(betPlayerName, boxScorePlayers) {
  if (!betPlayerName || !boxScorePlayers?.length) return null;

  const names = boxScorePlayers.map(p => p.name || `${p.firstName} ${p.familyName}`.trim());
  const result = fuzzyMatch(betPlayerName, names);

  if (result.match) {
    return boxScorePlayers.find(p => {
      const name = p.name || `${p.firstName} ${p.familyName}`.trim();
      return name === result.match;
    });
  }
  return null;
}

// ── Levenshtein distance ────────────────────────────────────────────────────
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = new Array(a.length + 1);
    matrix[i][0] = i;
  }
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

module.exports = { normalize, toCanonical, fuzzyMatch, matchBoxScore, ALIASES };
