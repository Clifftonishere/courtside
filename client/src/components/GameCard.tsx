import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { ConfTier } from "@/lib/mock-data";

type Game = {
  id: string;
  away: { abbr: string; name: string; record: string; spread: string; ml: string };
  home: { abbr: string; name: string; record: string; spread: string; ml: string };
  tipoff: string;
  network: string;
  status: string;
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
};

const CONF_COLORS: Record<ConfTier, { color: string; bg: string }> = {
  HIGH: { color: "#008248", bg: "#dcfce7" },
  MED: { color: "#F5A623", bg: "#fef3c7" },
  COND: { color: "#888", bg: "#F5F5F5" },
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
    t: d.t,
    home: d[homeKey] ?? 50,
    away: d[awayKey] ?? 50,
  }));

  const homeWinProb = chartData[chartData.length - 1]?.home ?? 50;

  return (
    <div
      className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden hover:border-[#1D428A] transition-colors"
      data-testid={`card-game-${game.id}`}
    >
      {/* Main row */}
      <div className="px-4 py-3">
        {/* Top: network + status + pick badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-condensed font-semibold text-[11px] uppercase text-[#888] tracking-[0.5px]">{game.network}</span>
            {game.isLive ? (
              <span className="flex items-center gap-1">
                <span className="relative w-2 h-2 flex-shrink-0">
                  <span className="absolute inset-0 rounded-full bg-[#C8102E]" />
                  <span className="absolute inset-0 rounded-full bg-[#C8102E] live-dot" />
                </span>
                <span className="font-condensed font-bold text-[#C8102E] text-[11px] uppercase tracking-[0.5px]">
                  LIVE · Q{game.quarter} {game.timeRemaining}
                </span>
              </span>
            ) : game.isFinal ? (
              <span className="font-condensed font-semibold text-[11px] text-[#888] uppercase tracking-[0.5px]">FINAL</span>
            ) : (
              <span className="font-mono text-[11px] text-[#888]">{game.tipoff}</span>
            )}
          </div>
          <span
            className="font-condensed font-bold text-[10px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-sm"
            style={{ color: conf.color, background: conf.bg, borderRadius: 4 }}
          >
            {game.confidence}
          </span>
        </div>

        {/* Matchup */}
        <div className="flex items-center justify-between">
          {/* Away team */}
          <div className="flex-1 flex flex-col items-start gap-0.5">
            <div className="font-condensed font-bold text-[22px] text-[#111] uppercase leading-none">
              {game.away.abbr}
            </div>
            <div className="font-mono text-[11px] text-[#888]">{game.away.record}</div>
          </div>

          {/* Score or tipoff */}
          <div className="flex flex-col items-center gap-1 px-4">
            {(game.isLive || game.isFinal) && game.awayScore !== null ? (
              <div className="flex items-center gap-3">
                <span className={`font-mono font-bold text-[28px] ${game.awayScore < (game.homeScore ?? 0) ? "text-[#888]" : "text-[#111]"}`}>
                  {game.awayScore}
                </span>
                <span className="font-mono text-[#CCC] text-[18px]">—</span>
                <span className={`font-mono font-bold text-[28px] ${game.homeScore! < (game.awayScore ?? 0) ? "text-[#888]" : "text-[#111]"}`}>
                  {game.homeScore}
                </span>
              </div>
            ) : (
              <span className="font-mono text-[14px] text-[#CCC]">vs</span>
            )}
            <div className="font-mono text-[10px] text-[#AAA]">{game.totalLine}</div>
          </div>

          {/* Home team */}
          <div className="flex-1 flex flex-col items-end gap-0.5">
            <div className="font-condensed font-bold text-[22px] text-[#111] uppercase leading-none">
              {game.home.abbr}
            </div>
            <div className="font-mono text-[11px] text-[#888]">{game.home.record}</div>
          </div>
        </div>

        {/* Pick row */}
        <div className="mt-3 pt-3 border-t border-[#F0F0F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-condensed font-bold text-[11px] uppercase text-[#888] tracking-[0.5px]">Pick</span>
            <span
              className="font-condensed font-bold text-[13px] uppercase"
              style={{ color: conf.color }}
            >
              {game.pick}
            </span>
            <span className="font-sans text-[11px] text-[#888]">{game.pickReason}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-[13px] text-[#1D428A]">{game.pickProb}%</span>
            <button
              onClick={() => setExpanded(!expanded)}
              data-testid={`btn-expand-${game.id}`}
              className="flex items-center gap-1 font-condensed font-semibold text-[11px] uppercase text-[#888] hover:text-[#1D428A] transition-colors tracking-[0.5px]"
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {expanded ? "Less" : "More"}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-[#E0E0E0] bg-[#F5F5F5] px-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Win probability chart */}
            <div>
              <div className="font-condensed font-bold text-[11px] uppercase text-[#888] tracking-[0.5px] mb-2">
                Win Probability Model
              </div>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <XAxis dataKey="t" hide />
                    <Tooltip
                      contentStyle={{ background: "#111", border: "none", borderRadius: 4, fontSize: 11, fontFamily: "var(--font-mono)" }}
                      labelStyle={{ color: "#999" }}
                      itemStyle={{ color: "#fff" }}
                      formatter={(v: number) => [`${v}%`]}
                    />
                    <Area type="monotone" dataKey="home" stroke="#1D428A" fill="#1D428A22" strokeWidth={2} dot={false} name={game.home.abbr} />
                    <Area type="monotone" dataKey="away" stroke="#C8102E" fill="#C8102E11" strokeWidth={1.5} dot={false} name={game.away.abbr} strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-0.5 bg-[#1D428A]" />
                  <span className="font-condensed font-semibold text-[11px] uppercase text-[#888]">{game.home.abbr} {homeWinProb}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-[1.5px] bg-[#C8102E] opacity-70" style={{ backgroundImage: "repeating-linear-gradient(90deg, #C8102E 0, #C8102E 4px, transparent 4px, transparent 6px)" }} />
                  <span className="font-condensed font-semibold text-[11px] uppercase text-[#888]">{game.away.abbr} {100 - homeWinProb}%</span>
                </div>
              </div>
            </div>

            {/* Key stats + odds */}
            <div className="space-y-3">
              <div>
                <div className="font-condensed font-bold text-[11px] uppercase text-[#888] tracking-[0.5px] mb-2">
                  Key Metrics
                </div>
                <div className="space-y-1.5">
                  {game.keyStats.map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between py-1 border-b border-[#E0E0E0]">
                      <span className="font-sans text-[12px] text-[#555]">{stat.label}</span>
                      <span className="font-mono text-[12px] font-semibold text-[#111]">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-condensed font-bold text-[11px] uppercase text-[#888] tracking-[0.5px] mb-2">
                  Market Odds
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white border border-[#E0E0E0] rounded-sm p-2">
                    <div className="font-condensed font-bold text-[11px] uppercase text-[#888] tracking-[0.5px]">{game.away.abbr} Spread</div>
                    <div className="font-mono font-semibold text-[14px] text-[#111]">{game.away.spread}</div>
                    <div className="font-mono text-[11px] text-[#888]">ML {game.away.ml}</div>
                  </div>
                  <div className="bg-white border border-[#E0E0E0] rounded-sm p-2">
                    <div className="font-condensed font-bold text-[11px] uppercase text-[#888] tracking-[0.5px]">{game.home.abbr} Spread</div>
                    <div className="font-mono font-semibold text-[14px] text-[#111]">{game.home.spread}</div>
                    <div className="font-mono text-[11px] text-[#888]">ML {game.home.ml}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="font-sans text-[11px] text-[#AAA] mt-3">Educational analysis only — not financial advice.</p>
        </div>
      )}
    </div>
  );
}
