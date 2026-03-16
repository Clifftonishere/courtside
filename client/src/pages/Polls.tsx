import { useState } from "react";
import { ACTIVE_POLLS, RESOLVED_POLLS, LEADERBOARD } from "@/lib/mock-data";
import { PollCard } from "@/components/PollCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Trophy, TrendingUp } from "lucide-react";

type Tab = "active" | "resolved" | "my";

const TIER_STYLES: Record<string, { color: string; label: string }> = {
  "Courtside": { color: "#F5A623", label: "COURTSIDE" },
  "Floor Seat": { color: "#CCC", label: "FLOOR SEAT" },
  "Lower Bowl": { color: "#CD7F32", label: "LOWER BOWL" },
  "Upper Deck": { color: "#888", label: "UPPER DECK" },
};

const MY_CALLS = [
  { ...RESOLVED_POLLS[0], myVote: "agree" },
  { ...RESOLVED_POLLS[1], myVote: "agree" },
  { ...RESOLVED_POLLS[2], myVote: "fade" },
];

function LeaderboardSidebar() {
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden sticky top-24">
      <div className="px-4 py-3 border-b border-[#E0E0E0] bg-[#F5F5F5] flex items-center gap-2">
        <Trophy size={13} className="text-[#F5A623]" />
        <span className="font-condensed font-bold text-[13px] uppercase text-[#111] tracking-[0.5px]">Top Callers</span>
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
              <span className="font-mono text-[12px] text-[#CCC] w-4 flex-shrink-0">{entry.rank}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-sans font-semibold text-[12px] text-[#111] truncate">{entry.username}</span>
                  <span
                    className="font-condensed font-bold text-[9px] uppercase tracking-[0.5px] px-1 py-0.5 flex-shrink-0"
                    style={{ color: tier.color, background: `${tier.color}18`, borderRadius: 3 }}
                  >
                    {tier.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[10px] text-[#888]">{entry.accuracy}% acc</span>
                  <span className={`font-mono text-[10px] font-semibold ${isWin ? "text-[#008248]" : "text-[#C8102E]"}`}>
                    {entry.streak}
                  </span>
                </div>
              </div>
              <span className="font-mono font-bold text-[13px] text-[#1D428A] flex-shrink-0">
                {entry.points}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Polls() {
  const [activeTab, setActiveTab] = useState<Tab>("active");

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: "active", label: "Active", count: ACTIVE_POLLS.length },
    { id: "resolved", label: "Resolved", count: RESOLVED_POLLS.length },
    { id: "my", label: "My Calls", count: MY_CALLS.length },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Page header */}
      <div className="border-b border-[#E0E0E0] bg-[#F5F5F5]">
        <div className="max-w-[1280px] mx-auto px-4 py-5">
          <h1 className="font-condensed font-bold text-[28px] uppercase text-[#111] leading-none tracking-[0.5px] mb-1">
            Courtside Calls
          </h1>
          <p className="font-sans text-[13px] text-[#888]">
            Vote AGREE or FADE on Courtside's analysis picks. Earn reputation points when you're right.
          </p>

          {/* Points info */}
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { label: "HIGH call correct", pts: "+3 pts", color: "#008248" },
              { label: "MED call correct", pts: "+5 pts", color: "#F5A623" },
              { label: "COND call correct", pts: "+8 pts", color: "#888" },
              { label: "Poll gets 10+ votes", pts: "+2 pts", color: "#1D428A" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 bg-white border border-[#E0E0E0] rounded-sm px-3 py-1.5">
                <span className="font-condensed font-bold text-[11px]" style={{ color: item.color }}>{item.pts}</span>
                <span className="font-sans text-[11px] text-[#555]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-5">
        <div className="flex gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <div className="flex items-center gap-0.5 mb-4 border-b border-[#E0E0E0]">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`tab-polls-${tab.id}`}
                  className={`flex items-center gap-1.5 font-condensed font-bold text-[13px] uppercase tracking-[0.5px] px-4 py-2.5 border-b-2 transition-all -mb-px ${
                    activeTab === tab.id
                      ? "border-[#1D428A] text-[#1D428A]"
                      : "border-transparent text-[#888] hover:text-[#444]"
                  }`}
                >
                  {tab.label}
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-sm ${activeTab === tab.id ? "bg-[#1D428A20] text-[#1D428A]" : "bg-[#F0F0F0] text-[#888]"}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Active polls */}
            {activeTab === "active" && (
              <div className="space-y-3">
                <SectionHeader title="Open for Voting" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ACTIVE_POLLS.map((poll) => (
                    <PollCard key={poll.id} poll={poll} />
                  ))}
                </div>
              </div>
            )}

            {/* Resolved polls */}
            {activeTab === "resolved" && (
              <div className="space-y-3">
                <SectionHeader title="Resolved Calls" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {RESOLVED_POLLS.map((poll) => (
                    <PollCard key={poll.id} poll={poll as any} />
                  ))}
                </div>
              </div>
            )}

            {/* My calls */}
            {activeTab === "my" && (
              <div className="space-y-4">
                {/* Stats summary */}
                <div className="bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Total Points", value: "124", color: "#1D428A" },
                      { label: "Accuracy", value: "67%", color: "#008248" },
                      { label: "Current Streak", value: "W3", color: "#008248" },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center">
                        <div className="font-mono font-bold text-[28px] leading-none" style={{ color: stat.color }}>
                          {stat.value}
                        </div>
                        <div className="font-condensed font-semibold text-[11px] uppercase text-[#888] mt-1 tracking-[0.5px]">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <SectionHeader title="Your Voting History" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {MY_CALLS.map((call) => (
                    <div key={call.id}>
                      <div className="mb-1.5 flex items-center gap-2">
                        <TrendingUp size={11} className="text-[#888]" />
                        <span className="font-mono text-[10px] text-[#888]">
                          You voted: <span className="font-semibold text-[#444]">{call.myVote === "agree" ? "AGREE" : "FADE"}</span>
                        </span>
                      </div>
                      <PollCard poll={call as any} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard sidebar */}
          <div className="hidden lg:block w-[280px] flex-shrink-0">
            <LeaderboardSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
