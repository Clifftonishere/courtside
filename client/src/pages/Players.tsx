import { useState } from "react";
import { Search } from "lucide-react";
import { PLAYERS } from "@/lib/mock-data";

type Player = typeof PLAYERS[0];

const TIER_STYLES: Record<string, { border: string; badge: string; text: string; glow?: string }> = {
  Generational: {
    border: "border-[#FFD700]",
    badge: "bg-[#fffbeb] text-[#b45309] border border-[#fde68a]",
    text: "text-[#b45309]",
    glow: "shadow-[0_0_16px_rgba(255,215,0,0.2)]",
  },
  "All-World": {
    border: "border-[#C0C0C0]",
    badge: "bg-[#f9fafb] text-[#6b7280] border border-[#d1d5db]",
    text: "text-[#6b7280]",
  },
  Franchise: {
    border: "border-[#CD7F32]",
    badge: "bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]",
    text: "text-[#c2410c]",
  },
  "All-Star": {
    border: "border-[#E4E4E0]",
    badge: "bg-[#f9fafb] text-[#9ca3af] border border-[#e5e7eb]",
    text: "text-[#9ca3af]",
  },
  Rising: {
    border: "border-[#E4E4E0]",
    badge: "bg-[#f9fafb] text-[#9ca3af] border border-[#e5e7eb]",
    text: "text-[#9ca3af]",
  },
};

function StatPill({ label, val }: { label: string; val: string | number }) {
  return (
    <div className="text-center">
      <div className="font-mono text-sm font-semibold text-[#1A1A18]">{val}</div>
      <div className="font-mono text-[10px] text-[#AEAEA8] uppercase">{label}</div>
    </div>
  );
}

interface PlayerCardProps {
  player: Player;
  onClick: () => void;
}

function PlayerCard({ player, onClick }: PlayerCardProps) {
  const tier = TIER_STYLES[player.tier] ?? TIER_STYLES["Rising"];

  return (
    <button
      data-testid={`player-card-${player.id}`}
      onClick={onClick}
      className={`text-left border-2 ${tier.border} rounded-xl bg-white p-5 hover-elevate transition-all ${tier.glow ?? ""} w-full`}
    >
      {/* Avatar + name */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F3F3F0] flex items-center justify-center font-mono font-bold text-sm text-[#4A4A46] shrink-0">
            {player.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <div className="font-sans font-semibold text-sm text-[#1A1A18] leading-tight">
              {player.name}
            </div>
            <div className="font-mono text-[10px] text-[#AEAEA8]">
              {player.team} · {player.position}
            </div>
          </div>
        </div>
        <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${tier.badge}`}>
          {player.tier}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between pt-3 border-t border-[#F3F3F0]">
        <StatPill label="PTS" val={player.stats.pts.toFixed(1)} />
        <StatPill label="REB" val={player.stats.reb.toFixed(1)} />
        <StatPill label="AST" val={player.stats.ast.toFixed(1)} />
        <StatPill label="FG%" val={`${player.stats.fg_pct.toFixed(1)}%`} />
      </div>
    </button>
  );
}

const POSITIONS = ["All", "PG", "SG", "SF", "PF", "C"];
const TIERS = ["All", "Generational", "All-World", "Franchise", "All-Star", "Rising"];

interface PlayersProps {
  onPlayerSelect: (id: string) => void;
}

export function Players({ onPlayerSelect }: PlayersProps) {
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("All");
  const [tierFilter, setTierFilter] = useState("All");

  const filtered = PLAYERS.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.team.toLowerCase().includes(search.toLowerCase());
    const matchPos = posFilter === "All" || p.position === posFilter;
    const matchTier = tierFilter === "All" || p.tier === tierFilter;
    return matchSearch && matchPos && matchTier;
  });

  return (
    <div className="min-h-screen bg-[#FAFAF8] pt-22">
      <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="font-sans font-bold text-2xl text-[#1A1A18] tracking-tight mb-1">
            Player Intelligence
          </h1>
          <p className="font-sans text-sm text-[#7A7A74]">
            Neural profiles updated after every possession across 240+ micro-actions.
          </p>
        </div>

        {/* Search + filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AEAEA8]" />
            <input
              data-testid="player-search"
              type="text"
              placeholder="Search any player or team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full font-sans text-sm bg-white border border-[#E4E4E0] rounded-xl pl-10 pr-4 py-3 text-[#1A1A18] placeholder:text-[#AEAEA8] outline-none focus:border-[#1A1A18] transition-colors"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-mono text-[10px] text-[#AEAEA8] uppercase tracking-wide mr-1">
                Pos
              </span>
              {POSITIONS.map((p) => (
                <button
                  key={p}
                  data-testid={`pos-filter-${p}`}
                  onClick={() => setPosFilter(p)}
                  className={`font-mono text-[11px] px-3 py-1 rounded-full border transition-all ${
                    posFilter === p
                      ? "bg-[#1A1A18] text-white border-[#1A1A18]"
                      : "text-[#7A7A74] border-[#E4E4E0] bg-white hover-elevate"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-mono text-[10px] text-[#AEAEA8] uppercase tracking-wide mr-1">
                Tier
              </span>
              {TIERS.map((t) => (
                <button
                  key={t}
                  data-testid={`tier-filter-${t}`}
                  onClick={() => setTierFilter(t)}
                  className={`font-mono text-[11px] px-3 py-1 rounded-full border transition-all ${
                    tierFilter === t
                      ? "bg-[#1A1A18] text-white border-[#1A1A18]"
                      : "text-[#7A7A74] border-[#E4E4E0] bg-white hover-elevate"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="font-mono text-[11px] text-[#AEAEA8]">
          {filtered.length} player{filtered.length !== 1 ? "s" : ""}
        </div>

        {/* Player grid */}
        <div
          data-testid="player-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filtered.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onClick={() => onPlayerSelect(player.id)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="text-center py-4 border-t border-[#E4E4E0]">
          <p className="font-mono text-[10px] text-[#AEAEA8] italic">
            Educational analysis only. Not financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
