/**
 * Edge Factor — Playoff Urgency
 *
 * Computes how urgently a team needs to win based on current standings,
 * games remaining, and playoff implications. Teams fighting for a spot
 * play harder; teams that have clinched or been eliminated may rest starters.
 *
 * Data source: NBA CDN live standings feed
 */

'use strict';

const https = require('https');

const STANDINGS_URL = 'https://cdn.nba.com/static/json/liveData/standings/standings_00.json';
const CACHE_TTL_MS  = 4 * 60 * 60 * 1000; // 4 hours
const SEASON_GAMES  = 82;

// ── In-memory standings cache ────────────────────────────────────────────────

let _cache = { data: null, fetchedAt: 0 };

// ── Urgency tier labels ──────────────────────────────────────────────────────

function tierFromUrgency(urgency) {
  if (urgency <= 0.2) return 'locked';
  if (urgency <= 0.4) return 'comfortable';
  if (urgency <= 0.6) return 'moderate';
  if (urgency <= 0.8) return 'urgent';
  return 'desperate';
}

// ── HTTP fetch helper ────────────────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (err) {
          reject(new Error(`Failed to parse JSON from ${url}: ${err.message}`));
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ── Fetch and cache standings ────────────────────────────────────────────────

/**
 * Fetch current NBA standings from the NBA CDN.
 * Results are cached in memory for 4 hours.
 * @returns {Promise<object[]>} Array of team standing records
 */
async function fetchStandings() {
  const now = Date.now();
  if (_cache.data && (now - _cache.fetchedAt) < CACHE_TTL_MS) {
    return _cache.data;
  }

  const json = await httpGet(STANDINGS_URL);

  // NBA CDN returns { resultSets or standings.teams[] } — normalize
  const standings = json?.resultSets?.[0]?.rowSet
    || json?.standings?.entries
    || json?.league?.standard?.teams
    || [];

  // Parse into a uniform shape
  const teams = parseStandings(json);

  _cache = { data: teams, fetchedAt: now };
  return teams;
}

/**
 * Parse the NBA CDN standings response into a flat array of team records.
 * The CDN format nests teams under conference arrays.
 */
function parseStandings(json) {
  const teams = [];

  // The CDN endpoint typically returns league.standard.conferences[]
  // with each conference containing teams sorted by rank.
  const conferences = json?.league?.standard?.conferences
    || json?.resultSets?.[0]?.conferences
    || [];

  // Fallback: try flat team list at league.standard.teams
  if (conferences.length === 0) {
    const flat = json?.league?.standard?.teams || [];
    if (flat.length > 0) {
      for (const t of flat) {
        teams.push(normalizeTeam(t));
      }
      return teams;
    }
  }

  for (const conf of conferences) {
    const confName = conf.name || conf.confName || 'Unknown';
    const confTeams = conf.teams || conf.teamStandings || [];

    for (const t of confTeams) {
      teams.push(normalizeTeam(t, confName));
    }
  }

  // If conferences parsing yields nothing, try a top-level teams array
  if (teams.length === 0) {
    const topLevel = json?.teams || json?.standings?.teams || [];
    for (const t of topLevel) {
      teams.push(normalizeTeam(t));
    }
  }

  return teams;
}

function normalizeTeam(t, fallbackConf) {
  return {
    teamId:      t.teamId || t.id || null,
    teamAbbr:    t.teamAbbreviation || t.teamTricode || t.tricode || t.abbreviation || '',
    teamName:    t.teamName || t.name || '',
    teamCity:    t.teamCity || t.city || '',
    conference:  t.conference || t.confName || fallbackConf || '',
    rank:        Number(t.confRank || t.playoffRank || t.rank || 0),
    wins:        Number(t.wins || t.w || 0),
    losses:      Number(t.losses || t.l || 0),
    gamesBehind: parseFloat(t.gamesBehind || t.gb || t.confGamesBehind || '0') || 0,
    clinched:    !!(t.clinchedPlayoffs || t.clinched || (t.clinchedIndicator && t.clinchedIndicator !== '')),
    eliminated:  !!(t.eliminated || t.eliminatedFrom === 'Playoffs'),
  };
}

// ── Games remaining ──────────────────────────────────────────────────────────

function gamesRemaining(team, gameDate) {
  const gamesPlayed = team.wins + team.losses;
  let remaining = SEASON_GAMES - gamesPlayed;

  // If a gameDate is provided, we can sanity-check, but games played
  // from the standings is the authoritative source.
  if (remaining < 0) remaining = 0;
  return remaining;
}

// ── Core urgency computation ─────────────────────────────────────────────────

/**
 * Compute playoff urgency for a team.
 * @param {string} team — Team abbreviation (e.g. "LAL") or full name
 * @param {string|Date} [gameDate] — Date of the game (for late-season multiplier)
 * @returns {Promise<{urgency: number, tier: string, reason: string, standings: object}>}
 */
