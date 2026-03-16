import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle, XCircle } from "lucide-react";
import { GAMES } from "@/lib/mock-data";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";

type Game = typeof GAMES[0];

function ConfBadge({ conf }: { conf: string }) {
  const styles = {
    HIGH: "bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]",
    MED: "bg-[#fffbeb] text-[#d97706] border border-[#fde68a]",
    COND: "bg-[#f9fafb] text-[#6b7280] border border-[#e5e7eb]",
  }[conf] ?? "bg-[#f9fafb] text-[#6b7280] border border-[#e5e7eb]";
  return (
    <span className={`font-mono text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded ${styles}`}>
      {conf}
    </span>
  );
}

function LiveDot() {
  return (
    <span className="relative flex items-center justify-center w-2 h-2 shrink-0">
      <span className="absolute w-2 h-2 rounded-full bg-[#16a34a] live-dot" />
      <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
    </span>
  );
}

function FactorBar({ factor }: { factor: Game["factors"][0] }) {
  const pct = Math.round(factor.weight * 100);
  const color = factor.favor === "NYK" || factor.favor.length === 3
    ? "#16a34a"
    : factor.favor === "EVEN"
    ? "#d97706"
    : "#16a34a";

  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[11px] text-[#4A4A46]">{factor.name}</span>
          <span className="font-mono text-[11px] text-[#7A7A74]">{factor.val}</span>
        </div>
        <div className="h-1 bg-[#F3F3F0] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </div>
      <span
        className="font-mono text-[10px] font-semibold w-10 text-right shrink-0"
        style={{ color: factor.favor === "EVEN" ? "#d97706" : "#16a34a" }}
      >
        {factor.favor}
      </span>
    </div>
  );
}

export function GameCard({ game }: { game: Game }) {
  const [expanded, setExpanded] = useState(false);

  const isLive = game.status === "live";
  const isFinal = game.status === "final";

  const pickColor = game.pick.conf === "HIGH"
    ? "#16a34a"
    : game.pick.conf === "MED"
    ? "#d97706"
    : "#6b7280";

  return (
    <div
      data-testid={`game-card-${game.id}`}
      className="border border-[#E4E4E0] rounded-xl bg-white overflow-hidden"
    >
      {/* Main row */}
      <button
        className="w-full text-left px-5 py-4 hover-elevate transition-all"
        onClick={() => setExpanded(!expanded)}
        data-testid={`game-toggle-${game.id}`}
      >
        <div className="flex items-center gap-3">
          {/* Away team */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: game.away.color + "22" }}
            >
              <span
                className="font-mono text-[10px] font-bold"
                style={{ color: game.away.color }}
              >
                {game.away.abbr}
              </span>
            </div>
            <div className="min-w-0">
              <div className="font-sans font-semibold text-sm text-[#1A1A18] truncate">
                {game.away.name}
              </div>
              <div className="font-mono text-[10px] text-[#AEAEA8]">{game.away.record}</div>
            </div>
            {(isLive || isFinal) && (
              <span className="font-mono font-bold text-xl text-[#1A1A18] ml-2">
                {game.away.score}
              </span>
            )}
          </div>

          {/* Center: status */}
          <div className="text-center px-2 shrink-0">
            {isLive ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5">
                  <LiveDot />
                  <span className="font-mono text-xs font-semibold text-[#16a34a]">
                    {game.quarter}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[#7A7A74]">{game.clock}</span>
              </div>
            ) : isFinal ? (
              <div className="font-mono text-xs text-[#AEAEA8] uppercase tracking-wider">Final</div>
            ) : (
              <div className="font-mono text-xs text-[#4A4A46] font-medium">{game.time}</div>
            )}
          </div>

          {/* Home team */}
          <div className="flex items-center gap-2 flex-1 min-w-0 flex-row-reverse">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: game.home.color + "22" }}
            >
              <span
                className="font-mono text-[10px] font-bold"
                style={{ color: game.home.color }}
              >
                {game.home.abbr}
              </span>
            </div>
            <div className="min-w-0 text-right">
              <div className="font-sans font-semibold text-sm text-[#1A1A18] truncate">
                {game.home.name}
              </div>
              <div className="font-mono text-[10px] text-[#AEAEA8]">{game.home.record}</div>
            </div>
            {(isLive || isFinal) && (
              <span className="font-mono font-bold text-xl text-[#1A1A18] mr-2">
                {game.home.score}
              </span>
            )}
          </div>

          {/* Pick */}
          <div className="text-right shrink-0 pl-4 border-l border-[#E4E4E0] ml-2">
            <div className="flex items-center justify-end gap-2 mb-0.5">
              <span className="font-mono font-bold text-sm" style={{ color: pickColor }}>
                {game.pick.team}
              </span>
              <ConfBadge conf={game.pick.conf} />
              {game.correct === true && <CheckCircle className="w-4 h-4 text-[#16a34a]" />}
              {game.correct === false && <XCircle className="w-4 h-4 text-[#dc2626]" />}
            </div>
            <div className="font-mono text-[10px] text-[#AEAEA8]">
              {game.pick.prob}% · {game.pick.margin}
            </div>
          </div>

          <div className="pl-2 shrink-0">
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-[#AEAEA8]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#AEAEA8]" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[#E4E4E0] px-5 py-5 space-y-5 fade-up">
          {/* Courtside take */}
          <div>
            <div className="font-mono text-[10px] text-[#AEAEA8] uppercase tracking-widest mb-2">
              Courtside Take
            </div>
            <p className="font-sans text-sm text-[#4A4A46] leading-relaxed">{game.take}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Power model */}
            <div>
              <div className="font-mono text-[10px] text-[#AEAEA8] uppercase tracking-widest mb-3">
                Power Model
              </div>
              <div className="space-y-0.5">
                {game.factors.map((f, i) => (
                  <FactorBar key={i} factor={f} />
                ))}
              </div>
            </div>

            {/* Win probability + Market */}
            <div className="space-y-4">
              {game.winProb.length > 1 && (
                <div>
                  <div className="font-mono text-[10px] text-[#AEAEA8] uppercase tracking-widest mb-2">
                    Win Probability
                  </div>
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={game.winProb}>
                        <XAxis
                          dataKey="time"
                          tick={{ fontFamily: "JetBrains Mono", fontSize: 10, fill: "#AEAEA8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            fontFamily: "JetBrains Mono",
                            fontSize: 11,
                            border: "1px solid #E4E4E0",
                            borderRadius: 8,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="nyk"
                          stackId="1"
                          stroke="#16a34a"
                          fill="#f0fdf4"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div>
                <div className="font-mono text-[10px] text-[#AEAEA8] uppercase tracking-widest mb-2">
                  Market Odds
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Spread", val: game.marketOdds.spread },
                    { label: "Moneyline", val: game.marketOdds.ml },
                    { label: "Total", val: game.marketOdds.total },
                  ].map((m, i) => (
                    <div
                      key={i}
                      className="text-center p-2 bg-[#F3F3F0] rounded-lg"
                    >
                      <div className="font-mono text-[10px] text-[#AEAEA8] mb-1">{m.label}</div>
                      <div className="font-mono text-xs font-semibold text-[#1A1A18]">{m.val}</div>
                    </div>
                  ))}
                </div>
                <p className="font-mono text-[10px] text-[#AEAEA8] mt-2 italic">
                  Educational analysis, not financial advice.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
