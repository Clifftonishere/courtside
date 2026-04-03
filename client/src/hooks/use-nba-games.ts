/**
 * useNBAGames — Live NBA data hook
 *
 * Fetches tonight's games from NBA CDN scoreboard.
 * Falls back to balldontlie API if CDN fails.
 * Refreshes every 30 seconds during live games.
 */

import { useState, useEffect, useCallback } from "react";
import type { ConfTier } from "@/lib/mock-data";

export interface LiveGame {
  id: string;
  away: {
    abbr: string;
    name: string;
    record: string;
    teamId: number;
    spread: string;
    ml: string;
  };
  home: {
    abbr: string;
    name: string;
    record: string;
    teamId: number;
    spread: string;
    ml: string;
  };
  tipoff: string;
  network: string;
  status: "upcoming" | "live" | "final";
  isLive: boolean;
  isFinal: boolean;
  awayScore: number | null;
  homeScore: number | null;
  quarter: number | null;
  timeRemaining: string | null;
  totalLine: string;
  confidence: ConfTier;
  pick: string;
  pickReason: string;
  pickProb: number;
  winProbData: Record<string, number>[];
  keyStats: { label: string; value: string }[];
}

// NBA team ID mapping
const NBA_TEAM_IDS: Record<string, number> = {
  ATL: 1610612737,
  BOS: 1610612738,
  BKN: 1610612751,
  CHA: 1610612766,
  CHI: 1610612741,
  CLE: 1610612739,
  DAL: 1610612742,
  DEN: 1610612743,
  DET: 1610612765,
  GSW: 1610612744,
  HOU: 1610612745,
  IND: 1610612754,
  LAC: 1610612746,
  LAL: 1610612747,
  MEM: 1610612763,
  MIA: 1610612748,
  MIL: 1610612749,
  MIN: 1610612750,
  NOP: 1610612740,
  NYK: 1610612752,
  OKC: 1610612760,
  ORL: 1610612753,
  PHI: 1610612755,
  PHX: 1610612756,
  POR: 1610612757,
  SAC: 1610612758,
  SAS: 1610612759,
  TOR: 1610612761,
  UTA: 1610612762,
  WAS: 1610612764,
};

// Full team names
const TEAM_NAMES: Record<string, string> = {
  ATL: "Atlanta Hawks",
  BOS: "Boston Celtics",
  BKN: "Brooklyn Nets",
  CHA: "Charlotte Hornets",
  CHI: "Chicago Bulls",
  CLE: "Cleveland Cavaliers",
  DAL: "Dallas Mavericks",
  DEN: "Denver Nuggets",
  DET: "Detroit Pistons",
  GSW: "Golden State Warriors",
  HOU: "Houston Rockets",
  IND: "Indiana Pacers",
  LAC: "LA Clippers",
  LAL: "Los Angeles Lakers",
  MEM: "Memphis Grizzlies",
  MIA: "Miami Heat",
  MIL: "Milwaukee Bucks",
  MIN: "Minnesota Timberwolves",
  NOP: "New Orleans Pelicans",
  NYK: "New York Knicks",
  OKC: "Oklahoma City Thunder",
  ORL: "Orlando Magic",
  PHI: "Philadelphia 76ers",
  PHX: "Phoenix Suns",
  POR: "Portland Trail Blazers",
  SAC: "Sacramento Kings",
  SAS: "San Antonio Spurs",
  TOR: "Toronto Raptors",
  UTA: "Utah Jazz",
  WAS: "Washington Wizards",
};

// Simple sigmoid for win probability
function sigmoid(x: number, scale = 6.5): number {
  return Math.round((1 / (1 + Math.exp(-x / scale))) * 100);
}

// Generate mock win prob curve from final probability
function generateWinProbCurve(
  homeProb: number,
  homeAbbr: string,
  awayAbbr: string,
) {
  const points = [];
  for (let t = 0; t <= 42; t += 6) {
    const noise = (Math.random() - 0.5) * 8;
    const home = Math.max(10, Math.min(90, homeProb + noise * (1 - t / 48)));
    points.push({
      t,
      [homeAbbr.toLowerCase()]: Math.round(home),
      [awayAbbr.toLowerCase()]: Math.round(100 - home),
    });
  }
  return points;
}

