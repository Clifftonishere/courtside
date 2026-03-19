import { ArrowLeft, Users, TrendingUp, Shield } from "lucide-react";
import { TeamLogo, PlayerHeadshot } from "@/components/TeamLogo";
import { PollCard } from "@/components/PollCard";
const NBA_TEAM_IDS: Record<string, number> = {
  ATL: 1610612737, BOS: 1610612738, BKN: 1610612751, CHA: 1610612766,
  CHI: 1610612741, CLE: 1610612739, DAL: 1610612742, DEN: 1610612743,
  DET: 1610612765, GSW: 1610612744, HOU: 1610612745, IND: 1610612754,
  LAC: 1610612746, LAL: 1610612747, MEM: 1610612763, MIA: 1610612748,
  MIL: 1610612749, MIN: 1610612750, NOP: 1610612740, NYK: 1610612752,
  OKC: 1610612760, ORL: 1610612753, PHI: 1610612755, PHX: 1610612756,
  POR: 1610612757, SAC: 1610612758, SAS: 1610612759, TOR: 1610612761,
  UTA: 1610612762, WAS: 1610612764,
};
import { ACTIVE_POLLS, PLAYERS, type ConfTier } from "@/lib/mock-data";

// Coaching tendencies per team
const COACHING_TENDENCIES: Record<string, { coach: string; style: string; notes: string[] }> = {
  BOS: { coach: "Joe Mazzulla", style: "Pace & Space", notes: ["Top-3 3PT attempt rate", "Switchable defense", "Thrives in high-pace games"] },
  NYK: { coach: "Mike Brown", style: "Defensive", notes: ["Iso-heavy offense through Brunson", "Physical perimeter defense", "Slow the pace, grind it out"] },
  LAL: { coach: "JJ Redick", style: "Pace & Space", notes: ["Luka-centric offense", "Struggles defending PnR", "Live-or-die by 3PT shooting"] },
  DEN: { coach: "David Adelman", style: "Balanced", notes: ["Jokic orchestrates everything", "Excellent transition D", "Patient half-court sets"] },
  GSW: { coach: "Steve Kerr", style: "Motion Offense", notes: ["Off-ball movement, ghost screens", "Elite late-game adjustments", "Pace drops in playoff settings"] },
  MIN: { coach: "Chris Finch", style: "Balanced", notes: ["Ant isolation + Gobert PnR", "Top-5 defense when locked in", "High variance on offense"] },
  MIL: { coach: "Doc Rivers", style: "Balanced", notes: ["Giannis-dominant paint attacks", "Inconsistent 3PT rotation", "Big lineup = slow pace"] },
  PHX: { coach: "Jordan Ott", style: "Balanced", notes: ["Rebuilding, experimental lineups", "Poor late-game execution", "Low defensive intensity"] },
  DAL: { coach: "Jason Kidd", style: "Defensive", notes: ["Luka ball-dominant, long possessions", "Struggles away from home", "Good late-game Xs and Os"] },
  CLE: { coach: "Kenny Atkinson", style: "Pace & Space", notes: ["Garland + Mitchell shooting gravity", "Best home record in East", "High-assist offense"] },
  MIA: { coach: "Erik Spoelstra", style: "Defensive", notes: ["Heat Culture = maximum effort", "Butler-led crunch time", "Exceptional late-game schemes"] },
  TOR: { coach: "Darko Rajakovic", style: "Development", notes: ["Young roster, high energy", "Inconsistent defensive rotations", "Pace-and-space approach"] },
};

// Mock last 5 games per notable player
const MOCK_GAME_LOGS: Record<string, { opp: string; pts: number; reb: number; ast: number }[]> = {
  "Jalen Brunson": [
    { opp: "BOS", pts: 34, reb: 3, ast: 7 }, { opp: "MIA", pts: 28, reb: 4, ast: 8 },
    { opp: "PHI", pts: 31, reb: 2, ast: 6 }, { opp: "ATL", pts: 26, reb: 3, ast: 9 },
    { opp: "ORL", pts: 29, reb: 2, ast: 7 },
  ],
  "Nikola Jokic": [
    { opp: "LAL", pts: 33, reb: 14, ast: 11 }, { opp: "GSW", pts: 28, reb: 12, ast: 9 },
    { opp: "MIN", pts: 31, reb: 10, ast: 8 }, { opp: "PHX", pts: 24, reb: 15, ast: 10 },
    { opp: "OKC", pts: 27, reb: 13, ast: 12 },
  ],
  "Anthony Edwards": [
    { opp: "GSW", pts: 38, reb: 6, ast: 4 }, { opp: "DEN", pts: 31, reb: 5, ast: 6 },
    { opp: "LAL", pts: 34, reb: 4, ast: 5 }, { opp: "OKC", pts: 29, reb: 7, ast: 3 },
    { opp: "HOU", pts: 36, reb: 5, ast: 4 },
  ],
};

