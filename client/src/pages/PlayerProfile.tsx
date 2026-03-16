import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { PLAYERS } from "@/lib/mock-data";
import type { ConfTier } from "@/lib/mock-data";

type Player = typeof PLAYERS[0];

/* ── Streaming text cursor animation ── */
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
        <span className="inline-block w-0.5 h-5 bg-white/50 ml-0.5 animate-pulse" />
      )}
    </span>
  );
}

/* ── Hexagon radar chart ── */
function RadarChart({ stats }: { stats: Player["radarStats"] }) {
  const keys: { key: keyof typeof stats; label: string }[] = [
    { key: "pts", label: "PTS" },
    { key: "reb", label: "REB" },
    { key: "ast", label: "AST" },
    { key: "def", label: "DEF" },
    { key: "eff", label: "EFF" },
  ];

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 76;
  const n = keys.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pointAt = (i: number, r: number) => ({
    x: cx + r * Math.cos(angle(i)),
    y: cy + r * Math.sin(angle(i)),
  });

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const values = keys.map((k) => (stats[k.key] as number) / 100);
  const dataPoints = values.map((v, i) => {
    const p = pointAt(i, v * maxR);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLevels.map((lvl) => (
        <polygon
          key={lvl}
          points={keys.map((_, i) => { const p = pointAt(i, lvl * maxR); return `${p.x},${p.y}`; }).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="1"
        />
      ))}
      {keys.map((_, i) => {
        const outer = pointAt(i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />;
      })}
      <polygon points={dataPoints} fill="rgba(29,66,138,0.20)" stroke="#1D428A" strokeWidth="2" />
      {values.map((v, i) => {
        const p = pointAt(i, v * maxR);
        return <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#1D428A" />;
      })}
      {keys.map((k, i) => {
        const p = pointAt(i, maxR + 16);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: 9, fill: "rgba(255,255,255,0.35)", fontFamily: "var(--font-condensed)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}
          >
            {k.label}
          </text>
        );
      })}
    </svg>
  );
}

/* ── Prop bar ── */
const CONF_COLORS: Record<ConfTier, string> = {
  HIGH: "#008248",
  MED: "#F5A623",
  COND: "#888",
};

function PropBar({ prop }: { prop: Player["props"][0] }) {
  const color = CONF_COLORS[prop.conf];
  const barColor = prop.recommendation === "OVER" ? "#1D428A" : "#C8102E";

  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-sm p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-condensed font-bold text-[10px] uppercase text-white/30 tracking-[1px] mb-1">{prop.label}</div>
          <div className="font-condensed font-bold text-[16px] text-white">
            {prop.recommendation} {prop.line}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold text-[22px] leading-none" style={{ color }}>{prop.prob}%</div>
          <span
            className="font-condensed font-bold text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 inline-block mt-1"
            style={{ color, background: `${color}20`, borderRadius: 4 }}
          >
            {prop.conf}
          </span>
        </div>
      </div>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${prop.prob}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

/* ── Tier styles ── */
const TIER_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  S: { color: "#F5A623", bg: "rgba(245,166,35,0.15)", label: "S-TIER" },
  A: { color: "#1D428A", bg: "rgba(29,66,138,0.2)", label: "A-TIER" },
};

interface PlayerProfileProps {
  playerId: string;
  onBack: () => void;
}

export function PlayerProfile({ playerId, onBack }: PlayerProfileProps) {
  const player = PLAYERS.find((p) => p.id === playerId);

  if (!player) {
    return (
      <div className="dark min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="text-white/30 font-condensed font-bold text-[18px] uppercase tracking-[0.5px]">
          Player not found
        </div>
      </div>
    );
  }

  const tier = TIER_STYLES[player.tier] ?? TIER_STYLES["A"];

  return (
    <div className="dark min-h-screen bg-[#111111] text-white">
      <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-8">

        {/* Back */}
        <button
          onClick={onBack}
          data-testid="btn-back-players"
          className="flex items-center gap-1.5 font-condensed font-bold text-[11px] uppercase tracking-[0.5px] text-white/30 hover:text-white transition-colors"
        >
          <ArrowLeft size={13} />
          All Players
        </button>

        {/* Hero section */}
        <section data-testid="player-hero">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-2">
              {/* Tier + team */}
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="font-condensed font-bold text-[11px] uppercase tracking-[0.5px] px-2 py-1"
                  style={{ color: tier.color, background: tier.bg, borderRadius: 4 }}
                >
                  {tier.label}
                </span>
                <span className="font-mono text-[11px] text-white/30">
                  {player.position} · {player.team}
                </span>
              </div>

              {/* Name */}
              <h1 className="font-condensed font-bold text-[48px] md:text-[56px] text-white leading-none uppercase tracking-[1px] mb-6">
                {player.name}
              </h1>

              {/* Core stats */}
              <div className="flex items-center gap-8 flex-wrap">
                {[
                  { label: "PTS", value: player.pts },
                  { label: "REB", value: player.reb },
                  { label: "AST", value: player.ast },
                  { label: "STL", value: player.stl },
                  { label: "FG%", value: player.fg },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="font-mono font-bold text-[30px] text-white leading-none">{s.value}</div>
                    <div className="font-condensed font-bold text-[10px] uppercase text-white/30 tracking-[1px] mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Radar */}
            <div className="flex justify-center">
              <RadarChart stats={player.radarStats} />
            </div>
          </div>
        </section>

        {/* Identity sentence */}
        <section data-testid="player-identity">
          <div className="border-l-[3px] border-[#1D428A] pl-5">
            <div className="font-condensed font-bold text-[10px] uppercase text-white/25 tracking-[1px] mb-2">
              Courtside Identity
            </div>
            <p className="font-sans text-[18px] text-white/80 leading-snug font-medium">
              <StreamingText text={player.identitySentence} />
            </p>
          </div>
        </section>

        {/* Props */}
        <section data-testid="player-props">
          <div className="font-condensed font-bold text-[11px] uppercase text-white/25 tracking-[1px] mb-3">
            Courtside Edge — Tonight's Props
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {player.props.map((prop, i) => (
              <PropBar key={i} prop={prop} />
            ))}
          </div>
        </section>

        {/* Scout note */}
        <section data-testid="scout-notes">
          <div className="font-condensed font-bold text-[11px] uppercase text-white/25 tracking-[1px] mb-3">
            Scout Note
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-sm p-5">
            <p className="font-sans text-[14px] text-white/60 leading-relaxed">{player.scoutNote}</p>
          </div>
        </section>

        {/* Season averages table */}
        <section data-testid="season-averages">
          <div className="font-condensed font-bold text-[11px] uppercase text-white/25 tracking-[1px] mb-3">
            Season Averages
          </div>
          <div className="border border-white/[0.06] rounded-sm overflow-hidden">
            <div className="grid grid-cols-8 bg-white/[0.03] border-b border-white/[0.06]">
              {["PTS", "REB", "AST", "STL", "BLK", "FG%", "FT%", "3PM"].map((h) => (
                <div key={h} className="font-condensed font-bold text-[10px] uppercase text-white/25 tracking-[0.5px] py-2.5 px-3 text-center">
                  {h}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-8">
              {[player.pts, player.reb, player.ast, player.stl, player.blk, player.fg, player.ft, player.tpm].map((v, i) => (
                <div key={i} className="font-mono font-semibold text-[14px] text-white/85 py-3 px-3 text-center">
                  {v}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center py-4 border-t border-white/[0.05]">
          <p className="font-sans text-[11px] text-white/20">
            Educational analysis only — not financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