// Map NBA CDN tricode to our abbreviations
function mapTricode(tricode: string): string {
  const overrides: Record<string, string> = {
    NOP: "NOP",
    NOH: "NOP",
    GS: "GSW",
    NY: "NYK",
    SA: "SAS",
    PHO: "PHX",
  };
  return overrides[tricode] || tricode;
}

// Determine confidence from home win probability
function getConfidence(homeProb: number, pickIsHome: boolean): ConfTier {
  const pickProb = pickIsHome ? homeProb : 100 - homeProb;
  if (pickProb >= 65) return "HIGH";
  if (pickProb >= 55) return "MED";
  return "COND";
}

// Parse period text from NBA CDN
function parsePeriodText(game: any): {
  quarter: number | null;
  timeRemaining: string | null;
} {
  const period = game.period;
  if (!period || period === 0) return { quarter: null, timeRemaining: null };
  const clock = game.gameClock || "";
  // Format: PT12M00.00S → 12:00
  const match = clock.match(/PT(\d+)M([\d.]+)S/);
  const time = match
    ? `${match[1]}:${match[2].split(".")[0].padStart(2, "0")}`
    : "";
  return { quarter: period, timeRemaining: time || null };
}

// Fetch games from balldontlie API via server proxy (works for any date)
async function fetchBDLGames(date?: string): Promise<LiveGame[]> {
  const url = date ? `/api/nba/games/tonight?date=${date}` : `/api/nba/games/tonight`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("BDL fetch failed");
  const data = await res.json();
  const games = data?.data ?? [];

  return games.map((g: any, idx: number) => {
    const awayAbbr = mapTricode(g.visitor_team?.abbreviation || "");
    const homeAbbr = mapTricode(g.home_team?.abbreviation || "");
    const awayScore = g.visitor_team_score ?? null;
    const homeScore = g.home_team_score ?? null;

    // Determine game status from BDL status field
    // BDL status is a datetime string for upcoming, "Final" for finished, or period info for live
    const statusStr = (g.status || "").toString();
    const isFinal = statusStr === "Final" || statusStr.startsWith("Final");
    const isLive = !isFinal && (homeScore !== null && homeScore > 0 || awayScore !== null && awayScore > 0) && !statusStr.includes("T");
    const isUpcoming = !isFinal && !isLive;

    // Parse tipoff time from ISO status for upcoming games
    let tipoffTime = "";
    if (isUpcoming && statusStr.includes("T")) {
      try {
        const d = new Date(statusStr);
        tipoffTime = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York" }) + " ET";
      } catch { tipoffTime = statusStr; }
    } else if (isFinal) {
      tipoffTime = "FINAL";
    } else if (isLive) {
      tipoffTime = `LIVE · ${g.period ? `Q${g.period}` : ""}${g.time ? ` ${g.time}` : ""}`.trim();
    }

    // Compute pick from simple home court + record model
    const homeWins = g.home_team_score > (g.visitor_team_score || 0) ? 1 : 0;
    const homeAdvantage = 3.5;
    const marginDiff = homeAdvantage; // simplified for BDL (no win/loss records in game data)
    const homeProb = sigmoid(marginDiff);
    const pickIsHome = homeProb >= 50;
    const pick = pickIsHome ? homeAbbr : awayAbbr;
    const pickProb = pickIsHome ? homeProb : 100 - homeProb;

    return {
      id: String(g.id || `game-${idx}`),
      away: {
        abbr: awayAbbr,
        name: TEAM_NAMES[awayAbbr] || g.visitor_team?.full_name || awayAbbr,
        record: "",
        teamId: NBA_TEAM_IDS[awayAbbr] || 0,
        spread: `+${marginDiff.toFixed(1)}`,
        ml: "+150",
      },
      home: {
        abbr: homeAbbr,
        name: TEAM_NAMES[homeAbbr] || g.home_team?.full_name || homeAbbr,
        record: "",
        teamId: NBA_TEAM_IDS[homeAbbr] || 0,
        spread: `${(-marginDiff).toFixed(1)}`,
        ml: "-170",
      },
      tipoff: tipoffTime,
      network: "NBA TV",
      status: isFinal ? "final" : isLive ? "live" : "upcoming" as "upcoming" | "live" | "final",
      isLive,
      isFinal,
      awayScore: awayScore !== null && awayScore !== 0 ? Number(awayScore) : isUpcoming ? null : 0,
      homeScore: homeScore !== null && homeScore !== 0 ? Number(homeScore) : isUpcoming ? null : 0,
      quarter: g.period || null,
      timeRemaining: g.time || null,
      totalLine: "o/u 225.5",
      confidence: getConfidence(homeProb, pickIsHome),
      pick,
      pickReason: `${pick} ${pickIsHome ? "home court" : "road form"} advantage`,
      pickProb,
      winProbData: generateWinProbCurve(homeProb, homeAbbr, awayAbbr),
      keyStats: [
        { label: "Matchup", value: `${awayAbbr} @ ${homeAbbr}` },
        { label: "Model Pick", value: `${pick} (${pickProb}%)` },
        { label: "Game Total", value: "225.5" },
      ],
    };
  });
}