const PLAYER_IDS_MAP: Record<string, number> = {
  "Jalen Brunson": 1628384, "Karl-Anthony Towns": 1626157, "OG Anunoby": 1628371,
  "Nikola Jokic": 203999, "Jamal Murray": 1627750, "Michael Porter Jr.": 1629008,
  "Anthony Edwards": 1630162, "Rudy Gobert": 203497, "Jaden McDaniels": 1630183,
  "LeBron James": 2544, "Austin Reaves": 1630559, "Luka Doncic": 1629029,
  "Stephen Curry": 201939, "Jonathan Kuminga": 1630228, "Brandin Podziemski": 1641730,
  "Jalen Green": 1630224, "Alperen Sengun": 1631167, "Kevin Durant": 201142,
};

// Notable players per team
const TEAM_NOTABLES: Record<string, string[]> = {
  BOS: ["Jayson Tatum", "Jaylen Brown", "Jrue Holiday"],
  NYK: ["Jalen Brunson", "Karl-Anthony Towns", "OG Anunoby"],
  LAL: ["Luka Doncic", "LeBron James", "Austin Reaves"],
  DEN: ["Nikola Jokic", "Jamal Murray", "Michael Porter Jr."],
  GSW: ["Stephen Curry", "Jonathan Kuminga", "Brandin Podziemski"],
  MIN: ["Anthony Edwards", "Rudy Gobert", "Jaden McDaniels"],
  MIL: ["Giannis Antetokounmpo", "Damian Lillard", "Khris Middleton"],
  PHX: ["Jalen Green", "Kevin Durant", "Devin Booker"],
  DAL: ["Luka Doncic", "Kyrie Irving", "PJ Washington"],
  CLE: ["Donovan Mitchell", "Darius Garland", "Evan Mobley"],
  MIA: ["Jimmy Butler", "Bam Adebayo", "Tyler Herro"],
  TOR: ["Scottie Barnes", "Immanuel Quickley", "RJ Barrett"],
};

// Team offensive/defensive ratings (mock)
const TEAM_RATINGS: Record<string, { offRtg: number; defRtg: number; netRtg: number; pace: number }> = {
  BOS: { offRtg: 119.2, defRtg: 108.4, netRtg: 10.8, pace: 99.1 },
  NYK: { offRtg: 114.8, defRtg: 111.2, netRtg: 3.6, pace: 96.4 },
  LAL: { offRtg: 112.1, defRtg: 114.8, netRtg: -2.7, pace: 98.2 },
  DEN: { offRtg: 117.4, defRtg: 110.2, netRtg: 7.2, pace: 97.8 },
  GSW: { offRtg: 113.2, defRtg: 115.4, netRtg: -2.2, pace: 100.1 },
  MIN: { offRtg: 114.6, defRtg: 108.9, netRtg: 5.7, pace: 96.8 },
  MIL: { offRtg: 115.1, defRtg: 112.4, netRtg: 2.7, pace: 97.2 },
  PHX: { offRtg: 111.8, defRtg: 116.2, netRtg: -4.4, pace: 98.8 },
  DAL: { offRtg: 113.4, defRtg: 113.1, netRtg: 0.3, pace: 97.0 },
  CLE: { offRtg: 116.8, defRtg: 108.1, netRtg: 8.7, pace: 96.2 },
  MIA: { offRtg: 112.4, defRtg: 110.8, netRtg: 1.6, pace: 95.8 },
  TOR: { offRtg: 109.2, defRtg: 116.4, netRtg: -7.2, pace: 99.4 },
};

type Game = {
  id: string;
  away: { abbr: string; name: string; record: string; teamId?: number; spread: string; ml: string };
  home: { abbr: string; name: string; record: string; teamId?: number; spread: string; ml: string };
  tipoff: string; network: string; status: string; isLive: boolean; isFinal: boolean;
  awayScore: number | null; homeScore: number | null;
  quarter: number | null; timeRemaining: string | null;
  totalLine: string; confidence: ConfTier; pick: string; pickReason: string; pickProb: number;
};

interface GameDetailProps {
  game: Game;
  onBack: () => void;
}

