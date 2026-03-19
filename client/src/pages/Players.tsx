import { useState } from "react";
import { Search, Flame } from "lucide-react";
import { PLAYERS, ACTIVE_POLLS, type ConfTier } from "@/lib/mock-data";
import { SectionHeader } from "@/components/SectionHeader";
import { PlayerHeadshot } from "@/components/TeamLogo";
import { PollCard } from "@/components/PollCard";

type Player = typeof PLAYERS[0];

const PLAYER_IDS_MAP: Record<string, number> = {
  "sga": 1628983, "jokic": 203999, "wemby": 1641705,
  "brunson": 1628384, "edwards": 1630162, "embiid": 203954,
  "giannis": 203507, "luka": 1629029, "bam": 1628389, "haliburton": 1630169,
};

const POSITIONS = ["All", "PG", "SG", "SF", "PF", "C"];
const TIERS = ["All", "S", "A"];

const TIER_STYLES: Record<string, { color: string; bg: string }> = {
  S: { color: "#F5A623", bg: "#F5A62320" },
  A: { color: "#1D428A", bg: "#1D428A15" },
};

const CONF_COLORS: Record<string, string> = {
  HIGH: "#008248", MED: "#F5A623", COND: "#888",
};

// Compute Players of the Week based on poll participation
function computePlayersOfWeek(players: Player[]) {
  return players
    .map((p) => {
      const relatedPolls = ACTIVE_POLLS.filter(poll =>
        poll.proposition.toLowerCase().includes(p.name.split(" ").pop()?.toLowerCase() || "") ||
        poll.game.includes(p.teamAbbr)
      );
      const totalVotes = relatedPolls.reduce((sum, poll) => sum + poll.totalVotes, 0);
      const topPoll = relatedPolls.sort((a, b) => b.totalVotes - a.totalVotes)[0] || null;
      return { player: p, totalVotes, topPoll };
    })
    .sort((a, b) => b.totalVotes - a.totalVotes)
    .slice(0, 3);
}