async function getPlayoffUrgency(team, gameDate) {
  let standings;
  try {
    standings = await fetchStandings();
  } catch (err) {
    // Fallback: moderate default when standings are unavailable
    return {
      urgency: 0.40,
      tier: 'moderate',
      reason: `Standings unavailable (${err.message}); using moderate default`,
      standings: null,
    };
  }

  if (!standings || standings.length === 0) {
    return {
      urgency: 0.40,
      tier: 'moderate',
      reason: 'No standings data available; using moderate default',
      standings: null,
    };
  }

  // Find the team
  const needle = team.toUpperCase();
  const entry = standings.find(t =>
    t.teamAbbr.toUpperCase() === needle ||
    t.teamName.toUpperCase() === needle ||
    `${t.teamCity} ${t.teamName}`.toUpperCase() === needle ||
    t.teamCity.toUpperCase() === needle
  );

  if (!entry) {
    return {
      urgency: 0.40,
      tier: 'moderate',
      reason: `Team "${team}" not found in standings; using moderate default`,
      standings: null,
    };
  }

  // Gather conference peers sorted by rank
  const confTeams = standings
    .filter(t => t.conference === entry.conference)
    .sort((a, b) => a.rank - b.rank);

  const rank = entry.rank || confTeams.indexOf(entry) + 1;
  const remaining = gamesRemaining(entry, gameDate);

  // Compute games behind key seeds
  const seed6  = confTeams[5]  || null;
  const seed7  = confTeams[6]  || null;
  const seed8  = confTeams[7]  || null;
  const seed10 = confTeams[9]  || null;

  const gb6  = seed6  ? (seed6.wins - entry.wins + entry.losses - seed6.losses) / 2 : 0;
  const gb8  = seed8  ? (seed8.wins - entry.wins + entry.losses - seed8.losses) / 2 : 0;
  const gb10 = seed10 ? (seed10.wins - entry.wins + entry.losses - seed10.losses) / 2 : 0;

  // Games ahead of 7th seed (for top-6 buffer check)
  const gamesAheadOf7 = seed7
    ? (entry.wins - seed7.wins + seed7.losses - entry.losses) / 2
    : 0;

  // ── Urgency formula ────────────────────────────────────────────────────

  let urgency;
  let reason;

  if (entry.clinched) {
    urgency = 0.10;
    reason = `Clinched playoffs, ${rank}${ordinal(rank)} in ${entry.conference}`;
  } else if (entry.eliminated) {
    urgency = 0.05;
    reason = `Eliminated from playoff contention, ${rank}${ordinal(rank)} in ${entry.conference}`;
  } else if (rank >= 13) {
    // Bottom of conference — likely resting starters
    urgency = 0.10;
    reason = `${rank}${ordinal(rank)} in ${entry.conference}, out of contention`;
  } else if (rank >= 11 && rank <= 12) {
    if (gb10 <= 4) {
      urgency = 0.85;
      reason = `${rank}${ordinal(rank)} in ${entry.conference}, ${gb10} GB of 10th seed, still alive`;
    } else {
      urgency = 0.10;
      reason = `${rank}${ordinal(rank)} in ${entry.conference}, ${gb10} GB of 10th — fading`;
    }
  } else if (rank >= 9 && rank <= 10) {
    urgency = 0.70;
    reason = `${rank}${ordinal(rank)} in ${entry.conference}, play-in bubble, ${gb8} GB of 8th`;
  } else if (rank >= 7 && rank <= 8) {
    urgency = 0.55;
    reason = `${rank}${ordinal(rank)} in ${entry.conference}, play-in territory`;
  } else if (rank >= 1 && rank <= 6 && gamesAheadOf7 <= 3) {
    urgency = 0.35;
    reason = `${rank}${ordinal(rank)} in ${entry.conference}, only ${gamesAheadOf7} games ahead of 7th`;
  } else if (rank >= 1 && rank <= 6) {
    urgency = 0.15;
    reason = `${rank}${ordinal(rank)} in ${entry.conference}, ${gamesAheadOf7} games ahead of play-in`;
  } else {
    urgency = 0.40;
    reason = `${rank}${ordinal(rank)} in ${entry.conference}`;
  }

  // Late-season multiplier
  if (remaining < 15 && urgency > 0.10) {
    urgency = Math.min(1.0, urgency * 1.3);
    reason += `, ${remaining} games left (late-season boost)`;
  }

  // Round to 2 decimal places
  urgency = Math.round(urgency * 100) / 100;

  return {
    urgency,
    tier: tierFromUrgency(urgency),
    reason,
    standings: {
      conference: entry.conference,
      rank,
      wins: entry.wins,
      losses: entry.losses,
      games_behind_6: Math.round(gb6 * 10) / 10,
      games_behind_8: Math.round(gb8 * 10) / 10,
      games_behind_10: Math.round(gb10 * 10) / 10,
      games_remaining: remaining,
      clinched: entry.clinched,
      eliminated: entry.eliminated,
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// ── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getPlayoffUrgency,
  fetchStandings,
};
