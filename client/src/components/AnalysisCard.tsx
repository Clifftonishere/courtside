import { useState, useEffect } from "react";
import { MOCK_ANALYSES } from "@/lib/mock-data";
import { Zap, CheckCircle, AlertCircle, Plus } from "lucide-react";

type ConfTier = "HIGH" | "MED" | "COND";

type Analysis = {
  id: string;
  query: string;
  steps: string[];
  result: {
    title: string;
    body: string;
    confidence: ConfTier;
    prob: number;
    signal: string;
    pollProposition: string;
    verdictLabel: string;
  };
};

const CONF_STYLES: Record<ConfTier, { bg: string; text: string; border: string }> = {
  HIGH: { bg: "bg-[#008248]", text: "text-white", border: "border-[#008248]" },
  MED: { bg: "bg-[#F5A623]", text: "text-[#111]", border: "border-[#F5A623]" },
  COND: { bg: "bg-[#888]", text: "text-white", border: "border-[#888]" },
};

const CONF_LABEL_COLOR: Record<ConfTier, string> = {
  HIGH: "#008248",
  MED: "#F5A623",
  COND: "#888",
};

function ConfBadge({ tier }: { tier: ConfTier }) {
  const s = CONF_STYLES[tier];
  return (
    <span
      className={`font-condensed font-bold text-[10px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-sm ${s.bg} ${s.text}`}
      style={{ borderRadius: 4 }}
    >
      {tier}
    </span>
  );
}

