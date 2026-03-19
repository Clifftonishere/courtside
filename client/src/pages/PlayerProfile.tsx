import { useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { PLAYERS } from "@/lib/mock-data";
import type { ConfTier } from "@/lib/mock-data";
import { PlayerHeadshot } from "@/components/TeamLogo";

type Player = typeof PLAYERS[0];

const PLAYER_IDS_MAP: Record<string, number> = {
  "sga": 1628983, "jokic": 203999, "wemby": 1641705,
  "brunson": 1628384, "edwards": 1630162, "embiid": 203954,
  "giannis": 203507, "luka": 1629029, "bam": 1628389, "haliburton": 1630169,
};

// Mock L10 game logs per player
const GAME_LOGS: Record<string, { date: string; opp: string; pts: number; reb: number; ast: number; stl: number; blk: number; fg: string }[]> = {
  "sga": [
    { date: "Mar 17", opp: "DEN", pts: 36, reb: 5, ast: 7, stl: 2, blk: 1, fg: "54%" },
    { date: "Mar 15", opp: "LAL", pts: 31, reb: 4, ast: 6, stl: 3, blk: 0, fg: "49%" },
    { date: "Mar 13", opp: "MIA", pts: 28, reb: 6, ast: 8, stl: 1, blk: 1, fg: "52%" },
    { date: "Mar 11", opp: "BOS", pts: 34, reb: 3, ast: 5, stl: 2, blk: 0, fg: "58%" },
    { date: "Mar 9",  opp: "MIN", pts: 29, reb: 5, ast: 7, stl: 1, blk: 1, fg: "47%" },
    { date: "Mar 7",  opp: "PHI", pts: 38, reb: 4, ast: 6, stl: 3, blk: 0, fg: "61%" },
    { date: "Mar 5",  opp: "HOU", pts: 32, reb: 6, ast: 9, stl: 2, blk: 1, fg: "53%" },
    { date: "Mar 3",  opp: "NYK", pts: 27, reb: 3, ast: 5, stl: 1, blk: 0, fg: "45%" },
    { date: "Mar 1",  opp: "CLE", pts: 33, reb: 5, ast: 7, stl: 2, blk: 1, fg: "56%" },
    { date: "Feb 28", opp: "DAL", pts: 30, reb: 4, ast: 8, stl: 1, blk: 0, fg: "50%" },
  ],
  "jokic": [
    { date: "Mar 17", opp: "LAL", pts: 33, reb: 14, ast: 11, stl: 1, blk: 1, fg: "62%" },
    { date: "Mar 15", opp: "GSW", pts: 28, reb: 12, ast: 9,  stl: 2, blk: 0, fg: "57%" },
    { date: "Mar 13", opp: "MIN", pts: 31, reb: 10, ast: 8,  stl: 1, blk: 1, fg: "59%" },
    { date: "Mar 11", opp: "PHX", pts: 24, reb: 15, ast: 10, stl: 0, blk: 2, fg: "51%" },
    { date: "Mar 9",  opp: "OKC", pts: 27, reb: 13, ast: 12, stl: 1, blk: 1, fg: "55%" },
    { date: "Mar 7",  opp: "SAC", pts: 35, reb: 11, ast: 8,  stl: 2, blk: 0, fg: "64%" },
    { date: "Mar 5",  opp: "CLE", pts: 22, reb: 14, ast: 11, stl: 1, blk: 1, fg: "48%" },
    { date: "Mar 3",  opp: "MIA", pts: 29, reb: 12, ast: 9,  stl: 0, blk: 2, fg: "58%" },
    { date: "Mar 1",  opp: "BOS", pts: 26, reb: 13, ast: 10, stl: 1, blk: 0, fg: "53%" },
    { date: "Feb 28", opp: "NYK", pts: 30, reb: 11, ast: 8,  stl: 2, blk: 1, fg: "60%" },
  ],
};

// Generate generic game log for players without specific data
function generateGameLog(player: Player) {
  const log = GAME_LOGS[player.id];
  if (log) return log;
  const opps = ["BOS", "LAL", "NYK", "MIA", "PHI", "DEN", "GSW", "MIN", "OKC", "CLE"];
  const months = ["Mar 17", "Mar 15", "Mar 13", "Mar 11", "Mar 9", "Mar 7", "Mar 5", "Mar 3", "Mar 1", "Feb 28"];
  return months.map((date, i) => ({
    date, opp: opps[i],
    pts: Math.round(player.pts * (0.85 + Math.random() * 0.3)),
    reb: Math.round(player.reb * (0.8 + Math.random() * 0.4)),
    ast: Math.round(player.ast * (0.8 + Math.random() * 0.4)),
    stl: Math.round(player.stl * (0.8 + Math.random() * 0.4)),
    blk: Math.round(player.blk * (0.8 + Math.random() * 0.4)),
    fg: `${Math.round(player.fg * (0.9 + Math.random() * 0.2))}%`,
  }));
}

const CONF_COLORS: Record<ConfTier, string> = {
  HIGH: "#008248", MED: "#F5A623", COND: "#888",
};

const TIER_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  S: { color: "#F5A623", bg: "#F5A62320", label: "S-TIER" },
  A: { color: "#1D428A", bg: "#1D428A15", label: "A-TIER" },
};