function TeamSection({ abbr, name, record, teamId }: { abbr: string; name: string; record: string; teamId: number }) {
  const notables = TEAM_NOTABLES[abbr] || [];
  const ratings = TEAM_RATINGS[abbr] || { offRtg: 112, defRtg: 112, netRtg: 0, pace: 98 };
  const coaching = COACHING_TENDENCIES[abbr];

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
      {/* Team header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E0E0E0] bg-[#F5F5F5]">
        <TeamLogo abbr={abbr} teamId={teamId} size={36} />
        <div>
          <div className="font-condensed font-bold text-[16px] text-[#111] uppercase">{abbr}</div>
          <div className="font-mono text-[11px] text-[#888]">{record}</div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Ratings */}
        <div>
          <div className="font-condensed font-bold text-[10px] uppercase text-[#888] tracking-[0.5px] mb-2 flex items-center gap-1.5">
            <TrendingUp size={10} /> Team Ratings
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "OFF RTG", value: ratings.offRtg, good: ratings.offRtg > 114 },
              { label: "DEF RTG", value: ratings.defRtg, good: ratings.defRtg < 111 },
              { label: "NET RTG", value: ratings.netRtg > 0 ? `+${ratings.netRtg}` : ratings.netRtg, good: ratings.netRtg > 0 },
              { label: "PACE", value: ratings.pace, good: null },
            ].map((r) => (
              <div key={r.label} className="text-center bg-[#F5F5F5] rounded-sm py-2">
                <div className={`font-mono font-bold text-[13px] ${r.good === true ? "text-[#008248]" : r.good === false ? "text-[#C8102E]" : "text-[#1D428A]"}`}>
                  {r.value}
                </div>
                <div className="font-condensed font-bold text-[9px] uppercase text-[#AAA] tracking-[0.5px] mt-0.5">{r.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Notable players */}
        <div>
          <div className="font-condensed font-bold text-[10px] uppercase text-[#888] tracking-[0.5px] mb-2 flex items-center gap-1.5">
            <Users size={10} /> Players to Watch
          </div>
          <div className="space-y-2">
            {notables.slice(0, 3).map((name) => {
              const pid = PLAYER_IDS_MAP[name] || 0;
              const log = MOCK_GAME_LOGS[name];
              const lastGame = log?.[0];
              return (
                <div key={name} className="flex items-center gap-2.5 p-2 bg-[#F5F5F5] rounded-sm">
                  <PlayerHeadshot playerId={pid} playerName={name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="font-sans font-semibold text-[12px] text-[#111] truncate">{name}</div>
                    {lastGame && (
                      <div className="font-mono text-[10px] text-[#888]">
                        L1: {lastGame.pts}pts / {lastGame.reb}reb / {lastGame.ast}ast vs {lastGame.opp}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coaching */}
        {coaching && (
          <div>
            <div className="font-condensed font-bold text-[10px] uppercase text-[#888] tracking-[0.5px] mb-2 flex items-center gap-1.5">
              <Shield size={10} /> Coaching Tendency
            </div>
            <div className="bg-[#F5F5F5] rounded-sm p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-sans font-semibold text-[12px] text-[#111]">{coaching.coach}</span>
                <span className="font-condensed font-bold text-[9px] uppercase text-[#1D428A] bg-[#1D428A15] px-1.5 py-0.5 rounded-sm tracking-[0.5px]">{coaching.style}</span>
              </div>
              <ul className="space-y-1">
                {coaching.notes.map((note, i) => (
                  <li key={i} className="font-sans text-[11px] text-[#666] flex items-start gap-1.5">
                    <span className="text-[#1D428A] mt-0.5 flex-shrink-0">·</span>{note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function GameDetail({ game, onBack }: GameDetailProps) {
  const awayAbbr = game.away.abbr;
  const homeAbbr = game.home.abbr;

  // Filter polls related to this game
  const gamePollText = `${awayAbbr} @ ${homeAbbr}`;
  const relatedPolls = [...ACTIVE_POLLS]
    .filter(p => p.game === gamePollText || p.game.includes(awayAbbr) || p.game.includes(homeAbbr))
    .sort((a, b) => b.totalVotes - a.totalVotes)
    .slice(0, 5);

  const confColors: Record<string, { color: string; bg: string }> = {
    HIGH: { color: "#008248", bg: "#dcfce7" },
    MED: { color: "#F5A623", bg: "#fef3c7" },
    COND: { color: "#888", bg: "#F5F5F5" },
  };
  const conf = confColors[game.confidence];

  return (
    <div className="min-h-screen bg-white">
      {/* Game hero header */}
      <div className="border-b border-[#E0E0E0] bg-[#111]">
        <div className="max-w-[1280px] mx-auto px-4 py-5">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 font-condensed font-bold text-[11px] uppercase tracking-[0.5px] text-white/40 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={12} /> Back to Tonight
          </button>

          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Away team */}
            <div className="flex items-center gap-4">
              <TeamLogo abbr={awayAbbr} teamId={game.away.teamId || NBA_TEAM_IDS[awayAbbr] || 0} size={56} />
              <div>
                <div className="font-condensed font-bold text-[32px] text-white uppercase leading-none">{awayAbbr}</div>
                <div className="font-mono text-[12px] text-white/40">{game.away.record}</div>
              </div>
            </div>

            {/* Score / tipoff */}
            <div className="text-center">
              {game.isLive || game.isFinal ? (
                <div className="flex items-center gap-4">
                  <span className={`font-mono font-bold text-[44px] ${(game.awayScore ?? 0) < (game.homeScore ?? 0) ? "text-white/40" : "text-white"}`}>
                    {game.awayScore}
                  </span>
                  <span className="font-mono text-white/20 text-[24px]">—</span>
                  <span className={`font-mono font-bold text-[44px] ${(game.homeScore ?? 0) < (game.awayScore ?? 0) ? "text-white/40" : "text-white"}`}>
                    {game.homeScore}
                  </span>
                </div>
              ) : (
                <div className="font-mono text-[20px] text-white/60">{game.tipoff}</div>
              )}
              <div className="font-mono text-[11px] text-white/30 mt-1">{game.network} · {game.totalLine}</div>
              {game.isLive && (
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className="relative w-2 h-2">
                    <span className="absolute inset-0 rounded-full bg-[#C8102E]" />
                    <span className="absolute inset-0 rounded-full bg-[#C8102E] animate-ping opacity-75" />
                  </span>
                  <span className="font-condensed font-bold text-[11px] text-[#C8102E] uppercase tracking-[0.5px]">
                    LIVE · Q{game.quarter} {game.timeRemaining}
                  </span>
                </div>
              )}
            </div>

            {/* Home team */}
            <div className="flex items-center gap-4 flex-row-reverse">
              <TeamLogo abbr={homeAbbr} teamId={game.home.teamId || NBA_TEAM_IDS[homeAbbr] || 0} size={56} />
              <div className="text-right">
                <div className="font-condensed font-bold text-[32px] text-white uppercase leading-none">{homeAbbr}</div>
                <div className="font-mono text-[12px] text-white/40">{game.home.record}</div>
              </div>
            </div>
          </div>

          {/* Pick strip */}
          <div className="mt-4 flex items-center gap-3 pt-4 border-t border-white/10">
            <span className="font-condensed font-bold text-[10px] uppercase text-white/30 tracking-[0.5px]">Courtside Pick</span>
            <span className="font-condensed font-bold text-[13px] uppercase" style={{ color: conf.color }}>{game.pick}</span>
            <span className="font-sans text-[11px] text-white/40">{game.pickReason}</span>
            <span
              className="ml-auto font-condensed font-bold text-[10px] uppercase px-1.5 py-0.5 rounded-sm tracking-[0.5px]"
              style={{ color: conf.color, background: `${conf.color}25` }}
            >
              {game.confidence} · {game.pickProb}%
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Team breakdowns */}
          <div className="lg:col-span-2 space-y-4">
            <div className="font-condensed font-bold text-[13px] uppercase text-[#111] tracking-[0.5px] mb-1">Team Breakdown</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TeamSection
                abbr={awayAbbr} name={game.away.name}
                record={game.away.record}
                teamId={game.away.teamId || NBA_TEAM_IDS[awayAbbr] || 0}
              />
              <TeamSection
                abbr={homeAbbr} name={game.home.name}
                record={game.home.record}
                teamId={game.home.teamId || NBA_TEAM_IDS[homeAbbr] || 0}
              />
            </div>
          </div>

          {/* Right: Top polls */}
          <div>
            <div className="font-condensed font-bold text-[13px] uppercase text-[#111] tracking-[0.5px] mb-3">
              Top Calls — {awayAbbr} @ {homeAbbr}
            </div>
            {relatedPolls.length > 0 ? (
              <div className="space-y-3">
                {relatedPolls.map((poll) => (
                  <PollCard key={poll.id} poll={poll} compact />
                ))}
              </div>
            ) : (
              <div className="bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg p-4 text-center">
                <p className="font-sans text-[12px] text-[#888]">No active calls for this game yet.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
