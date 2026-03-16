import { GAMES, TRENDING_INSIGHTS } from "@/lib/mock-data";
import { AskBar } from "@/components/AnalysisCard";
import { GameCard } from "@/components/GameCard";
import { HotTakes } from "@/components/HotTakes";
import { Headlines } from "@/components/Headlines";
import { StatLeaders } from "@/components/StatLeaders";
import { PollCard } from "@/components/PollCard";
import { SectionHeader } from "@/components/SectionHeader";
import { ACTIVE_POLLS } from "@/lib/mock-data";

const CONF_COLORS: Record<string, string> = {
  HIGH: "#008248",
  MED: "#F5A623",
  COND: "#888",
};

export function Tonight() {
  return (
    <div className="min-h-screen bg-white">
      {/* Ask bar hero */}
      <section className="border-b border-[#E0E0E0] bg-[#F5F5F5]">
        <div className="max-w-[1280px] mx-auto px-4 py-5">
          <div className="mb-4">
            <h1 className="font-condensed font-bold text-[28px] uppercase text-[#111] leading-none tracking-[0.5px]">
              Tonight's Intelligence
            </h1>
            <p className="font-sans text-[13px] text-[#888] mt-1">
              AI-powered game analysis for March 16, 2026 · 6 games on the slate
            </p>
          </div>
          <AskBar />
        </div>
      </section>

      {/* Games list */}
      <section className="py-5 border-b border-[#E0E0E0]">
        <div className="max-w-[1280px] mx-auto px-4">
          <SectionHeader title="Tonight's Games" />
          <div className="space-y-3">
            {GAMES.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      </section>

      {/* Trending signals */}
      <section className="py-4 border-b border-[#E0E0E0] bg-[#F5F5F5]">
        <div className="max-w-[1280px] mx-auto px-4">
          <SectionHeader title="Trending Signals" accentColor="#1D428A" />
          <div className="flex flex-wrap gap-2">
            {TRENDING_INSIGHTS.map((insight) => (
              <button
                key={insight.id}
                data-testid={`btn-trend-${insight.id}`}
                className="flex items-center gap-2 bg-white border border-[#E0E0E0] hover:border-[#1D428A] px-3 py-2 rounded-sm transition-colors"
              >
                <span
                  className="font-condensed font-bold text-[9px] uppercase tracking-[0.5px] px-1 py-0.5"
                  style={{ color: CONF_COLORS[insight.tag], background: `${CONF_COLORS[insight.tag]}18`, borderRadius: 3 }}
                >
                  {insight.tag}
                </span>
                <span className="font-sans text-[12px] text-[#444]">{insight.label}</span>
                <span className="font-mono text-[12px] font-semibold text-[#1D428A]">{insight.pct}%</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Active Polls */}
      <section className="py-5 border-b border-[#E0E0E0]">
        <div className="max-w-[1280px] mx-auto px-4">
          <SectionHeader title="Courtside Calls — Live" />
          <p className="font-sans text-[12px] text-[#888] mb-3">
            Vote with the analysis or fade it. Earn points when you're right.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ACTIVE_POLLS.map((poll) => (
              <PollCard key={poll.id} poll={poll} compact />
            ))}
          </div>
        </div>
      </section>

      {/* Hot Takes */}
      <HotTakes />

      {/* Headlines */}
      <Headlines />

      {/* Stat Leaders */}
      <StatLeaders />

      {/* Footer disclaimer */}
      <div className="py-6 border-t border-[#E0E0E0] bg-[#F5F5F5]">
        <div className="max-w-[1280px] mx-auto px-4 text-center">
          <p className="font-sans text-[11px] text-[#AAA]">
            Courtside provides educational analysis only — not financial advice. Always gamble responsibly.
          </p>
        </div>
      </div>
    </div>
  );
}
