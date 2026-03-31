/**
 * Edge Protocol — Roster Guardrails
 *
 * Prevents Claude from referencing players on the wrong team.
 * Past bugs: KD on PHX (now HOU), Luka on DAL (now LAL),
 * Jrue on BOS (now POR), LaVine on CHI (now SAC).
 *
 * Exports:
 *   getCurrentRosters()              — async, Map<teamAbbr, [playerName]>
 *   generateRosterPrompt()           — async, formatted prompt block
 *   validatePlayerTeam(name, abbr)   — async, boolean
 *   TRADE_CORRECTIONS                — mid-season trade corrections
 */

'use strict';

const https = require('https');
const { normalize } = require('../player-names');

// ── Mid-season trade corrections for 2025-26 ──────────────────────────────
const TRADE_CORRECTIONS = {
  'Kevin Durant':      { from: 'PHX', to: 'HOU', date: '2026-02-06', note: 'KD traded from PHX' },
  'Luka Doncic':       { from: 'DAL', to: 'LAL', date: '2026-02-06', note: 'Luka traded from DAL mid-season' },
  'Jrue Holiday':      { from: 'BOS', to: 'POR', date: '2026-02-06', note: 'traded from BOS' },
  'Zach LaVine':       { from: 'CHI', to: 'SAC', date: '2026-02-06', note: 'LaVine traded from CHI' },
  'Nikola Vucevic':    { from: 'CHI', to: 'BOS', date: '2026-02-06', note: 'Vucevic traded from CHI' },
};

// ── Roster cache ───────────────────────────────────────────────────────────
let _rosterCache = null;
let _rosterCacheTime = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ── HTTP helper ────────────────────────────────────────────────────────────

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGet(res.headers.location, headers).then(resolve, reject);
      }
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

