import { useState } from "react";
import { GAMES, MOCK_ANALYSES, TRENDING_INSIGHTS } from "@/lib/mock-data";
import { AskBar, AnalysisCard } from "@/components/AnalysisCard";
import { GameCard } from "@/components/GameCard";
import { TrendingUp } from "lucide-react";

function getAnalysisForQuery(query: string) {
  const q = query.toLowerCase();
  if (q.includes("sga") || q.includes("gilgeous")) return MOCK_ANALYSES["sga"];
  if (q.includes("jokic") || q.includes("triple")) return MOCK_ANALYSES["jokic"];
  return MOCK_ANALYSES["default"];
}

export function Tonight() {
  const [analysis, setAnalysis] = useState<typeof MOCK_ANALYSES["default"] | null>(null);
  const [prefilledQuery, setPrefilledQuery] = useState("");

  const handleQuery = (q: string) => {
    setAnalysis(getAnalysisForQuery(q));
  };

  const handleTrendingClick = (query: string) => {
    setPrefilledQuery(query);
    setAnalysis(getAnalysisForQuery(query));
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] pt-22">
      <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-10">

        {/* Ask Bar Section */}
        <section data-testid="ask-section">
          <div className="mb-4">
            <h1 className="font-sans font-bold text-2xl text-[#1A1A18] tracking-tight mb-1">
              Ask Courtside
            </h1>
            <p className="font-sans text-sm text-[#7A7A74]">
              Powered by 77,738 game logs, live market signals, and the Courtside model.
            </p>
          </div>
          <AskBar onSubmit={handleQuery} />
          {analysis && (
            <div className="mt-4">
              <AnalysisCard analysis={analysis} />
            </div>
          )}
        </section>

        {/* Games Section */}
        <section data-testid="games-section">
          <div className="flex items-center justify-between mb-4">
            <div className="font-mono text-[11px] text-[#AEAEA8] uppercase tracking-widest">
              Tonight's Games
            </div>
            <div className="font-mono text-[11px] text-[#AEAEA8]">
              Mar 15, 2026
            </div>
          </div>

          <div className="space-y-3">
            {GAMES.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>

        {/* Trending Insights */}
        <section data-testid="trending-section">
          <div className="font-mono text-[11px] text-[#AEAEA8] uppercase tracking-widest mb-4">
            Trending Signals
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TRENDING_INSIGHTS.map((insight, i) => (
              <button
                key={i}
                data-testid={`trending-insight-${i}`}
                onClick={() => handleTrendingClick(insight.query)}
                className="text-left border border-[#E4E4E0] rounded-xl bg-white p-4 hover-elevate transition-all"
              >
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-sans text-sm text-[#4A4A46] leading-snug">
                      {insight.text}
                    </p>
                    <span className="font-mono text-[10px] text-[#AEAEA8] mt-1 block">
                      Ask → "{insight.query}"
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Footer disclaimer */}
        <div className="text-center py-4 border-t border-[#E4E4E0]">
          <p className="font-mono text-[10px] text-[#AEAEA8] italic">
            Educational analysis only. Not financial advice. Courtside does not facilitate real-money wagering.
          </p>
        </div>
      </div>
    </div>
  );
}
