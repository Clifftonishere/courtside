import { useState } from "react";
import { RESOLVED_POLLS, LEADERBOARD } from "@/lib/mock-data";
import { PollCard } from "@/components/PollCard";
import { MarketCard } from "@/components/MarketCard";
import { SectionHeader } from "@/components/SectionHeader";
import { useEdgeMarkets } from "@/hooks/use-edge-markets";
import { Trophy, User, TrendingUp, Wifi, WifiOff } from "lucide-react";

type Tab = "active" | "resolved" | "my";

const TIER_STYLES: Record<string, { color: string; label: string }> = {
  "Courtside": { color: "#F5A623", label: "COURTSIDE" },
  "Floor Seat": { color: "#CCC", label: "FLOOR SEAT" },
  "Lower Bowl": { color: "#CD7F32", label: "LOWER BOWL" },
  "Upper Deck": { color: "#888", label: "UPPER DECK" },
};

// Mock current user stats
const MY_STATS = {
  username: "ClifftonLee",
  points: 612,
  rank: 7,
  accuracy: 60,
  streak: "W3",
  tier: "Lower Bowl",
};

const MY_CALLS = [
  { ...RESOLVED_POLLS[0], myVote: "agree" },
  { ...RESOLVED_POLLS[1], myVote: "agree" },
  { ...RESOLVED_POLLS[2], myVote: "fade" },
];

function MyStatsBanner() {
  const tierStyle = TIER_STYLES[MY_STATS.tier] || { color: "#888", label: "UPPER DECK" };
  const streakWin = MY_STATS.streak.startsWith("W");
  return (
    <div className="bg-[#111] rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#1D428A] flex items-center justify-center">
          <User size={14} className="text-white" />
        </div>
        <div>
          <div className="font-condensed font-bold text-[13px] text-white">{MY_STATS.username}</div>
          <span className="font-condensed font-bold text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-sm"
            style={{ color: tierStyle.color, background: `${tierStyle.color}25` }}>
            {tierStyle.label}
          </span>
        </div>
        <div className="ml-auto text-right">
          <div className="font-mono font-bold text-[18px] text-[#F5A623]">{MY_STATS.points}</div>
          <div className="font-condensed font-bold text-[9px] uppercase text-white/40 tracking-[0.5px]">Points</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Rank", value: `#${MY_STATS.rank}`, color: "#F5A623" },
          { label: "Accuracy", value: `${MY_STATS.accuracy}%`, color: "#008248" },
          { label: "Streak", value: MY_STATS.streak, color: streakWin ? "#008248" : "#C8102E" },
        ].map((s) => (
          <div key={s.label} className="text-center bg-white/5 rounded-sm py-2">
            <div className="font-mono font-bold text-[15px]" style={{ color: s.color }}>{s.value}</div>
            <div className="font-condensed font-bold text-[9px] uppercase text-white/30 tracking-[0.5px] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardSidebar() {
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden sticky top-24">
      {/* My stats banner */}
      <div className="p-4 bg-[#111]">
        <MyStatsBanner />
      </div>

      {/* Top callers */}
      <div className="px-4 py-3 border-b border-[#E0E0E0] bg-[#F5F5F5] flex items-center gap-2">
        <Trophy size={13} className="text-[#F5A623]" />
        <span className="font-condensed font-bold text-[13px] uppercase text-[#111] tracking-[0.5px]">Top Callers</span>
      </div>
      <div>
        {LEADERBOARD.slice(0, 8).map((entry) => {
          const tier = TIER_STYLES[entry.tier] || { color: "#888", label: "" };
          const isWin = entry.streak.startsWith("W");
          const isMe = entry.username === MY_STATS.username;
          return (
            <div key={entry.rank}
              className={`flex items-center gap-3 px-4 py-2.5 border-b border-[#F5F5F5] last:border-0 transition-colors ${isMe ? "bg-[#F0F4FF]" : "hover:bg-[#F5F5F5]"}`}>
              <span className="font-mono text-[12px] text-[#CCC] w-4 flex-shrink-0">{entry.rank}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`font-sans font-semibold text-[12px] truncate ${isMe ? "text-[#1D428A]" : "text-[#111]"}`}>
                    {entry.username}{isMe && " (you)"}
                  </span>
                  <span className="font-condensed font-bold text-[9px] uppercase tracking-[0.5px] px-1 py-0.5 flex-shrink-0"
                    style={{ color: tier.color, background: `${tier.color}18`, borderRadius: 3 }}>
                    {tier.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[10px] text-[#888]">{entry.accuracy}% acc</span>
                  <span className="font-mono text-[10px] font-semibold" style={{ color: isWin ? "#008248" : "#C8102E" }}>
                    {entry.streak}
                  </span>
                </div>
              </div>
              <span className="font-mono font-semibold text-[12px] text-[#1D428A] flex-shrink-0">{entry.points}</span>
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
  const { markets, isLive, loading } = useEdgeMarkets();

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "active", label: "Edge Markets", count: markets.length },
    { key: "resolved", label: "Resolved", count: RESOLVED_POLLS.length },
    { key: "my", label: "My Calls", count: MY_CALLS.length },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-[#E0E0E0] bg-[#F5F5F5]">
        <div className="max-w-[1280px] mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <SectionHeader title="Courtside Markets" accentColor="#1D428A" />
              <p className="font-sans text-[12px] text-[#888] mt-1">
                Edge intelligence — sportsbook consensus vs prediction market prices.
              </p>
            </div>
            <span className={`flex items-center gap-1.5 font-mono text-[11px] ${isLive ? "text-[#008248]" : "text-[#888]"}`}>
              {isLive ? <><Wifi size={11} /> LIVE</> : <><WifiOff size={11} /> {loading ? "LOADING..." : "OFFLINE"}</>}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E0E0E0]">
        <div className="max-w-[1280px] mx-auto px-4">
          <div className="flex gap-0">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 font-condensed font-bold text-[12px] uppercase tracking-[0.5px] border-b-2 transition-colors ${
                  activeTab === tab.key ? "border-[#1D428A] text-[#1D428A]" : "border-transparent text-[#888] hover:text-[#444]"
                }`}>
                {tab.label}
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm"
                  style={{ background: activeTab === tab.key ? "#1D428A18" : "#F0F0F0", color: activeTab === tab.key ? "#1D428A" : "#888" }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-5">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            {activeTab === "active" && (
              markets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {markets.map((market) => <MarketCard key={market.id} market={market} />)}
                </div>
              ) : (
                <div className="bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg p-8 text-center">
                  <p className="font-sans text-[14px] text-[#888]">
                    {loading ? "Loading markets..." : "No markets available yet"}
                  </p>
                  <p className="font-mono text-[11px] text-[#AAA] mt-2">
                    Markets appear when today's games have odds posted
                  </p>
                </div>
              )
            )}
            {activeTab === "resolved" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {RESOLVED_POLLS.map((poll) => <PollCard key={poll.id} poll={poll} />)}
              </div>
            )}
            {activeTab === "my" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MY_CALLS.map((poll) => <PollCard key={poll.id} poll={poll as any} />)}
              </div>
            )}
          </div>
          <div className="w-full lg:w-[280px] flex-shrink-0">
            <LeaderboardSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