// ── Hardcoded fallback rosters ─────────────────────────────────────────────
// Top ~8 players per team, all 30 teams. Already includes trade corrections.
const FALLBACK_ROSTERS = {
  ATL: ['Trae Young', 'Dejounte Murray', 'Jalen Johnson', 'De\'Andre Hunter', 'Clint Capela', 'Bogdan Bogdanovic', 'Onyeka Okongwu', 'Zaccharie Risacher'],
  BOS: ['Jayson Tatum', 'Jaylen Brown', 'Derrick White', 'Nikola Vucevic', 'Kristaps Porzingis', 'Payton Pritchard', 'Al Horford', 'Sam Hauser'],
  BKN: ['Mikal Bridges', 'Cameron Johnson', 'Nic Claxton', 'Dennis Schroder', 'Dorian Finney-Smith', 'Ben Simmons', 'Day\'Ron Sharpe', 'Cam Thomas'],
  CHA: ['LaMelo Ball', 'Brandon Miller', 'Miles Bridges', 'Mark Williams', 'Nick Richards', 'Terry Rozier', 'P.J. Washington', 'Cody Martin'],
  CHI: ['Coby White', 'Patrick Williams', 'Ayo Dosunmu', 'Andre Drummond', 'Lonzo Ball', 'Alex Caruso', 'Josh Giddey', 'Torrey Craig'],
  CLE: ['Donovan Mitchell', 'Darius Garland', 'Evan Mobley', 'Jarrett Allen', 'Caris LeVert', 'Max Strus', 'Isaac Okoro', 'Sam Merrill'],
  DAL: ['Kyrie Irving', 'P.J. Washington', 'Daniel Gafford', 'Dereck Lively II', 'Tim Hardaway Jr.', 'Klay Thompson', 'Naji Marshall', 'Quentin Grimes'],
  DEN: ['Nikola Jokic', 'Jamal Murray', 'Michael Porter Jr.', 'Aaron Gordon', 'Kentavious Caldwell-Pope', 'Christian Braun', 'Peyton Watson', 'Reggie Jackson'],
  DET: ['Cade Cunningham', 'Jaden Ivey', 'Ausar Thompson', 'Jalen Duren', 'Tobias Harris', 'Bojan Bogdanovic', 'Alec Burks', 'Isaiah Stewart'],
  GSW: ['Stephen Curry', 'Draymond Green', 'Andrew Wiggins', 'Jonathan Kuminga', 'Kevon Looney', 'Chris Paul', 'Brandin Podziemski', 'Gary Payton II'],
  HOU: ['Kevin Durant', 'Alperen Sengun', 'Jalen Green', 'Fred VanVleet', 'Jabari Smith Jr.', 'Amen Thompson', 'Dillon Brooks', 'Tari Eason'],
  IND: ['Tyrese Haliburton', 'Pascal Siakam', 'Myles Turner', 'Buddy Hield', 'Aaron Nesmith', 'Andrew Nembhard', 'T.J. McConnell', 'Bennedict Mathurin'],
  LAC: ['Kawhi Leonard', 'Paul George', 'James Harden', 'Russell Westbrook', 'Ivica Zubac', 'Norman Powell', 'Terance Mann', 'Bones Hyland'],
  LAL: ['LeBron James', 'Luka Doncic', 'Anthony Davis', 'Austin Reaves', 'D\'Angelo Russell', 'Rui Hachimura', 'Jarred Vanderbilt', 'Gabe Vincent'],
  MEM: ['Ja Morant', 'Desmond Bane', 'Jaren Jackson Jr.', 'Marcus Smart', 'Santi Aldama', 'Luke Kennard', 'Brandon Clarke', 'GG Jackson'],
  MIA: ['Jimmy Butler', 'Bam Adebayo', 'Tyler Herro', 'Terry Rozier', 'Jaime Jaquez Jr.', 'Caleb Martin', 'Duncan Robinson', 'Nikola Jovic'],
  MIL: ['Giannis Antetokounmpo', 'Damian Lillard', 'Khris Middleton', 'Brook Lopez', 'Bobby Portis', 'Malik Beasley', 'Pat Connaughton', 'MarJon Beauchamp'],
  MIN: ['Anthony Edwards', 'Karl-Anthony Towns', 'Rudy Gobert', 'Jaden McDaniels', 'Mike Conley', 'Naz Reid', 'Nickeil Alexander-Walker', 'Kyle Anderson'],
  NOP: ['Zion Williamson', 'Brandon Ingram', 'CJ McCollum', 'Herb Jones', 'Jonas Valanciunas', 'Trey Murphy III', 'Larry Nance Jr.', 'Jose Alvarado'],
  NYK: ['Jalen Brunson', 'Karl-Anthony Towns', 'Mikal Bridges', 'OG Anunoby', 'Josh Hart', 'Donte DiVincenzo', 'Mitchell Robinson', 'Miles McBride'],
  OKC: ['Shai Gilgeous-Alexander', 'Jalen Williams', 'Chet Holmgren', 'Luguentz Dort', 'Josh Giddey', 'Cason Wallace', 'Isaiah Joe', 'Kenrich Williams'],
  ORL: ['Paolo Banchero', 'Franz Wagner', 'Jalen Suggs', 'Wendell Carter Jr.', 'Moritz Wagner', 'Cole Anthony', 'Gary Harris', 'Jonathan Isaac'],
  PHI: ['Joel Embiid', 'Tyrese Maxey', 'Paul George', 'Tobias Harris', 'Buddy Hield', 'Kelly Oubre Jr.', 'De\'Anthony Melton', 'Nicolas Batum'],
  PHX: ['Devin Booker', 'Bradley Beal', 'Jusuf Nurkic', 'Grayson Allen', 'Eric Gordon', 'Drew Eubanks', 'Royce O\'Neale', 'Bol Bol'],
  POR: ['Jrue Holiday', 'Anfernee Simons', 'Jerami Grant', 'Deandre Ayton', 'Shaedon Sharpe', 'Malcolm Brogdon', 'Robert Williams III', 'Toumani Camara'],
  SAC: ['De\'Aaron Fox', 'Domantas Sabonis', 'Zach LaVine', 'Keegan Murray', 'Harrison Barnes', 'Malik Monk', 'Kevin Huerter', 'Trey Lyles'],
  SAS: ['Victor Wembanyama', 'Devin Vassell', 'Keldon Johnson', 'Jeremy Sochan', 'Tre Jones', 'Zach Collins', 'Doug McDermott', 'Malaki Branham'],
  TOR: ['Scottie Barnes', 'Pascal Siakam', 'Jakob Poeltl', 'Gary Trent Jr.', 'Immanuel Quickley', 'RJ Barrett', 'Chris Boucher', 'Gradey Dick'],
  UTA: ['Lauri Markkanen', 'Jordan Clarkson', 'Collin Sexton', 'John Collins', 'Walker Kessler', 'Keyonte George', 'Kris Dunn', 'Talen Horton-Tucker'],
  WAS: ['Kyle Kuzma', 'Jordan Poole', 'Deni Avdija', 'Tyus Jones', 'Daniel Gafford', 'Corey Kispert', 'Anthony Gill', 'Bilal Coulibaly'],
};

// ── Fetch rosters from balldontlie API ─────────────────────────────────────