function PlayerOfWeekCard({ player, topPoll, totalVotes }: { player: Player; topPoll: any; totalVotes: number }) {
  const pid = PLAYER_IDS_MAP[player.id] || 0;
  const tier = TIER_STYLES[player.tier] ?? TIER_STYLES["A"];
  return (
    <div className="bg-white border-2 rounded-lg overflow-hidden" style={{ borderColor: tier.color }}>
      <div className="h-1" style={{ background: tier.color }} />
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <PlayerHeadshot playerId={pid} playerName={player.name} size={56} className="rounded-lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Flame size={12} style={{ color: tier.color }} />
              <span className="font-condensed font-bold text-[9px] uppercase tracking-[0.5px]" style={{ color: tier.color }}>
                Player of the Week
              </span>
            </div>
            <div className="font-condensed font-bold text-[16px] text-[#111] leading-tight">{player.name}</div>
            <div className="font-mono text-[10px] text-[#888]">{player.position} · {player.teamAbbr}</div>
            <div className="font-mono text-[10px] text-[#1D428A] mt-0.5">{totalVotes.toLocaleString()} poll votes</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "PTS", value: player.pts },
            { label: "REB", value: player.reb },
            { label: "AST", value: player.ast },
          ].map((s) => (
            <div key={s.label} className="text-center bg-[#F5F5F5] rounded-sm py-2">
              <div className="font-mono font-bold text-[16px] text-[#111]">{s.value}</div>
              <div className="font-condensed font-bold text-[9px] uppercase text-[#AAA] tracking-[0.5px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        {topPoll && (
          <div className="border-t border-[#F0F0F0] pt-3">
            <div className="font-condensed font-bold text-[9px] uppercase text-[#AAA] tracking-[0.5px] mb-2">Most Active Poll</div>
            <PollCard poll={topPoll} compact />
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerCard({ player, onSelect }: { player: Player; onSelect: () => void }) {
  const tierStyle = TIER_STYLES[player.tier] ?? { color: "#888", bg: "#88888815" };
  const bestProp = player.props[0];
  const pid = PLAYER_IDS_MAP[player.id] || 0;

  return (
    <div
      className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden hover:border-[#1D428A] hover:shadow-md transition-all cursor-pointer"
      onClick={onSelect}
      data-testid={`card-player-${player.id}`}
    >
      <div className="h-1" style={{ background: tierStyle.color }} />
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <PlayerHeadshot playerId={pid} playerName={player.name} size={52} className="rounded-sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-condensed font-bold text-[15px] text-[#111] leading-none">{player.name}</span>
              <span className="font-condensed font-bold text-[10px] uppercase tracking-[0.5px] px-1.5 py-0.5 flex-shrink-0"
                style={{ color: tierStyle.color, background: tierStyle.bg, borderRadius: 4 }}>
                {player.tier}-Tier
              </span>
            </div>
            <div className="font-mono text-[11px] text-[#888]">{player.position} · {player.teamAbbr}</div>
          </div>
        </div>
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
        {bestProp && (
          <div className="flex items-center justify-between px-2 py-1.5 rounded-sm"
            style={{ background: `${CONF_COLORS[bestProp.conf]}12` }}>
            <span className="font-sans text-[11px] text-[#555]">
              {bestProp.recommendation} {bestProp.label} {bestProp.line}
            </span>
            <span className="font-mono font-semibold text-[11px]" style={{ color: CONF_COLORS[bestProp.conf] }}>
              {bestProp.prob}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface PlayersProps {
  onPlayerSelect: (id: string) => void;
}

export function Players({ onPlayerSelect }: PlayersProps) {
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("All");
  const [tierFilter, setTierFilter] = useState("All");

  const playersOfWeek = computePlayersOfWeek(PLAYERS);

  const filtered = PLAYERS.filter((p) => {
    const matchSearch = search === "" || p.name.toLowerCase().includes(search.toLowerCase()) || p.teamAbbr.toLowerCase().includes(search.toLowerCase());
    const matchPos = posFilter === "All" || p.position === posFilter;
    const matchTier = tierFilter === "All" || p.tier === tierFilter;
    return matchSearch && matchPos && matchTier;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Players of the Week banner */}
      <section className="border-b border-[#E0E0E0] bg-[#F5F5F5] py-5">
        <div className="max-w-[1280px] mx-auto px-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={14} className="text-[#F5A623]" />
            <span className="font-condensed font-bold text-[14px] uppercase text-[#111] tracking-[0.5px]">Players of the Week</span>
            <span className="font-mono text-[10px] text-[#888] ml-1">Ranked by poll participation</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {playersOfWeek.map(({ player, topPoll, totalVotes }) => (
              <div key={player.id} onClick={() => onPlayerSelect(player.id)} className="cursor-pointer">
                <PlayerOfWeekCard player={player} topPoll={topPoll} totalVotes={totalVotes} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Header + filters */}
      <div className="border-b border-[#E0E0E0] bg-white">
        <div className="max-w-[1280px] mx-auto px-4 py-4">
          <SectionHeader title="All Players" accentColor="#1D428A" />
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAA]" />
              <input type="text" placeholder="Search players or teams..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full font-sans text-[13px] text-[#111] bg-white border border-[#E0E0E0] focus:border-[#1D428A] rounded-sm pl-8 pr-3 py-2 outline-none transition-colors" />
            </div>
            <div className="flex gap-2">
              <select value={posFilter} onChange={(e) => setPosFilter(e.target.value)}
                className="font-condensed font-semibold text-[12px] uppercase tracking-[0.5px] bg-white border border-[#E0E0E0] rounded-sm px-3 py-2 outline-none text-[#444]">
                {POSITIONS.map((p) => <option key={p}>{p}</option>)}
              </select>
              <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}
                className="font-condensed font-semibold text-[12px] uppercase tracking-[0.5px] bg-white border border-[#E0E0E0] rounded-sm px-3 py-2 outline-none text-[#444]">
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
                <PlayerCard key={player.id} player={player} onSelect={() => onPlayerSelect(player.id)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
