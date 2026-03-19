import { useState } from "react";
import { ACTIVE_POLLS, RESOLVED_POLLS, LEADERBOARD } from "@/lib/mock-data";
import { PollCard } from "@/components/PollCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Trophy } from "lucide-react";
import { PlayerHeadshot, TeamLogo } from "@/components/TeamLogo";
import {
  extractPlayerId,
  extractPlayerName,
  extractTeamsFromGame,
} from "@/lib/player-ids";

const NBA_TEAM_IDS: Record<string, number> = {
  ATL: 1610612737, BOS: 1610612738, BKN: 1610612751, CHA: 1610612766,
  CHI: 1610612741, CLE: 1610612739, DAL: 1610612742, DEN: 1610612743,
  DET: 1610612765, GSW: 1610612744, HOU: 1610612745, IND: 1610612754,
  LAC: 1610612746, LAL: 1610612747, MEM: 1610612763, MIA: 1610612748,
  MIL: 1610612749, MIN: 1610612750, NOP: 1610612740, NYK: 1610612752,
  OKC: 1610612760, ORL: 1610612753, PHI: 1610612755, PHX: 1610612756,
  POR: 1610612757, SAC: 1610612758, SAS: 1610612759, TOR: 1610612761,
  UTA: 1610612762, WAS: 1610612764,
}

type Tab = "active" | "resolved" | "my";

const TIER_STYLES: Record<string, { color: string; label: string }> = {
  Courtside: { color: "#F5A623", label: "COURTSIDE" },
  "Floor Seat": { color: "#CCC", label: "FLOOR SEAT" },
  "Lower Bowl": { color: "#CD7F32", label: "LOWER BOWL" },
  "Upper Deck": { color: "#888", label: "UPPER DECK" },
};

const MY_CALLS = [
  { ...RESOLVED_POLLS[0], myVote: "agree" },
  { ...RESOLVED_POLLS[1], myVote: "agree" },
  { ...RESOLVED_POLLS[2], myVote: "fade" },
];

/** Smart image: player headshot if player detected, else both team logos */
function PollImage({
  proposition,
  game,
}: {
  proposition: string;
  game: string;
}) {
  const fullText = `${proposition} ${game}`;
  const playerId = extractPlayerId(fullText);
  const playerName = extractPlayerName(fullText);

  if (playerId && playerName) {
    return (
      <PlayerHeadshot playerId={playerId} playerName={playerName} size={40} />
    );
  }

  // Fall back to team logos
  const teams = extractTeamsFromGame(game);
  if (teams) {
    return (
      <div className="flex items-center gap-1">
        <TeamLogo
          abbr={teams[0]}
          teamId={NBA_TEAM_IDS[teams[0]] || 0}
          size={20}
        />
        <span className="font-mono text-[9px] text-[#CCC]">@</span>
        <TeamLogo
          abbr={teams[1]}
          teamId={NBA_TEAM_IDS[teams[1]] || 0}
          size={20}
        />
      </div>
    );
  }

  return null;
}

/** Enhanced poll card with smart image in header */
function EnhancedPollCard({ poll, compact }: { poll: any; compact?: boolean }) {
  return (
    <div className="relative">
      {/* Image badge top-right of the card */}
      <div className="absolute top-3 right-3 z-10">
        <PollImage proposition={poll.proposition} game={poll.game} />
      </div>
      <PollCard poll={poll} compact={compact} />
    </div>
  );
}

function LeaderboardSidebar() {
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden sticky top-24">
      <div className="px-4 py-3 border-b border-[#E0E0E0] bg-[#F5F5F5] flex items-center gap-2">
        <Trophy size={13} className="text-[#F5A623]" />
        <span className="font-condensed font-bold text-[13px] uppercase text-[#111] tracking-[0.5px]">
          Top Callers
        </span>
      </div>
      <div>
        {LEADERBOARD.slice(0, 8).map((entry) => {
          const tier = TIER_STYLES[entry.tier];
          const isWin = entry.streak.startsWith("W");
          return (
            <div
              key={entry.rank}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-[#F5F5F5] last:border-0 hover:bg-[#F5F5F5] transition-colors"
            >
              <span className="font-mono text-[12px] text-[#CCC] w-4 flex-shrink-0">
                {entry.rank}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-sans font-semibold text-[12px] text-[#111] truncate">
                    {entry.username}
                  </span>
                  <span
                    className="font-condensed font-bold text-[9px] uppercase tracking-[0.5px] px-1 py-0.5 flex-shrink-0"
                    style={{
                      color: tier.color,
                      background: `${tier.color}18`,
                      borderRadius: 3,
                    }}
                  >
                    {tier.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[10px] text-[#888]">
                    {entry.accuracy}% acc
                  </span>
                  <span
                    className="font-mono text-[10px] font-semibold"
                    style={{ color: isWin ? "#008248" : "#C8102E" }}
                  >
                    {entry.streak}
                  </span>
                </div>
              </div>
              <span className="font-mono font-semibold text-[12px] text-[#1D428A] flex-shrink-0">
                {entry.points}
              </span>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-3 border-t border-[#E0E0E0]">
        <button className="w-full font-condensed font-semibold text-[11px] uppercase tracking-[0.5px] text-[#1D428A] hover:underline">
          Full Leaderboard →
        </button>
      </div>
    </div>
  );
}

export function Polls() {
  const [activeTab, setActiveTab] = useState<Tab>("active");

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "active", label: "Live Calls", count: ACTIVE_POLLS.length },
    { key: "resolved", label: "Resolved", count: RESOLVED_POLLS.length },
    { key: "my", label: "My Calls", count: MY_CALLS.length },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-[#E0E0E0] bg-[#F5F5F5]">
        <div className="max-w-[1280px] mx-auto px-4 py-5">
          <SectionHeader title="Courtside Calls" accentColor="#1D428A" />
          <p className="font-sans text-[12px] text-[#888] mt-1">
            Vote with the model or fade it. Earn points when you're right.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E0E0E0]">
        <div className="max-w-[1280px] mx-auto px-4">
          <div className="flex gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 font-condensed font-bold text-[12px] uppercase tracking-[0.5px] border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-[#1D428A] text-[#1D428A]"
                    : "border-transparent text-[#888] hover:text-[#444]"
                }`}
              >
                {tab.label}
                <span
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm"
                  style={{
                    background: activeTab === tab.key ? "#1D428A18" : "#F0F0F0",
                    color: activeTab === tab.key ? "#1D428A" : "#888",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1280px] mx-auto px-4 py-5">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main polls grid */}
          <div className="flex-1">
            {activeTab === "active" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ACTIVE_POLLS.map((poll) => (
                  <EnhancedPollCard key={poll.id} poll={poll} />
                ))}
              </div>
            )}
            {activeTab === "resolved" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {RESOLVED_POLLS.map((poll) => (
                  <EnhancedPollCard key={poll.id} poll={poll} />
                ))}
              </div>
            )}
            {activeTab === "my" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MY_CALLS.map((poll) => (
                  <EnhancedPollCard key={poll.id} poll={poll} />
                ))}
              </div>
            )}
          </div>

          {/* Leaderboard sidebar */}
          <div className="w-full lg:w-[280px] flex-shrink-0">
            <LeaderboardSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
