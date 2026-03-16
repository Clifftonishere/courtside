import { useState, useEffect } from "react";
import { MOCK_ANALYSES } from "@/lib/mock-data";
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

type Analysis = typeof MOCK_ANALYSES["default"];

const LOADING_STEPS = [
  "Parsing your input",
  "Identifying players & teams",
  "Loading 77,738 game logs",
  "Pulling historical splits",
  "Analyzing live market signals",
  "Running confidence model",
  "Generating EDGE signal",
];

function ProbBadge({ prob, lean }: { prob: number; lean: string }) {
  const color = prob > 55 ? "#16a34a" : prob < 45 ? "#dc2626" : "#d97706";
  return (
    <div className="text-right">
      <div className="font-mono font-bold leading-none" style={{ fontSize: 32, color }}>
        {prob}%
      </div>
      <div
        className="font-mono text-xs font-semibold mt-1 uppercase tracking-wider"
        style={{ color }}
      >
        LEAN {lean}
      </div>
    </div>
  );
}

function ConfBadge({ conf }: { conf: string }) {
  const cfg = {
    HIGH: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
    MED: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
    COND: { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" },
  }[conf] ?? { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" };

  return (
    <span
      className="font-mono text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded border"
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      {conf}
    </span>
  );
}

interface AnalysisCardProps {
  analysis: Analysis;
}

export function AnalysisCard({ analysis }: AnalysisCardProps) {
  const [betAmount, setBetAmount] = useState(25);

  return (
    <div
      data-testid="analysis-card"
      className="border border-[#E4E4E0] rounded-xl overflow-hidden bg-white fade-up"
    >
      {/* Header */}
      <div className="p-5 flex items-start justify-between gap-4 border-b border-[#E4E4E0]">
        <div>
          <div className="font-mono text-[10px] text-[#AEAEA8] uppercase tracking-widest mb-1">
            Analysis
          </div>
          <div className="font-sans font-semibold text-[#1A1A18] text-lg leading-tight">
            {analysis.player} — {analysis.stat} {analysis.threshold}
          </div>
          <div className="font-mono text-xs text-[#7A7A74] mt-0.5">{analysis.game}</div>
        </div>
        <ProbBadge prob={analysis.prob} lean={analysis.lean} />
      </div>

      {/* Splits */}
      <div className="border-b border-[#E4E4E0]">
        <div className="flex">
          {analysis.splits.map((s, i) => (
            <div
              key={i}
              className="flex-1 px-4 py-3 text-center border-r border-[#E4E4E0] last:border-r-0"
            >
              <div className="font-mono text-xs text-[#AEAEA8] uppercase tracking-wide mb-1">
                {s.label}
              </div>
              <div className="font-mono font-semibold text-sm text-[#1A1A18]">{s.val}</div>
              <div className="font-mono text-[10px] text-[#AEAEA8] mt-0.5">{s.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Edge Signal */}
      <div className="bg-[#F3F3F0] px-5 py-4 border-b border-[#E4E4E0]">
        <div className="font-mono text-[10px] text-[#AEAEA8] uppercase tracking-widest mb-2">
          Edge Signal
        </div>
        <p className="font-sans text-sm text-[#4A4A46] leading-relaxed">{analysis.signal}</p>
      </div>

      {/* Last 5 + Market */}
      <div className="grid grid-cols-2 border-b border-[#E4E4E0]">
        {/* Last 5 */}
        <div className="p-4 border-r border-[#E4E4E0]">
          <div className="font-mono text-[10px] text-[#AEAEA8] uppercase tracking-widest mb-3">
            Last 5 Games
          </div>
          <div className="space-y-1.5">
            {analysis.lastFive.map((g, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-[#7A7A74]">
                  {g.date} {g.opp}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-[#1A1A18]">
                    {g.result}
                  </span>
                  <span
                    className="font-mono text-[10px] font-semibold"
                    style={{ color: g.hit ? "#16a34a" : "#dc2626" }}
                  >
                    {g.hit ? "HIT" : "MISS"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Comparison */}
        <div className="p-4">
          <div className="font-mono text-[10px] text-[#AEAEA8] uppercase tracking-widest mb-3">
            Market Comparison
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-[#7A7A74]">Courtside</span>
              <span className="font-mono text-[11px] font-semibold text-[#1A1A18]">
                {analysis.market.courtside}.0%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-[#7A7A74]">FanDuel</span>
              <span className="font-mono text-[11px] font-semibold text-[#1A1A18]">
                {analysis.market.fanDuel}%
              </span>
            </div>
            <div className="font-mono text-[10px] text-[#7A7A74] mt-1">{analysis.market.line}</div>
            {analysis.market.diverge && (
              <div className="mt-2 flex items-start gap-1.5 bg-[#fffbeb] border border-[#fde68a] rounded-lg p-2">
                <AlertTriangle className="w-3 h-3 text-[#d97706] mt-0.5 shrink-0" />
                <span className="font-mono text-[10px] text-[#d97706]">
                  Market prices {analysis.market.divergeDir} higher than our model
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div className="px-5 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[10px] text-[#7A7A74]">
            Form:{" "}
            <span className="text-[#16a34a] font-semibold">{analysis.form}</span>
          </span>
          <span className="text-[#E4E4E0] font-mono">|</span>
          <span className="font-mono text-[10px] text-[#7A7A74]">{analysis.defense}</span>
          <span className="text-[#E4E4E0] font-mono">|</span>
          <ConfBadge conf={analysis.conf} />
        </div>
        <span className="font-mono text-[10px] text-[#AEAEA8] italic">
          Educational analysis, not financial advice.
        </span>
      </div>
    </div>
  );
}

interface AskBarProps {
  onSubmit: (query: string) => void;
}

export function AskBar({ onSubmit }: AskBarProps) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const EXAMPLE_QUERIES = [
    "Will Brunson score 30+ tonight?",
    "Jokic triple-double vs Lakers?",
    "SGA over 32 points vs Dallas?",
    "Who wins Celtics vs Knicks?",
    "Curry 5+ threes tonight?",
  ];

  const handleSubmit = (q = query) => {
    if (!q.trim()) return;
    setIsLoading(true);
    setLoadingStep(0);

    const stepThroughLoading = (step: number) => {
      if (step < LOADING_STEPS.length) {
        setLoadingStep(step);
        setTimeout(() => stepThroughLoading(step + 1), 450 + Math.random() * 200);
      } else {
        setIsLoading(false);
        onSubmit(q);
      }
    };
    stepThroughLoading(0);
  };

  if (isLoading) {
    return (
      <div className="border border-[#E4E4E0] rounded-xl bg-white p-6">
        <div className="font-mono text-xs text-[#AEAEA8] mb-4">
          Analyzing across 77,738 game logs, live markets, form signals...
        </div>
        <div className="space-y-2">
          {LOADING_STEPS.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              {i < loadingStep ? (
                <span className="text-[#16a34a] font-mono text-xs">✓</span>
              ) : i === loadingStep ? (
                <div className="w-3 h-3 border-2 border-[#1A1A18] border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <span className="w-3 h-3 rounded-full border border-[#E4E4E0] shrink-0" />
              )}
              <span
                className={`font-mono text-xs ${
                  i <= loadingStep ? "text-[#1A1A18]" : "text-[#AEAEA8]"
                }`}
              >
                {step}
              </span>
              {i === loadingStep && (
                <div className="flex-1 h-0.5 bg-[#E4E4E0] rounded overflow-hidden">
                  <div className="h-full bg-[#1A1A18] shimmer" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative border border-[#E4E4E0] rounded-xl bg-white overflow-hidden focus-within:border-[#1A1A18] transition-colors">
        <input
          data-testid="ask-bar-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder='Ask anything — "Will Brunson score 30 tonight?" or "Jokic triple-double odds?"'
          className="w-full font-sans text-sm text-[#1A1A18] placeholder:text-[#AEAEA8] bg-transparent px-5 py-4 pr-28 outline-none"
        />
        <button
          data-testid="analyze-button"
          onClick={() => handleSubmit()}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#1A1A18] text-white font-sans font-medium text-sm px-4 py-2 rounded-lg hover-elevate transition-all"
        >
          Analyze
        </button>
      </div>

      {/* Example chips */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_QUERIES.map((q, i) => (
          <button
            key={i}
            data-testid={`example-chip-${i}`}
            onClick={() => {
              setQuery(q);
              handleSubmit(q);
            }}
            className="font-sans text-xs italic text-[#7A7A74] border border-[#E4E4E0] rounded-full px-3 py-1.5 hover-elevate transition-all bg-white"
          >
            "{q}"
          </button>
        ))}
      </div>
    </div>
  );
}

export function LoadingAnalysis() {
  return (
    <div className="border border-[#E4E4E0] rounded-xl bg-white overflow-hidden shimmer h-64" />
  );
}
