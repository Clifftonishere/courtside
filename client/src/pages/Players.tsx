import { useState } from "react";
import { Search } from "lucide-react";
import { PLAYERS } from "@/lib/mock-data";
import { SectionHeader } from "@/components/SectionHeader";

type Player = typeof PLAYERS[0];

interface PlayersProps {
  onPlayerSelect: (id: string) => void;
}

const POSITIONS = ["All", "PG", "SG", "SF", "PF", "C"];
const TIERS = ["All", "S", "A"];

const TIER_STYLES: Record<string, { color: string; bg: string }> = {
  S: { color: "#F5A623", bg: "#F5A62320" },
  A: { color: "#1D428A", bg: "#1D428A15" },
};

const CONF_COLORS: Record<string, string> = {
  HIGH: "#008248",
  MED: "#F5A623",
  COND: "#888",
};

function PlayerCard({ player, onSelect }: { player: Player; onSelect: () => void }) {
  const tierStyle = TIER_STYLES[player.tier] ?? { color: "#888", bg: "#88888815" };
  const bestProp = player.props[0];

  return (
    <div
      className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden hover:border-[#1D428A] hover:shadow-md transition-all cursor-pointer"
      onClick={onSelect}
      data-testid={`card-player-${player.id}`}
    >
      {/* Top stripe with tier */}
      <div className="h-1" style={{ background: tierStyle.color }} />

      <div className="p-4">
        {/* Avatar + name row */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-sm flex items-center justify-center font-condensed font-bold text-[16px] uppercase flex-shrink-0"
            style={{ background: tierStyle.bg, color: tierStyle.color }}
          >
            {player.imageInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-condensed font-bold text-[16px] text-[#111] leading-none">{player.name}</span>
              <span
                className="font-condensed font-bold text-[10px] uppercase tracking-[0.5px] px-1.5 py-0.5 flex-shrink-0"
                style={{ color: tierStyle.color, background: tierStyle.bg, borderRadius: 4 }}
              >
                {player.tier}-Tier
              </span>
            </div>
            <div className="font-mono text-[11px] text-[#888]">
              {player.position} · {player.teamAbbr}
            </div>
          </div>
        </div>

        {/* Core stats row */}
        <div className="grid grid-cols-4 gap-2 mb-3 bg-[#F5F5F5] rounded-sm p-2">
          {[
            { label: "PTS", value: player.pts },
            { label: "REB", value: player.reb },
            { label: "AST", value: player.ast },
            { label: "FG%", value: player.fg },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="font-mono font-bold text-[15px] text-[#111] leading-none">{value}</div>
              <div className="font-condensed font-semibold text-[9px] uppercase text-[#AAA] tracking-[0.5px] mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Best prop */}
        <div className="flex items-center justify-between pt-2 border-t border-[#F0F0F0]">
          <span className="font-sans text-[11px] text-[#888]">
            {bestProp.label} {bestProp.recommendation} {bestProp.line}
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className="font-condensed font-bold text-[9px] uppercase px-1 py-0.5"
              style={{ color: CONF_COLORS[bestProp.conf], background: `${CONF_COLORS[bestProp.conf]}18`, borderRadius: 3 }}
            >
              {bestProp.conf}
            </span>
            <span className="font-mono font-semibold text-[11px] text-[#1D428A]">{bestProp.prob}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Players({ onPlayerSelect }: PlayersProps) {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("All");
  const [tier, setTier] = useState("All");

  const filtered = PLAYERS.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.teamAbbr.toLowerCase().includes(search.toLowerCase());
    const matchPos = position === "All" || p.position === position;
    const matchTier = tier === "All" || p.tier === tier;
    return matchSearch && matchPos && matchTier;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Page header */}
      <div className="border-b border-[#E0E0E0] bg-[#F5F5F5]">
        <div className="max-w-[1280px] mx-auto px-4 py-5">
          <h1 className="font-condensed font-bold text-[28px] uppercase text-[#111] leading-none tracking-[0.5px] mb-3">
            Player Intelligence
          </h1>

          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAA]" />
              <input
                type="text"
                placeholder="Search players or teams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-player-search"
                className="w-full font-sans text-[13px] text-[#111] placeholder-[#AAA] bg-white border border-[#E0E0E0] focus:border-[#1D428A] rounded-sm pl-9 pr-4 py-2 outline-none transition-colors"
              />
            </div>

            {/* Position filter */}
            <div className="flex items-center gap-1">
              {POSITIONS.map((pos) => (
                <button
                  key={pos}
                  onClick={() => setPosition(pos)}
                  data-testid={`filter-pos-${pos}`}
                  className={`font-condensed font-bold text-[11px] uppercase tracking-[0.5px] px-2.5 py-1.5 rounded-sm transition-all ${
                    position === pos
                      ? "bg-[#111] text-white"
                      : "bg-white border border-[#E0E0E0] text-[#555] hover:border-[#111] hover:text-[#111]"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>

            {/* Tier filter */}
            <div className="flex items-center gap-1">
              {TIERS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  data-testid={`filter-tier-${t}`}
                  className={`font-condensed font-bold text-[11px] uppercase tracking-[0.5px] px-2.5 py-1.5 rounded-sm transition-all ${
                    tier === t
                      ? "bg-[#1D428A] text-white"
                      : "bg-white border border-[#E0E0E0] text-[#555] hover:border-[#1D428A] hover:text-[#1D428A]"
                  }`}
                >
                  {t === "All" ? "All Tiers" : `${t}-Tier`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-[1280px] mx-auto px-4 py-5">
        <div className="mb-3">
          <SectionHeader title={`${filtered.length} Players`} accentColor="#1D428A" />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-condensed font-bold text-[18px] uppercase text-[#CCC] tracking-[0.5px]">No players found</p>
            <p className="font-sans text-[13px] text-[#AAA] mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                onSelect={() => onPlayerSelect(player.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