function LoadingStep({ step, index, currentStep }: { step: string; index: number; currentStep: number }) {
  const isDone = index < currentStep;
  const isActive = index === currentStep;

  return (
    <div className={`flex items-center gap-2.5 py-1.5 transition-all ${isActive ? "opacity-100" : isDone ? "opacity-60" : "opacity-20"}`}>
      <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
        {isDone ? (
          <CheckCircle size={14} className="text-[#008248]" />
        ) : isActive ? (
          <div className="w-3 h-3 rounded-full border-2 border-[#1D428A] border-t-transparent animate-spin" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-[#ddd]" />
        )}
      </div>
      <span className={`font-sans text-[12px] ${isActive ? "text-[#111] font-semibold" : isDone ? "text-[#555]" : "text-[#bbb]"}`}>
        {step}
      </span>
    </div>
  );
}

interface AnalysisCardProps {
  analysis: Analysis;
  onCreatePoll?: (proposition: string) => void;
}

export function AnalysisCard({ analysis, onCreatePoll }: AnalysisCardProps) {
  const [showPollCreated, setShowPollCreated] = useState(false);

  const handleCreatePoll = () => {
    setShowPollCreated(true);
    if (onCreatePoll) onCreatePoll(analysis.result.pollProposition);
  };

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden fade-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E0E0E0] bg-[#F5F5F5]">
        <div className="flex items-center gap-2">
          <Zap size={13} className="text-[#1D428A]" />
          <span className="font-condensed font-bold text-[13px] uppercase text-[#111] tracking-[0.5px]">
            Courtside Analysis
          </span>
        </div>
        <ConfBadge tier={analysis.result.confidence} />
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-condensed font-bold text-[20px] text-[#111] leading-tight mb-2">
          {analysis.result.title}
        </h3>
        <p className="font-sans text-[14px] text-[#444] leading-relaxed mb-4">
          {analysis.result.body}
        </p>

        {/* Signal bar */}
        <div className="flex items-center gap-3 p-3 bg-[#F5F5F5] border border-[#E0E0E0] rounded-sm mb-4">
          <div
            className="font-condensed font-bold text-[15px] uppercase tracking-[0.5px]"
            style={{ color: CONF_LABEL_COLOR[analysis.result.confidence] }}
          >
            {analysis.result.signal}
          </div>
          <div className="flex-1" />
          <div className="font-mono text-[20px] font-semibold text-[#1D428A]">
            {analysis.result.prob}%
          </div>
        </div>

        {/* Disclaimer */}
        <p className="font-sans text-[11px] text-[#AAA] mb-4">
          Educational analysis only — not financial advice.
        </p>

        {/* Create a Courtside Call */}
        <div className="border border-[#E0E0E0] rounded-sm p-3">
          <div className="flex items-center gap-2 mb-2">
            <Plus size={13} className="text-[#1D428A]" />
            <span className="font-condensed font-bold text-[12px] uppercase text-[#111] tracking-[0.5px]">
              Create a Courtside Call
            </span>
          </div>
          <p className="font-sans text-[13px] text-[#444] mb-1">
            "{analysis.result.pollProposition}"
          </p>
          <p className="font-mono text-[11px] mb-3" style={{ color: CONF_LABEL_COLOR[analysis.result.confidence] }}>
            Your analysis: {analysis.result.verdictLabel} · {analysis.result.prob}%
          </p>

          {showPollCreated ? (
            <div className="flex items-center gap-2 text-[#008248]">
              <CheckCircle size={14} />
              <span className="font-condensed font-semibold text-[12px] uppercase">Poll created! Others can now vote.</span>
            </div>
          ) : (
            <>
              <button
                onClick={handleCreatePoll}
                data-testid="btn-create-poll"
                className="font-condensed font-bold text-[12px] uppercase tracking-[0.5px] bg-[#1D428A] text-white px-4 py-2 rounded-sm hover:bg-[#163570] transition-colors"
              >
                Make this a Courtside Call
              </button>
              <p className="font-sans text-[11px] text-[#AAA] mt-2">
                This becomes a poll that other fans can vote on. Earn reputation points when you're right.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface AskBarProps {
  onResult?: (analysis: Analysis) => void;
}

export function AskBar({ onResult }: AskBarProps) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeAnalysis, setActiveAnalysis] = useState<Analysis | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);

  const QUICK_QUERIES = ["Brunson props tonight", "Will Denver cover -7.5?", "Best value bet on tonight's slate"];

  const runAnalysis = (q: string) => {
    const match = MOCK_ANALYSES.find(
      (a) => a.query.toLowerCase() === q.toLowerCase()
    ) || MOCK_ANALYSES[Math.floor(Math.random() * MOCK_ANALYSES.length)];

    setActiveAnalysis(match);
    setIsLoading(true);
    setCurrentStep(0);
    setResult(null);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCurrentStep(step);
      if (step >= match.steps.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsLoading(false);
          setResult(match);
          if (onResult) onResult(match);
        }, 400);
      }
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    runAnalysis(query.trim());
    setQuery("");
  };

  return (
    <div className="space-y-4">
      {/* Input */}
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything... &quot;Brunson props vs BOS&quot; or &quot;Best value tonight&quot;"
          disabled={isLoading}
          data-testid="input-ask"
          className="w-full font-sans text-[14px] text-[#111] placeholder-[#AAA] bg-white border-2 border-[#E0E0E0] focus:border-[#1D428A] rounded-lg px-4 py-3 pr-[100px] outline-none transition-colors disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          data-testid="btn-ask-submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 font-condensed font-bold text-[12px] uppercase tracking-[0.5px] bg-[#1D428A] text-white px-4 py-2 rounded-sm disabled:opacity-40 hover:bg-[#163570] transition-colors"
        >
          {isLoading ? "..." : "Analyze"}
        </button>
      </form>

      {/* Quick queries */}
      {!isLoading && !result && (
        <div className="flex flex-wrap gap-2">
          {QUICK_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => { setQuery(q); runAnalysis(q); }}
              data-testid={`btn-quick-${q.slice(0, 10)}`}
              className="font-sans text-[12px] text-[#555] bg-white border border-[#E0E0E0] hover:border-[#1D428A] hover:text-[#1D428A] px-3 py-1.5 rounded-sm transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Loading steps */}
      {isLoading && activeAnalysis && (
        <div className="bg-white border border-[#E0E0E0] rounded-lg p-4 fade-up">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={13} className="text-[#1D428A]" />
            <span className="font-condensed font-bold text-[12px] uppercase text-[#111] tracking-[0.5px]">
              Analyzing · "{activeAnalysis.query}"
            </span>
          </div>
          <div className="space-y-0">
            {activeAnalysis.steps.map((step, i) => (
              <LoadingStep key={i} step={step} index={i} currentStep={currentStep} />
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {result && !isLoading && (
        <AnalysisCard analysis={result} />
      )}
    </div>
  );
}