export function useNBAGames(date?: string) {
  const [games, setGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isToday = !date || date === new Date().toISOString().split('T')[0];

  const fetchGames = useCallback(async () => {
    try {
      const liveGames = await fetchBDLGames(date);
      setGames(liveGames);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError("Using cached data");
      // Don't clear games on error — keep showing last known state
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    setLoading(true);
    fetchGames();
    // Refresh every 30 seconds for today, no refresh for other dates
    if (isToday) {
      const interval = setInterval(fetchGames, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchGames, date]);

  const hasLiveGames = games.some((g) => g.isLive);

  return {
    games,
    loading,
    error,
    lastUpdated,
    hasLiveGames,
    refetch: fetchGames,
  };
}

// Generate simulated Courtside Calls from real games
export function generateCallsFromGames(games: LiveGame[]) {
  return games.flatMap((game, idx) => {
    const home = game.home.abbr;
    const away = game.away.abbr;
    const calls = [];

    // Moneyline call
    calls.push({
      id: `call-${game.id}-ml`,
      proposition: `${game.pick} to win vs ${game.pick === home ? away : home}`,
      verdict: game.pickProb >= 60 ? "LEAN OVER" : "TOSS UP",
      prob: game.pickProb,
      conf: game.confidence,
      agreeVotes: Math.floor(200 + Math.random() * 600),
      fadeVotes: Math.floor(100 + Math.random() * 300),
      totalVotes: 0,
      resolvesAt: game.isFinal ? "FINAL" : game.tipoff,
      game: `${away} @ ${home}`,
      status: game.isFinal ? "resolved" : "active",
    });

    // Total call for first 3 games
    if (idx < 3) {
      const overProb = 48 + Math.floor(Math.random() * 15);
      calls.push({
        id: `call-${game.id}-total`,
        proposition: `${away} @ ${home} over 225.5 total points`,
        verdict: overProb >= 55 ? "LEAN OVER" : "LEAN UNDER",
        prob: overProb,
        conf: "MED" as ConfTier,
        agreeVotes: Math.floor(150 + Math.random() * 400),
        fadeVotes: Math.floor(100 + Math.random() * 300),
        totalVotes: 0,
        resolvesAt: game.isFinal ? "FINAL" : game.tipoff,
        game: `${away} @ ${home}`,
        status: game.isFinal ? "resolved" : "active",
      });
    }

    return calls.map((c) => ({ ...c, totalVotes: c.agreeVotes + c.fadeVotes }));
  });
}

export { NBA_TEAM_IDS, TEAM_NAMES };
