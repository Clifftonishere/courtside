import { useState } from "react";
import { Search } from "lucide-react";
import { PLAYERS } from "@/lib/mock-data";
import { SectionHeader } from "@/components/SectionHeader";
import { PlayerHeadshot } from "@/components/TeamLogo";

type Player = typeof PLAYERS[0];

// Player ID map for headshots
const PLAYER_IDS: Record<string, number> = {
  "sga": 1628983, "jokic": 203999, "wemby": 1641705,
  "brunson": 1628384, "edwards": 1630162, "embiid": 203954,
  "giannis": 203507, "luka": 1629029, "bam": 1628389,
  "haliburton": 1630169,
};

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
  const playerId = PLAYER_IDS[player.id] || 0;

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
          <PlayerHeadshot
            playerId={playerId}
            playerName={player.name}
            size={48}
            className="rounded-sm"
          />
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

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: "PTS", value: player.pts },
            { label: "REB", value: player.reb },
            { label: "AST", value: player.ast },
            { label: "FG%", value: player.fg },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-mono font-semibold text-[14px] text-[#111]">{stat.value}</div>
              <div className="font-condensed font-semibold text-[9px] uppercase text-[#AAA] tracking-[0.5px]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Best prop */}
        {bestProp && (
          <div
            className="flex items-center justify-between px-2 py-1.5 rounded-sm"
            style={{ background: `${CONF_COLORS[bestProp.conf]}12` }}
          >
            <span className="font-sans text-[11px] text-[#555]">
              {bestProp.recommendation} {bestProp.label} {bestProp.line}
            </span>
            <span
              className="font-mono font-semibold text-[11px]"
              style={{ color: CONF_COLORS[bestProp.conf] }}
            >
              {bestProp.prob}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function Players({ onPlayerSelect }: PlayersProps) {
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("All");
  const [tierFilter, setTierFilter] = useState("All");

  const filtered = PLAYERS.filter((p) => {
    const matchSearch = search === "" || p.name.toLowerCase().includes(search.toLowerCase()) || p.teamAbbr.toLowerCase().includes(search.toLowerCase());
    const matchPos = posFilter === "All" || p.position === posFilter;
    const matchTier = tierFilter === "All" || p.tier === tierFilter;
    return matchSearch && matchPos && matchTier;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-[#E0E0E0] bg-[#F5F5F5]">
        <div className="max-w-[1280px] mx-auto px-4 py-5">
          <SectionHeader title="Player Intelligence" accentColor="#1D428A" />
          <p className="font-sans text-[12px] text-[#888] mt-1 mb-4">
            Individual player analysis, prop recommendations, and scouting reports.
          </p>

          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAA]" />
              <input
                type="text"
                placeholder="Search players or teams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-player-search"
                className="w-full font-sans text-[13px] text-[#111] bg-white border border-[#E0E0E0] focus:border-[#1D428A] rounded-sm pl-8 pr-3 py-2 outline-none transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={posFilter}
                onChange={(e) => setPosFilter(e.target.value)}
                className="font-condensed font-semibold text-[12px] uppercase tracking-[0.5px] bg-white border border-[#E0E0E0] rounded-sm px-3 py-2 outline-none text-[#444]"
              >
                {POSITIONS.map((p) => <option key={p}>{p}</option>)}
              </select>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="font-condensed font-semibold text-[12px] uppercase tracking-[0.5px] bg-white border border-[#E0E0E0] rounded-sm px-3 py-2 outline-none text-[#444]"
              >
                {TIERS.map((t) => <option key={t} value={t}>{t === "All" ? "All Tiers" : `${t}-Tier`}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-[1280px] mx-auto px-4 py-5">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-sans text-[14px] text-[#888]">No players match your filters.</p>
          </div>
        ) : (
          <>
            <p className="font-mono text-[11px] text-[#AAA] mb-3">{filtered.length} players</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onSelect={() => onPlayerSelect(player.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
