import { TRENDING_INSIGHTS } from "@/lib/mock-data";
import { AskBar } from "@/components/AnalysisCard";
import { GameCard } from "@/components/GameCard";
import { HotTakes } from "@/components/HotTakes";
import { Headlines } from "@/components/Headlines";
import { StatLeaders } from "@/components/StatLeaders";
import { PollCard } from "@/components/PollCard";
import { SectionHeader } from "@/components/SectionHeader";
import { useNBAGames, generateCallsFromGames } from "@/hooks/use-nba-games.ts";
import { GAMES as MOCK_GAMES, ACTIVE_POLLS as MOCK_POLLS } from "@/lib/mock-data";
import { RefreshCw, Wifi, WifiOff, ChevronRight } from "lucide-react";

const CONF_COLORS: Record<string, string> = {
  HIGH: "#008248", MED: "#F5A623", COND: "#888",
};

interface TonightProps {
  onGameSelect: (gameId: string) => void;
}

export function Tonight({ onGameSelect }: TonightProps) {
  const { games: liveGames, loading, error, lastUpdated, hasLiveGames, refetch } = useNBAGames();

  const games = liveGames.length > 0 ? liveGames : MOCK_GAMES;
  const isLiveData = liveGames.length > 0;
  const polls = isLiveData ? generateCallsFromGames(liveGames).slice(0, 4) : MOCK_POLLS;
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen bg-white">
      {/* Ask bar hero */}
      <section className="border-b border-[#E0E0E0] bg-[#F5F5F5]">
        <div className="max-w-[1280px] mx-auto px-4 py-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="font-condensed font-bold text-[28px] uppercase text-[#111] leading-none tracking-[0.5px]">
                Tonight's Intelligence
              </h1>
              <p className="font-sans text-[13px] text-[#888] mt-1">
                AI-powered game analysis for {today} · {games.length} games on the slate
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {isLiveData ? (
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#008248]">
                  <Wifi size={11} /> LIVE DATA
                  {hasLiveGames && (
                    <span className="relative w-2 h-2 ml-1">
                      <span className="absolute inset-0 rounded-full bg-[#C8102E]" />
                      <span className="absolute inset-0 rounded-full bg-[#C8102E] animate-ping opacity-75" />
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#888]">
                  <WifiOff size={11} /> {loading ? "LOADING..." : "CACHED"}
                </span>
              )}
              <button onClick={refetch} className="p-1 hover:text-[#1D428A] text-[#AAA] transition-colors">
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
          <AskBar />
        </div>
      </section>

      {/* Trending signals */}
      <section className="py-4 border-b border-[#E0E0E0] bg-[#F5F5F5]">
        <div className="max-w-[1280px] mx-auto px-4">
          <SectionHeader title="Trending Signals" accentColor="#1D428A" />
          <div className="flex flex-wrap gap-2">
            {TRENDING_INSIGHTS.map((insight) => (
              <button key={insight.id} data-testid={`btn-trend-${insight.id}`}
                className="flex items-center gap-2 bg-white border border-[#E0E0E0] hover:border-[#1D428A] px-3 py-2 rounded-sm transition-colors">
                <span className="font-condensed font-bold text-[9px] uppercase tracking-[0.5px] px-1 py-0.5"
                  style={{ color: CONF_COLORS[insight.tag], background: `${CONF_COLORS[insight.tag]}18`, borderRadius: 3 }}>
                  {insight.tag}
                </span>
                <span className="font-sans text-[12px] text-[#444]">{insight.label}</span>
                <span className="font-mono text-[12px] font-semibold text-[#1D428A]">{insight.pct}%</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Two-column: Games + Courtside Calls */}
      <section className="py-5 border-b border-[#E0E0E0]">
        <div className="max-w-[1280px] mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-6">

            {/* Left: Games */}
            <div className="w-full md:w-[55%]">
              <SectionHeader title="Tonight's Games" />
              {loading && games.length === 0 ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-[120px] bg-[#F5F5F5] rounded-lg animate-pulse" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {games.map((game) => (
                    <div
                      key={game.id}
                      className="cursor-pointer group relative"
                      onClick={() => onGameSelect(game.id)}
                    >
                      <GameCard game={game as any} />
                      {/* Clickable overlay hint */}
                      <div className="absolute top-3 right-12 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="flex items-center gap-1 font-condensed font-semibold text-[10px] uppercase text-[#1D428A] tracking-[0.5px]">
                          Game Detail <ChevronRight size={10} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {lastUpdated && (
                <p className="font-mono text-[10px] text-[#AAA] mt-2">
                  Updated {lastUpdated.toLocaleTimeString()}{error && ` · ${error}`}
                </p>
              )}
            </div>

            {/* Right: Courtside Calls */}
            <div className="w-full md:w-[45%]">
              <div className="flex items-center justify-between">
                <SectionHeader title="Courtside Calls — Live" />
                <a href="#polls" className="font-condensed font-semibold text-[11px] uppercase text-[#1D428A] hover:underline tracking-[0.5px] mb-3">
                  See all →
                </a>
              </div>
              <p className="font-sans text-[12px] text-[#888] mb-3">
                {isLiveData ? "Auto-generated from tonight's real games." : "Vote with the analysis or fade it."} Earn points when you're right.
              </p>
              <div className="space-y-3">
                {polls.slice(0, 4).map((poll) => (
                  <PollCard key={poll.id} poll={poll as any} compact />
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      <HotTakes />
      <Headlines />
      <StatLeaders />

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
