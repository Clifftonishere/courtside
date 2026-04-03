import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { ConfTier } from "@/lib/mock-data";
import { TeamLogo } from "@/components/TeamLogo";

type Game = {
  id: string;
  away: { abbr: string; name: string; record: string; teamId?: number; spread: string; ml: string };
  home: { abbr: string; name: string; record: string; teamId?: number; spread: string; ml: string };
  tipoff: string; network: string; status: string;
  isLive: boolean; isFinal: boolean;
  awayScore: number | null; homeScore: number | null;
  quarter: number | null; timeRemaining: string | null;
  totalLine: string; confidence: ConfTier;
  pick: string; pickReason: string; pickProb: number;
  winProbData: Record<string, number>[];
  keyStats: { label: string; value: string }[];
};

const CONF_COLORS: Record<ConfTier, { color: string; bg: string }> = {
  HIGH: { color: "#008248", bg: "#dcfce7" },
  MED: { color: "#F5A623", bg: "#fef3c7" },
  COND: { color: "#888", bg: "#F5F5F5" },
};

// Mock game leaders per game id
const GAME_LEADERS: Record<string, { away: { name: string; pts: number; reb: number; ast: number }; home: { name: string; pts: number; reb: number; ast: number } }> = {
  g1: { away: { name: "J. Brown", pts: 28, reb: 6, ast: 3 }, home: { name: "J. Brunson", pts: 31, reb: 4, ast: 8 } },
  g2: { away: { name: "L. James", pts: 22, reb: 8, ast: 7 }, home: { name: "N. Jokic", pts: 33, reb: 14, ast: 11 } },
  g3: { away: { name: "S. Curry", pts: 24, reb: 4, ast: 6 }, home: { name: "A. Edwards", pts: 38, reb: 6, ast: 4 } },
  g4: { away: { name: "Giannis", pts: 32, reb: 11, ast: 5 }, home: { name: "D. Booker", pts: 26, reb: 5, ast: 7 } },
  g5: { away: { name: "L. Doncic", pts: 29, reb: 8, ast: 9 }, home: { name: "D. Mitchell", pts: 31, reb: 4, ast: 6 } },
  g6: { away: { name: "J. Butler", pts: 24, reb: 7, ast: 5 }, home: { name: "I. Quickley", pts: 22, reb: 3, ast: 8 } },
};