async function fetchBallDontLie() {
  const teamMap = new Map();
  let cursor = null;
  let pages = 0;
  const maxPages = 20; // safety limit

  try {
    do {
      const url = cursor
        ? `https://api.balldontlie.io/v1/players?per_page=100&cursor=${cursor}`
        : 'https://api.balldontlie.io/v1/players?per_page=100';

      const raw = await httpGet(url);
      const data = JSON.parse(raw);

      if (!data.data || !Array.isArray(data.data)) break;

      for (const player of data.data) {
        if (!player.team || !player.team.abbreviation) continue;
        const abbr = player.team.abbreviation;
        const name = `${player.first_name} ${player.last_name}`;
        if (!teamMap.has(abbr)) teamMap.set(abbr, []);
        teamMap.get(abbr).push(name);
      }

      cursor = data.meta?.next_cursor || null;
      pages++;
    } while (cursor && pages < maxPages);

    if (teamMap.size < 20) return null; // too few teams — probably failed
    return teamMap;
  } catch (err) {
    return null;
  }
}

// ── Apply trade corrections to a roster map ────────────────────────────────

function applyTradeCorrections(rosterMap) {
  for (const [player, trade] of Object.entries(TRADE_CORRECTIONS)) {
    // Remove from old team
    if (rosterMap.has(trade.from)) {
      const oldRoster = rosterMap.get(trade.from);
      const idx = oldRoster.findIndex(p => normalize(p) === normalize(player));
      if (idx !== -1) oldRoster.splice(idx, 1);
    }

    // Add to new team if not already there
    if (rosterMap.has(trade.to)) {
      const newRoster = rosterMap.get(trade.to);
      const alreadyThere = newRoster.some(p => normalize(p) === normalize(player));
      if (!alreadyThere) newRoster.push(player);
    } else {
      rosterMap.set(trade.to, [player]);
    }
  }
  return rosterMap;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Get current rosters as Map<teamAbbr, [playerName]>.
 * Tries balldontlie API first, falls back to hardcoded rosters.
 * Results are cached for 24 hours.
 */
async function getCurrentRosters() {
  const now = Date.now();
  if (_rosterCache && (now - _rosterCacheTime) < CACHE_TTL) {
    return _rosterCache;
  }

  let rosterMap = null;

  // Try balldontlie API
  rosterMap = await fetchBallDontLie();

  // Fallback to hardcoded
  if (!rosterMap) {
    rosterMap = new Map();
    for (const [abbr, players] of Object.entries(FALLBACK_ROSTERS)) {
      rosterMap.set(abbr, [...players]);
    }
  }

  // Always apply trade corrections on top
  applyTradeCorrections(rosterMap);

  _rosterCache = rosterMap;
  _rosterCacheTime = now;
  return rosterMap;
}

/**
 * Generate a formatted roster prompt block for Claude's system prompt.
 * Includes trade notes in parentheses for recently traded players.
 */
async function generateRosterPrompt() {
  const rosters = await getCurrentRosters();

  // Build trade note lookup: normalized player name -> note
  const tradeNotes = new Map();
  for (const [player, trade] of Object.entries(TRADE_CORRECTIONS)) {
    tradeNotes.set(normalize(player), { note: trade.note, team: trade.to });
  }

  const lines = ['ROSTER GUARDRAILS \u2014 You may ONLY reference players on these rosters:'];
  const sortedTeams = [...rosters.keys()].sort();

  for (const abbr of sortedTeams) {
    const players = rosters.get(abbr);
    const annotated = players.map((p) => {
      const norm = normalize(p);
      const trade = tradeNotes.get(norm);
      if (trade && trade.team === abbr) {
        return `${p} (${trade.note})`;
      }
      return p;
    });
    lines.push(`${abbr}: ${annotated.join(', ')}`);
  }

  lines.push('');
  lines.push('DO NOT reference any player on a team they no longer play for.');

  return lines.join('\n');
}

/**
 * Validate whether a player is on a given team's roster.
 * Checks TRADE_CORRECTIONS first as a fast path,
 * then falls back to full roster lookup using normalized names.
 *
 * @param {string} playerName - Player name (handles aliases/abbreviations)
 * @param {string} teamAbbr  - Team abbreviation (e.g. 'HOU')
 * @returns {Promise<boolean>}
 */
async function validatePlayerTeam(playerName, teamAbbr) {
  const normInput = normalize(playerName);
  const upperAbbr = teamAbbr.toUpperCase();

  // Fast path: check trade corrections
  for (const [player, trade] of Object.entries(TRADE_CORRECTIONS)) {
    if (normalize(player) === normInput) {
      return trade.to === upperAbbr;
    }
  }

  // Full roster check
  const rosters = await getCurrentRosters();
  const roster = rosters.get(upperAbbr);
  if (!roster) return false;

  return roster.some(p => normalize(p) === normInput);
}

module.exports = {
  TRADE_CORRECTIONS,
  getCurrentRosters,
  generateRosterPrompt,
  validatePlayerTeam,
};