function PropBar({ prop }: { prop: Player["props"][0] }) {
  const color = CONF_COLORS[prop.conf];
  const barColor = prop.recommendation === "OVER" ? "#1D428A" : "#C8102E";
  return (
    <div className="bg-[#F5F5F5] border border-[#E0E0E0] rounded-sm p-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="font-condensed font-bold text-[9px] uppercase text-[#AAA] tracking-[1px] mb-0.5">{prop.label}</div>
          <div className="font-condensed font-bold text-[14px] text-[#111]">
            {prop.recommendation} {prop.line}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold text-[20px] leading-none" style={{ color }}>{prop.prob}%</div>
          <span className="font-condensed font-bold text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 inline-block mt-0.5"
            style={{ color, background: `${color}20`, borderRadius: 4 }}>{prop.conf}</span>
        </div>
      </div>
      <div className="h-1 bg-[#E0E0E0] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${prop.prob}%`, background: barColor }} />
      </div>
    </div>
  );
}

function ComparisonTile({ player, onRemove }: { player: Player; onRemove: () => void }) {
  const pid = PLAYER_IDS_MAP[player.id] || 0;
  const tier = TIER_STYLES[player.tier] ?? TIER_STYLES["A"];
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
      <div className="h-1" style={{ background: tier.color }} />
      <div className="p-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <PlayerHeadshot playerId={pid} playerName={player.name} size={40} />
            <div>
              <div className="font-condensed font-bold text-[13px] text-[#111] leading-none">{player.name}</div>
              <div className="font-mono text-[10px] text-[#888] mt-0.5">{player.position} · {player.teamAbbr}</div>
            </div>
          </div>
          <button onClick={onRemove} className="text-[#CCC] hover:text-[#888] transition-colors">
            <X size={13} />
          </button>
        </div>
        <div className="space-y-1.5">
          {[
            { label: "PTS", value: player.pts },
            { label: "REB", value: player.reb },
            { label: "AST", value: player.ast },
            { label: "STL", value: player.stl },
            { label: "BLK", value: player.blk },
            { label: "FG%", value: player.fg },
            { label: "FT%", value: player.ft },
            { label: "3PM", value: player.tpm },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-between py-1 border-b border-[#F5F5F5] last:border-0">
              <span className="font-condensed font-bold text-[10px] uppercase text-[#888] tracking-[0.5px]">{s.label}</span>
              <span className="font-mono font-semibold text-[12px] text-[#111]">{s.value}</span>
            </div>
          ))}
        </div>
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
  const [showAllGames, setShowAllGames] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showComparePicker, setShowComparePicker] = useState(false);

  if (!player) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="font-condensed font-bold text-[18px] uppercase text-[#888] tracking-[0.5px]">Player not found</p>
    </div>
  );

  const tier = TIER_STYLES[player.tier] ?? TIER_STYLES["A"];
  const pid = PLAYER_IDS_MAP[player.id] || 0;
  const gameLog = generateGameLog(player);
  const displayedLog = showAllGames ? gameLog : gameLog.slice(0, 5);
  const comparePlayers = compareIds.map(id => PLAYERS.find(p => p.id === id)).filter(Boolean) as Player[];
  const availableForCompare = PLAYERS.filter(p => p.id !== player.id && !compareIds.includes(p.id));

  const addCompare = (id: string) => {
    if (compareIds.length < 3) setCompareIds([...compareIds, id]);
    setShowComparePicker(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero — light with colored accent */}
      <div className="border-b border-[#E0E0E0] bg-[#F5F5F5]">
        <div className="max-w-[1100px] mx-auto px-4 py-6">
          <button onClick={onBack} data-testid="btn-back-players"
            className="flex items-center gap-1.5 font-condensed font-bold text-[11px] uppercase tracking-[0.5px] text-[#888] hover:text-[#111] transition-colors mb-5">
            <ArrowLeft size={13} /> All Players
          </button>

          <div className="flex items-start gap-6">
            {/* Big headshot */}
            <div className="flex-shrink-0">
              <PlayerHeadshot playerId={pid} playerName={player.name} size={96} className="rounded-lg shadow-md" />
            </div>

            {/* Name + stats */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-condensed font-bold text-[11px] uppercase tracking-[0.5px] px-2 py-1 rounded-sm"
                  style={{ color: tier.color, background: tier.bg }}>{tier.label}</span>
                <span className="font-mono text-[11px] text-[#888]">{player.position} · {player.team}</span>
              </div>
              <h1 className="font-condensed font-bold text-[40px] md:text-[48px] text-[#111] leading-none uppercase tracking-[0.5px] mb-4">
                {player.name}
              </h1>
              <div className="flex items-center gap-6 flex-wrap">
                {[
                  { label: "PTS", value: player.pts },
                  { label: "REB", value: player.reb },
                  { label: "AST", value: player.ast },
                  { label: "STL", value: player.stl },
                  { label: "FG%", value: player.fg },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="font-mono font-bold text-[26px] text-[#111] leading-none">{s.value}</div>
                    <div className="font-condensed font-bold text-[9px] uppercase text-[#AAA] tracking-[1px] mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-8">
        {/* Identity */}
        <section>
          <div className="border-l-[3px] pl-4" style={{ borderColor: tier.color }}>
            <div className="font-condensed font-bold text-[10px] uppercase text-[#AAA] tracking-[1px] mb-1">Courtside Identity</div>
            <p className="font-sans text-[16px] text-[#333] leading-snug font-medium">{player.identitySentence}</p>
          </div>
        </section>

        {/* Props */}
        <section>
          <div className="font-condensed font-bold text-[11px] uppercase text-[#888] tracking-[0.5px] mb-3">Tonight's Props</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {player.props.map((prop, i) => <PropBar key={i} prop={prop} />)}
          </div>
        </section>

        {/* L5 / L10 game log */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="font-condensed font-bold text-[11px] uppercase text-[#888] tracking-[0.5px]">
              Last {showAllGames ? "10" : "5"} Games
            </div>
            <button
              onClick={() => setShowAllGames(!showAllGames)}
              className="flex items-center gap-1 font-condensed font-semibold text-[11px] uppercase text-[#1D428A] hover:underline tracking-[0.5px]"
            >
              {showAllGames ? <><ChevronUp size={12} /> Show L5</> : <><ChevronDown size={12} /> Show L10</>}
            </button>
          </div>
          <div className="border border-[#E0E0E0] rounded-lg overflow-hidden">
            <div className="grid grid-cols-8 bg-[#F5F5F5] border-b border-[#E0E0E0]">
              {["Date", "OPP", "PTS", "REB", "AST", "STL", "BLK", "FG%"].map((h) => (
                <div key={h} className="font-condensed font-bold text-[10px] uppercase text-[#888] tracking-[0.5px] py-2.5 px-3 text-center">{h}</div>
              ))}
            </div>
            {displayedLog.map((g, i) => (
              <div key={i} className={`grid grid-cols-8 ${i < displayedLog.length - 1 ? "border-b border-[#F0F0F0]" : ""} hover:bg-[#F9F9F9]`}>
                <div className="font-mono text-[11px] text-[#888] py-2.5 px-3 text-center">{g.date}</div>
                <div className="font-condensed font-bold text-[11px] uppercase text-[#1D428A] py-2.5 px-3 text-center">{g.opp}</div>
                <div className="font-mono font-semibold text-[12px] text-[#111] py-2.5 px-3 text-center">{g.pts}</div>
                <div className="font-mono text-[12px] text-[#444] py-2.5 px-3 text-center">{g.reb}</div>
                <div className="font-mono text-[12px] text-[#444] py-2.5 px-3 text-center">{g.ast}</div>
                <div className="font-mono text-[12px] text-[#444] py-2.5 px-3 text-center">{g.stl}</div>
                <div className="font-mono text-[12px] text-[#444] py-2.5 px-3 text-center">{g.blk}</div>
                <div className="font-mono text-[12px] text-[#888] py-2.5 px-3 text-center">{g.fg}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Scout note */}
        <section>
          <div className="font-condensed font-bold text-[11px] uppercase text-[#888] tracking-[0.5px] mb-3">Scout Note</div>
          <div className="bg-[#F5F5F5] border border-[#E0E0E0] rounded-sm p-5">
            <p className="font-sans text-[14px] text-[#555] leading-relaxed">{player.scoutNote}</p>
          </div>
        </section>

        {/* Player comparison */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="font-condensed font-bold text-[11px] uppercase text-[#888] tracking-[0.5px]">
              Player Comparison {compareIds.length > 0 && `(${compareIds.length}/3)`}
            </div>
            {compareIds.length < 3 && (
              <button
                onClick={() => setShowComparePicker(!showComparePicker)}
                className="flex items-center gap-1 font-condensed font-bold text-[11px] uppercase text-[#1D428A] border border-[#1D428A] px-2 py-1 rounded-sm hover:bg-[#1D428A] hover:text-white transition-all tracking-[0.5px]"
              >
                <Plus size={11} /> Add Player
              </button>
            )}
          </div>

          {/* Player picker dropdown */}
          {showComparePicker && (
            <div className="mb-3 bg-white border border-[#E0E0E0] rounded-lg overflow-hidden shadow-md">
              {availableForCompare.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  onClick={() => addCompare(p.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F5F5F5] transition-colors border-b border-[#F0F0F0] last:border-0 text-left"
                >
                  <PlayerHeadshot playerId={PLAYER_IDS_MAP[p.id] || 0} playerName={p.name} size={28} />
                  <div>
                    <div className="font-sans font-semibold text-[12px] text-[#111]">{p.name}</div>
                    <div className="font-mono text-[10px] text-[#888]">{p.position} · {p.teamAbbr}</div>
                  </div>
                  <span className="ml-auto font-mono text-[11px] text-[#888]">{p.pts} PTS</span>
                </button>
              ))}
            </div>
          )}

          {comparePlayers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {comparePlayers.map((cp) => (
                <ComparisonTile key={cp.id} player={cp} onRemove={() => setCompareIds(compareIds.filter(id => id !== cp.id))} />
              ))}
            </div>
          )}

          {comparePlayers.length === 0 && (
            <div className="bg-[#F5F5F5] border border-dashed border-[#E0E0E0] rounded-lg p-6 text-center">
              <p className="font-sans text-[12px] text-[#AAA]">Add up to 3 players to compare stats side by side</p>
            </div>
          )}
        </section>

        {/* Footer */}
        <div className="text-center py-4 border-t border-[#E0E0E0]">
          <p className="font-sans text-[11px] text-[#AAA]">Educational analysis only — not financial advice.</p>
        </div>
      </div>
    </div>
  );
}