// Mock top market per game
const GAME_TOP_MARKET: Record<string, { proposition: string; prob: number; conf: ConfTier; agreeVotes: number; fadeVotes: number }> = {
  g1: { proposition: "Brunson over 30 pts", prob: 42, conf: "MED", agreeVotes: 234, fadeVotes: 189 },
  g2: { proposition: "Jokic triple-double", prob: 61, conf: "HIGH", agreeVotes: 567, fadeVotes: 312 },
  g3: { proposition: "Edwards scores 28+", prob: 63, conf: "HIGH", agreeVotes: 445, fadeVotes: 198 },
  g4: { proposition: "Giannis over 30.5 pts", prob: 61, conf: "MED", agreeVotes: 312, fadeVotes: 189 },
  g5: { proposition: "CLE wins by 8+", prob: 55, conf: "MED", agreeVotes: 223, fadeVotes: 134 },
  g6: { proposition: "MIA wins by 5+", prob: 48, conf: "COND", agreeVotes: 156, fadeVotes: 201 },
};

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const [expanded, setExpanded] = useState(false);
  const conf = CONF_COLORS[game.confidence];
  const homeKey = game.home.abbr.toLowerCase();
  const awayKey = game.away.abbr.toLowerCase();
  const chartData = game.winProbData.map((d) => ({
    t: d.t, home: d[homeKey] ?? 50, away: d[awayKey] ?? 50,
  }));
  const homeWinProb = chartData[chartData.length - 1]?.home ?? 50;
  const leaders = GAME_LEADERS[game.id];
  const topPoll = GAME_TOP_MARKET[game.id];
  const awayId = game.away.teamId || 0;
  const homeId = game.home.teamId || 0;

  const agreePct = topPoll ? Math.round((topPoll.agreeVotes / (topPoll.agreeVotes + topPoll.fadeVotes)) * 100) : 0;

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden hover:border-[#1D428A] transition-colors"
      data-testid={`card-game-${game.id}`}>

      {/* Top bar: network + status + conf badge */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-condensed font-semibold text-[11px] uppercase text-[#888] tracking-[0.5px]">{game.network}</span>
          {game.isLive ? (
            <span className="flex items-center gap-1">
              <span className="relative w-2 h-2 flex-shrink-0">
                <span className="absolute inset-0 rounded-full bg-[#C8102E]" />
                <span className="absolute inset-0 rounded-full bg-[#C8102E] animate-ping opacity-75" />
              </span>
              <span className="font-condensed font-bold text-[#C8102E] text-[11px] uppercase tracking-[0.5px]">
                LIVE · Q{game.quarter} {game.timeRemaining}
              </span>
            </span>
          ) : game.isFinal ? (
            <span className="font-condensed font-semibold text-[11px] text-[#888] uppercase">FINAL</span>
          ) : (
            <span className="font-mono text-[11px] text-[#888]">{game.tipoff}</span>
          )}
        </div>
        <span className="font-condensed font-bold text-[10px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-sm"
          style={{ color: conf.color, background: conf.bg }}>{game.confidence}</span>
      </div>

      {/* Scoreboard row — NBA.com style */}
      <div className="px-4 pb-3">
        <div className="flex items-center">

          {/* Away team */}
          <div className="flex items-center gap-2.5 flex-1">
            <TeamLogo abbr={game.away.abbr} teamId={awayId} size={36} />
            <div>
              <div className="font-condensed font-bold text-[18px] text-[#111] uppercase leading-none">{game.away.abbr}</div>
              <div className="font-mono text-[10px] text-[#888]">{game.away.record}</div>
            </div>
          </div>

          {/* Score / vs */}
          <div className="flex flex-col items-center px-3 min-w-[80px]">
            {(game.isLive || game.isFinal) && game.awayScore !== null ? (
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold text-[28px] leading-none ${game.awayScore < (game.homeScore ?? 0) ? "text-[#999]" : "text-[#111]"}`}>
                  {game.awayScore}
                </span>
                <span className="font-mono text-[#CCC] text-[18px]">—</span>
                <span className={`font-mono font-bold text-[28px] leading-none ${(game.homeScore ?? 0) < (game.awayScore ?? 0) ? "text-[#999]" : "text-[#111]"}`}>
                  {game.homeScore}
                </span>
              </div>
            ) : (
              <span className="font-mono text-[15px] text-[#CCC]">vs</span>
            )}
            <div className="font-mono text-[9px] text-[#AAA] mt-0.5">{game.totalLine}</div>
          </div>

          {/* Home team */}
          <div className="flex items-center gap-2.5 flex-1 flex-row-reverse">
            <TeamLogo abbr={game.home.abbr} teamId={homeId} size={36} />
            <div className="text-right">
              <div className="font-condensed font-bold text-[18px] text-[#111] uppercase leading-none">{game.home.abbr}</div>
              <div className="font-mono text-[10px] text-[#888]">{game.home.record}</div>
            </div>
          </div>
        </div>

        {/* Game leaders row — NBA.com style */}
        {leaders && (
          <div className="mt-2.5 pt-2.5 border-t border-[#F0F0F0] grid grid-cols-2 gap-2">
            <div>
              <div className="font-condensed font-bold text-[9px] uppercase text-[#AAA] tracking-[0.5px] mb-1">{game.away.abbr} Leader</div>
              <div className="flex items-center gap-1.5">
                <div className="font-sans font-semibold text-[12px] text-[#111]">{leaders.away.name}</div>
                <div className="font-mono text-[10px] text-[#888]">{leaders.away.pts}P · {leaders.away.reb}R · {leaders.away.ast}A</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-condensed font-bold text-[9px] uppercase text-[#AAA] tracking-[0.5px] mb-1">{game.home.abbr} Leader</div>
              <div className="flex items-center gap-1.5 justify-end">
                <div className="font-mono text-[10px] text-[#888]">{leaders.home.pts}P · {leaders.home.reb}R · {leaders.home.ast}A</div>
                <div className="font-sans font-semibold text-[12px] text-[#111]">{leaders.home.name}</div>
              </div>
            </div>
          </div>
        )}

        {/* Pick row */}
        <div className="mt-2.5 pt-2.5 border-t border-[#F0F0F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-condensed font-bold text-[10px] uppercase text-[#888] tracking-[0.5px]">Pick</span>
            <span className="font-condensed font-bold text-[12px] uppercase" style={{ color: conf.color }}>{game.pick}</span>
            <span className="font-sans text-[11px] text-[#888] truncate max-w-[140px]">{game.pickReason}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-[12px] text-[#1D428A]">{game.pickProb}%</span>
            <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              data-testid={`btn-expand-${game.id}`}
              className="flex items-center gap-1 font-condensed font-semibold text-[10px] uppercase text-[#888] hover:text-[#1D428A] transition-colors tracking-[0.5px]">
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? "Less" : "More"}
            </button>
          </div>
        </div>

        {/* Top market preview */}
        {topPoll && (
          <div className="mt-2.5 pt-2.5 border-t border-[#F0F0F0]">
            <div className="font-condensed font-bold text-[9px] uppercase text-[#AAA] tracking-[0.5px] mb-1.5">Top Market</div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-sans text-[11px] text-[#444] flex-1 truncate">{topPoll.proposition}</span>
              <span className="font-mono font-semibold text-[11px] flex-shrink-0" style={{ color: topPoll.prob >= 55 ? "#008248" : "#888" }}>{topPoll.prob}%</span>
            </div>
            <div className="mt-1.5">
              <div className="flex h-1.5 rounded-full overflow-hidden bg-[#F0F0F0]">
                <div className="bg-[#1D428A] transition-all" style={{ width: `${agreePct}%` }} />
                <div className="bg-[#E0E0E0]" style={{ width: `${100 - agreePct}%` }} />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="font-mono text-[9px] text-[#1D428A]">AGREE {agreePct}%</span>
                <span className="font-mono text-[9px] text-[#888]">{(topPoll.agreeVotes + topPoll.fadeVotes).toLocaleString()} votes</span>
                <span className="font-mono text-[9px] text-[#888]">FADE {100 - agreePct}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-[#E0E0E0] bg-[#F5F5F5] px-4 py-4" onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="font-condensed font-bold text-[10px] uppercase text-[#888] tracking-[0.5px] mb-2">Win Probability Model</div>
              <div className="h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <XAxis dataKey="t" hide />
                    <Tooltip contentStyle={{ background: "#111", border: "none", borderRadius: 4, fontSize: 11 }}
                      itemStyle={{ color: "#fff" }} formatter={(v: number) => [`${v}%`]} />
                    <Area type="monotone" dataKey="home" stroke="#1D428A" fill="#1D428A22" strokeWidth={2} dot={false} name={game.home.abbr} />
                    <Area type="monotone" dataKey="away" stroke="#C8102E" fill="#C8102E11" strokeWidth={1.5} dot={false} name={game.away.abbr} strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1.5"><div className="w-5 h-0.5 bg-[#1D428A]" />
                  <span className="font-condensed font-semibold text-[10px] uppercase text-[#888]">{game.home.abbr} {homeWinProb}%</span></div>
                <div className="flex items-center gap-1.5"><div className="w-5 h-[1.5px] bg-[#C8102E] opacity-70" />
                  <span className="font-condensed font-semibold text-[10px] uppercase text-[#888]">{game.away.abbr} {100 - homeWinProb}%</span></div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="font-condensed font-bold text-[10px] uppercase text-[#888] tracking-[0.5px] mb-2">Key Metrics</div>
                <div className="space-y-1">
                  {game.keyStats.map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between py-1 border-b border-[#E0E0E0]">
                      <span className="font-sans text-[11px] text-[#555]">{stat.label}</span>
                      <span className="font-mono text-[11px] font-semibold text-[#111]">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-condensed font-bold text-[10px] uppercase text-[#888] tracking-[0.5px] mb-2">Market Odds</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white border border-[#E0E0E0] rounded-sm p-2">
                    <div className="font-condensed font-bold text-[10px] uppercase text-[#888] tracking-[0.5px]">{game.away.abbr}</div>
                    <div className="font-mono font-semibold text-[13px] text-[#111]">{game.away.spread}</div>
                    <div className="font-mono text-[10px] text-[#888]">ML {game.away.ml}</div>
                  </div>
                  <div className="bg-white border border-[#E0E0E0] rounded-sm p-2">
                    <div className="font-condensed font-bold text-[10px] uppercase text-[#888] tracking-[0.5px]">{game.home.abbr}</div>
                    <div className="font-mono font-semibold text-[13px] text-[#111]">{game.home.spread}</div>
                    <div className="font-mono text-[10px] text-[#888]">ML {game.home.ml}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="font-sans text-[10px] text-[#AAA] mt-3">Educational analysis only — not financial advice.</p>
        </div>
      )}
    </div>
  );
}
