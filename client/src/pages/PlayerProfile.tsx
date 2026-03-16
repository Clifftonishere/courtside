import { useState, useEffect } from "react";
import { ArrowLeft, Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PLAYERS } from "@/lib/mock-data";

type Player = typeof PLAYERS[0];

// Hexagon SVG radar chart
function RadarChart({ attributes }: { attributes: Player["attributes"] }) {
  const keys = [
    { key: "insideScoring", label: "Inside" },
    { key: "outsideScoring", label: "Outside" },
    { key: "playmaking", label: "Play" },
    { key: "athleticism", label: "Athletic" },
    { key: "defending", label: "Defense" },
    { key: "rebounding", label: "Reb" },
  ] as const;

  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 72;

  const angle = (i: number) => (Math.PI * 2 * i) / keys.length - Math.PI / 2;

  const pointAt = (i: number, r: number) => ({
    x: cx + r * Math.cos(angle(i)),
    y: cy + r * Math.sin(angle(i)),
  });

  const gridLevels = [0.25, 0.5, 0.75, 1];

  const attrValues = keys.map((k) => (attributes[k.key] as number) / 100);

  const dataPoints = attrValues
    .map((v, i) => {
      const p = pointAt(i, v * maxR);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid */}
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={keys
              .map((_, i) => {
                const p = pointAt(i, level * maxR);
                return `${p.x},${p.y}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}
        {/* Spokes */}
        {keys.map((_, i) => {
          const outer = pointAt(i, maxR);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          );
        })}
        {/* Data */}
        <polygon
          points={dataPoints}
          fill="rgba(22,163,74,0.15)"
          stroke="#16a34a"
          strokeWidth="1.5"
        />
        {attrValues.map((v, i) => {
          const p = pointAt(i, v * maxR);
          return <circle key={i} cx={p.x} cy={p.y} r="3" fill="#16a34a" />;
        })}
        {/* Labels */}
        {keys.map((k, i) => {
          const p = pointAt(i, maxR + 14);
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="font-mono"
              style={{
                fontSize: 9,
                fill: "rgba(255,255,255,0.4)",
                fontFamily: "JetBrains Mono",
                textTransform: "uppercase",
              }}
            >
              {k.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function StreamingText({ text }: { text: string }) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setVisible(i);
      if (i >= text.length) clearInterval(timer);
    }, 22);
    return () => clearInterval(timer);
  }, [text]);

  return (
    <span>
      {text.slice(0, visible)}
      {visible < text.length && (
        <span className="inline-block w-0.5 h-4 bg-white/60 ml-0.5 animate-pulse" />
      )}
    </span>
  );
}

const TIER_BADGE: Record<string, string> = {
  Generational: "text-[#FFD700] border-[#FFD700]/40 bg-[#FFD700]/10",
  "All-World": "text-[#C0C0C0] border-[#C0C0C0]/40 bg-[#C0C0C0]/10",
  Franchise: "text-[#CD7F32] border-[#CD7F32]/40 bg-[#CD7F32]/10",
  "All-Star": "text-white/60 border-white/20 bg-white/5",
  Rising: "text-white/60 border-white/20 bg-white/5",
};

function PropBar({ prop }: { prop: Player["tonightProps"][0] }) {
  const prob = prop.prob;
  const color =
    prop.lean === "OVER" ? "#16a34a" : prop.lean === "UNDER" ? "#dc2626" : "#d97706";
  const confBadge = {
    HIGH: "text-[#16a34a] border-[#16a34a]/30 bg-[#16a34a]/10",
    MED: "text-[#d97706] border-[#d97706]/30 bg-[#d97706]/10",
    COND: "text-white/40 border-white/20 bg-white/5",
  }[prop.conf];

  return (
    <div className="p-4 bg-white/[0.04] rounded-xl border border-white/[0.06]">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-0.5">
            {prop.stat}
          </div>
          <div className="font-sans font-semibold text-white/90">
            {prop.lean === "OVER" ? "Over" : prop.lean === "UNDER" ? "Under" : ""} {prop.line}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold text-xl" style={{ color }}>
            {prob}%
          </div>
          <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${confBadge}`}>
            {prop.conf}
          </span>
        </div>
      </div>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${prob}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex items-center gap-4 text-[11px] flex-wrap">
        <span className="font-mono text-white/40">
          L5: <span className="text-white/70 font-semibold">{prop.l5}</span>
        </span>
        <span className="font-mono text-white/40">
          Season: <span className="text-white/70 font-semibold">{prop.seasonAvg}</span>
        </span>
        <span className="font-mono text-white/30">{prop.opponentDef}</span>
      </div>
    </div>
  );
}

interface PlayerProfileProps {
  playerId: string;
  onBack: () => void;
}

export function PlayerProfile({ playerId, onBack }: PlayerProfileProps) {
  const player = PLAYERS.find((p) => p.id === playerId);

  if (!player) {
    return (
      <div className="dark min-h-screen bg-[#0A0A0B] pt-22 flex items-center justify-center">
        <div className="text-white/40 font-mono">Player not found.</div>
      </div>
    );
  }

  const tierBadge = TIER_BADGE[player.tier] ?? TIER_BADGE["Rising"];

  return (
    <div className="dark min-h-screen bg-[#0A0A0B] text-white pt-22">
      <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-10">

        {/* Back button */}
        <button
          data-testid="back-button"
          onClick={onBack}
          className="flex items-center gap-2 font-mono text-xs text-white/40 hover-elevate rounded-lg px-1 py-1 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Players
        </button>

        {/* Hero */}
        <section data-testid="player-hero" className="relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <span className={`font-mono text-[11px] font-semibold px-2.5 py-1 rounded-md border ${tierBadge}`}>
                  {player.tier}
                </span>
                <span className="font-mono text-white/30 text-[11px]">
                  #{player.number} · {player.position} · {player.team}
                </span>
              </div>

              <h1 className="font-sans font-bold text-5xl text-white/95 leading-none tracking-tight mb-6">
                {player.name}
              </h1>

              {/* Core stats */}
              <div className="flex items-center gap-8">
                {[
                  { label: "PTS", val: player.stats.pts.toFixed(1) },
                  { label: "REB", val: player.stats.reb.toFixed(1) },
                  { label: "AST", val: player.stats.ast.toFixed(1) },
                  { label: "FG%", val: `${player.stats.fg_pct.toFixed(1)}%` },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="font-mono font-bold text-3xl text-white/95">{s.val}</div>
                    <div className="font-mono text-[11px] text-white/30 uppercase tracking-widest">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Radar chart */}
            <div className="flex justify-center">
              <RadarChart attributes={player.attributes} />
            </div>
          </div>
        </section>

        {/* Identity */}
        <section data-testid="player-identity">
          <div className="border-l-2 border-[#16a34a] pl-5">
            <div className="font-mono text-[10px] text-white/25 uppercase tracking-widest mb-2">
              Courtside Identity
            </div>
            <p className="font-sans font-medium text-xl text-white/85 leading-snug">
              <StreamingText text={player.identity} />
            </p>
          </div>
        </section>

        {/* Tonight's Props (if any) */}
        {player.tonightProps.length > 0 && (
          <section data-testid="tonight-props">
            <div className="font-mono text-[11px] text-white/25 uppercase tracking-widest mb-4">
              Courtside Edge — Tonight's Analysis
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {player.tonightProps.map((prop, i) => (
                <PropBar key={i} prop={prop} />
              ))}
            </div>
          </section>
        )}

        {/* Dissection */}
        <section data-testid="player-dissection">
          <div className="font-mono text-[11px] text-white/25 uppercase tracking-widest mb-4">
            Dissection
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {player.dissection.map((d, i) => (
              <div
                key={i}
                className="p-5 bg-white/[0.03] rounded-xl border border-white/[0.06]"
              >
                <div className="font-mono text-[10px] text-white/25 uppercase tracking-widest mb-1">
                  {d.category}
                </div>
                <div className="font-sans font-semibold text-white/90 mb-2">{d.trait}</div>
                <p className="font-sans text-sm text-white/50 leading-relaxed">{d.detail}</p>
              </div>
            ))}
          </div>

          {/* Weaknesses */}
          {player.weaknesses.length > 0 && (
            <div className="mt-3 space-y-3">
              <div className="font-mono text-[10px] text-[#dc2626]/70 uppercase tracking-widest">
                Exploitable
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {player.weaknesses.map((w, i) => (
                  <div
                    key={i}
                    className="p-5 bg-[#dc2626]/[0.04] rounded-xl border border-[#dc2626]/20"
                  >
                    <div className="font-mono text-[10px] text-[#dc2626]/60 uppercase tracking-widest mb-1">
                      Exploitable
                    </div>
                    <div className="font-sans font-semibold text-white/85 mb-2">{w.trait}</div>
                    <p className="font-sans text-sm text-white/50 leading-relaxed">{w.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Scout Notes */}
        <section data-testid="scout-notes">
          <div className="font-mono text-[11px] text-white/25 uppercase tracking-widest mb-4">
            Scout Notes
          </div>
          <div className="p-6 bg-white/[0.02] rounded-xl border border-white/[0.06] space-y-5">
            {player.scoutQuotes.map((q, i) => (
              <div key={i}>
                <blockquote className="font-serif italic text-white/75 text-base leading-relaxed mb-1">
                  "{q.quote}"
                </blockquote>
                <cite className="font-mono text-[10px] text-white/30 not-italic">
                  — {q.attribution}
                </cite>
                {i < player.scoutQuotes.length - 1 && (
                  <div className="mt-5 border-t border-white/[0.05]" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Scouting Report */}
        <section data-testid="scouting-report">
          <div className="font-mono text-[11px] text-white/25 uppercase tracking-widest mb-4">
            Scouting Report
          </div>
          <div className="space-y-4">
            {player.scoutingReport.split("\n\n").map((para, i) => (
              <p key={i} className="font-sans text-[#7A7A74] leading-relaxed text-[15px]">
                {para}
              </p>
            ))}
          </div>
        </section>

        {/* Last 5 games */}
        <section data-testid="recent-games">
          <div className="font-mono text-[11px] text-white/25 uppercase tracking-widest mb-4">
            Last 5 Games
          </div>
          <div className="border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Date", "Opp", "Result", "PTS", "REB", "AST", "+/-"].map((h) => (
                    <th
                      key={h}
                      className="font-mono text-[10px] text-white/25 uppercase tracking-widest py-3 px-4 text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {player.recentGames.map((g, i) => (
                  <tr
                    key={i}
                    className="border-b border-white/[0.04] last:border-0"
                  >
                    <td className="font-mono text-[11px] text-white/40 py-3 px-4">{g.date}</td>
                    <td className="font-mono text-[11px] text-white/70 py-3 px-4 font-semibold">{g.opp}</td>
                    <td className="font-mono text-[11px] py-3 px-4">
                      <span style={{ color: g.result === "W" ? "#16a34a" : "#dc2626" }}>
                        {g.result}
                      </span>
                    </td>
                    <td className="font-mono text-[11px] text-white/85 py-3 px-4 font-semibold">{g.pts}</td>
                    <td className="font-mono text-[11px] text-white/85 py-3 px-4">{g.reb}</td>
                    <td className="font-mono text-[11px] text-white/85 py-3 px-4">{g.ast}</td>
                    <td className="font-mono text-[11px] py-3 px-4 font-semibold">
                      <span
                        style={{
                          color:
                            g.plusMinus > 0
                              ? "#16a34a"
                              : g.plusMinus < 0
                              ? "#dc2626"
                              : "#AEAEA8",
                        }}
                      >
                        {g.plusMinus > 0 ? "+" : ""}{g.plusMinus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Tags */}
        <section data-testid="player-tags">
          <div className="font-mono text-[11px] text-white/25 uppercase tracking-widest mb-3">
            Tags
          </div>
          <div className="flex flex-wrap gap-2">
            {player.tags.map((tag, i) => (
              <span
                key={i}
                className="font-mono text-[11px] text-white/50 border border-white/[0.12] rounded-full px-3 py-1 uppercase tracking-wider bg-white/[0.03]"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="text-center py-6 border-t border-white/[0.05]">
          <p className="font-mono text-[10px] text-white/20 italic">
            Educational analysis only. Not financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
