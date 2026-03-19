/**
 * player-ids.ts
 * Shared utility to resolve NBA player IDs from names,
 * and extract player/team references from text strings.
 * Used by Polls, Arena, and Players pages.
 */

// Known player name → NBA player ID
export const PLAYER_IDS: Record<string, number> = {
  "Shai Gilgeous-Alexander": 1628983, "SGA": 1628983,
  "Nikola Jokic": 203999, "Jokic": 203999,
  "Jalen Brunson": 1628973, "Brunson": 1628973,
  "Victor Wembanyama": 1641705, "Wembanyama": 1641705, "Wemby": 1641705,
  "Tyrese Haliburton": 1630169, "Haliburton": 1630169,
  "Anthony Edwards": 1630162, "Edwards": 1630162, "Ant": 1630162,
  "Giannis Antetokounmpo": 203507, "Giannis": 203507,
  "Luka Doncic": 1629029, "Luka": 1629029,
  "Joel Embiid": 203954, "Embiid": 203954,
  "Bam Adebayo": 1628389, "Bam": 1628389,
  "Alex Caruso": 1627936, "Caruso": 1627936,
  "De'Aaron Fox": 1628368, "Fox": 1628368,
  "Rudy Gobert": 203497, "Gobert": 203497,
  "Anthony Davis": 203076, "Davis": 203076,
  "LeBron James": 2544, "LeBron": 2544,
  "Stephen Curry": 201939, "Curry": 201939, "Steph": 201939,
  "Kevin Durant": 201142, "Durant": 201142, "KD": 201142,
  "Damian Lillard": 203081, "Dame": 203081,
  "Kawhi Leonard": 202695, "Kawhi": 202695,
  "Paul George": 202331, "PG": 202331,
  "Jimmy Butler": 202710, "Butler": 202710,
  "Jayson Tatum": 1628369, "Tatum": 1628369,
  "Jaylen Brown": 1627759, "Brown": 1627759,
  "Donovan Mitchell": 1628378, "Mitchell": 1628378,
  "Devin Booker": 1626164, "Booker": 1626164,
  "Zion Williamson": 1629627, "Zion": 1629627,
  "Paolo Banchero": 1631094, "Banchero": 1629029,
  "Cade Cunningham": 1630595, "Cade": 1630595,
  "Julius Randle": 203944, "Randle": 203944,
  "DeMar DeRozan": 201942, "DeRozan": 201942,
  "Karl-Anthony Towns": 1626157, "KAT": 1626157, "Towns": 1626157,
  "Draymond Green": 203110, "Draymond": 203110,
  "Klay Thompson": 202691, "Klay": 202691,
  "Chris Paul": 101108, "CP3": 101108,
  "Trae Young": 1629027, "Trae": 1629027,
  "Ja Morant": 1629630, "Ja": 1629630,
};

// Team abbreviation aliases
const TEAM_ALIASES: Record<string, string> = {
  "Celtics": "BOS", "Knicks": "NYK", "Lakers": "LAL", "Nuggets": "DEN",
  "Warriors": "GSW", "Bucks": "MIL", "Suns": "PHX", "Mavericks": "DAL",
  "Cavaliers": "CLE", "Heat": "MIA", "Raptors": "TOR", "Bulls": "CHI",
  "76ers": "PHI", "Nets": "BKN", "Pistons": "DET", "Pacers": "IND",
  "Hawks": "ATL", "Magic": "ORL", "Wizards": "WAS", "Hornets": "CHA",
  "Rockets": "HOU", "Thunder": "OKC", "Grizzlies": "MEM", "Pelicans": "NOP",
  "Clippers": "LAC", "Kings": "SAC", "Spurs": "SAS", "Jazz": "UTA",
  "Trail Blazers": "POR", "Timberwolves": "MIN",
};

/**
 * Given a text string (proposition, article title, etc.),
 * extract the first matching player ID found.
 */
export function extractPlayerId(text: string): number | null {
  if (!text) return null;
  for (const [name, id] of Object.entries(PLAYER_IDS)) {
    if (text.includes(name)) return id;
  }
  return null;
}

/**
 * Given a text string, extract the first matching player name found.
 */
export function extractPlayerName(text: string): string | null {
  if (!text) return null;
  for (const name of Object.keys(PLAYER_IDS)) {
    if (text.includes(name)) return name;
  }
  return null;
}

/**
 * Given a game string like "BOS @ NYK" or "LAL @ DEN",
 * extract the two team abbreviations.
 */
export function extractTeamsFromGame(game: string): [string, string] | null {
  if (!game) return null;

  // Try "BOS @ NYK" format
  const atMatch = game.match(/([A-Z]{2,3})\s*[@vs]+\s*([A-Z]{2,3})/i);
  if (atMatch) return [atMatch[1].toUpperCase(), atMatch[2].toUpperCase()];

  // Try full team names
  const found: string[] = [];
  for (const [name, abbr] of Object.entries(TEAM_ALIASES)) {
    if (game.includes(name)) found.push(abbr);
    if (found.length === 2) break;
  }
  if (found.length === 2) return [found[0], found[1]];

  return null;
}

export const NBA_TEAM_IDS: Record<string, number> = {
  ATL: 1610612737, BOS: 1610612738, BKN: 1610612751, CHA: 1610612766,
  CHI: 1610612741, CLE: 1610612739, DAL: 1610612742, DEN: 1610612743,
  DET: 1610612765, GSW: 1610612744, HOU: 1610612745, IND: 1610612754,
  LAC: 1610612746, LAL: 1610612747, MEM: 1610612763, MIA: 1610612748,
  MIL: 1610612749, MIN: 1610612750, NOP: 1610612740, NYK: 1610612752,
  OKC: 1610612760, ORL: 1610612753, PHI: 1610612755, PHX: 1610612756,
  POR: 1610612757, SAC: 1610612758, SAS: 1610612759, TOR: 1610612761,
  UTA: 1610612762, WAS: 1610612764,
};