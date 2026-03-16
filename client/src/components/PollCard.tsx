import { useState } from "react";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import type { ConfTier } from "@/lib/mock-data";

type Poll = {
  id: string;
  proposition: string;
  verdict: string;
  prob: number;
  conf: ConfTier;
  agreeVotes: number;
  fadeVotes: number;
  totalVotes: number;
  resolvesAt: string;
  game: string;
  status: string;
  result?: string;
  actualOutcome?: string;
  pointsAwarded?: number;
};

const CONF_COLORS: Record<ConfTier, string> = {
  HIGH: "#008248",
  MED: "#F5A623",
  COND: "#888",
};

interface PollCardProps {
  poll: Poll;
  compact?: boolean;
}

export function PollCard({ poll, compact = false }: PollCardProps) {
  const [voted, setVoted] = useState<"agree" | "fade" | null>(null);
  const [localAgree, setLocalAgree] = useState(poll.agreeVotes);
  const [localFade, setLocalFade] = useState(poll.fadeVotes);

  const total = localAgree + localFade;
  const agreePct = Math.round((localAgree / total) * 100);
  const fadePct = 100 - agreePct;

  const confColor = CONF_COLORS[poll.conf];
  const isResolved = poll.status === "resolved";

  const handleVote = (side: "agree" | "fade") => {
    if (voted || isResolved) return;
    setVoted(side);
    if (side === "agree") setLocalAgree((v) => v + 1);
    else setLocalFade((v) => v + 1);
  };

  return (
    <div
      className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden"
      data-testid={`card-poll-${poll.id}`}
    >
      <div className={compact ? "p-3" : "p-4"}>
        {/* Game tag + conf */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] text-[#AAA]">{poll.game}</span>
          <span
            className="font-condensed font-bold text-[10px] uppercase tracking-[0.5px] px-1.5 py-0.5"
            style={{ color: confColor, background: `${confColor}20`, borderRadius: 4 }}
          >
            {poll.conf}
          </span>
        </div>

        {/* Proposition */}
        <p className={`font-sans font-semibold text-[#111] leading-tight mb-1 ${compact ? "text-[13px]" : "text-[15px]"}`}>
          {poll.proposition}
        </p>

        {/* Courtside verdict */}
        <p className="font-mono text-[11px] mb-3" style={{ color: confColor }}>
          Courtside: {poll.verdict} · {poll.prob}%
        </p>

        {/* Vote bar */}
        <div className="mb-2">
          <div className="flex h-2 rounded-sm overflow-hidden bg-[#F0F0F0]">
            <div
              className="bg-[#1D428A] transition-all duration-500"
              style={{ width: `${agreePct}%` }}
            />
            <div
              className="bg-[#888] transition-all duration-500"
              style={{ width: `${fadePct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-mono text-[10px] text-[#1D428A] font-semibold">AGREE {agreePct}%</span>
            <span className="font-mono text-[10px] text-[#888]">{total.toLocaleString()} votes</span>
            <span className="font-mono text-[10px] text-[#888] font-semibold">FADE {fadePct}%</span>
          </div>
        </div>

        {/* Resolved result */}
        {isResolved && poll.result && (
          <div className={`flex items-center gap-2 p-2 rounded-sm mb-3 ${poll.result === "CORRECT" ? "bg-[#dcfce7]" : "bg-[#fee2e2]"}`}>
            {poll.result === "CORRECT"
              ? <CheckCircle size={13} className="text-[#008248]" />
              : <XCircle size={13} className="text-[#C8102E]" />
            }
            <span className={`font-condensed font-bold text-[11px] uppercase tracking-[0.5px] ${poll.result === "CORRECT" ? "text-[#008248]" : "text-[#C8102E]"}`}>
              {poll.result} — {poll.actualOutcome}
            </span>
            {poll.pointsAwarded !== undefined && poll.pointsAwarded > 0 && (
              <span className="ml-auto font-mono text-[11px] text-[#008248] font-semibold">+{poll.pointsAwarded} pts</span>
            )}
          </div>
        )}

        {/* Vote buttons / voted state */}
        {!isResolved && (
          voted ? (
            <div className="flex items-center gap-2">
              <CheckCircle size={13} className="text-[#008248]" />
              <span className="font-condensed font-semibold text-[12px] uppercase text-[#008248] tracking-[0.5px]">
                Voted {voted === "agree" ? "AGREE" : "FADE"} — results update when game ends
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleVote("agree")}
                data-testid={`btn-agree-${poll.id}`}
                className="flex-1 font-condensed font-bold text-[12px] uppercase tracking-[0.5px] border border-[#1D428A] text-[#1D428A] py-2 rounded-sm hover:bg-[#1D428A] hover:text-white transition-all"
              >
                AGREE
              </button>
              <button
                onClick={() => handleVote("fade")}
                data-testid={`btn-fade-${poll.id}`}
                className="flex-1 font-condensed font-bold text-[12px] uppercase tracking-[0.5px] border border-[#888] text-[#888] py-2 rounded-sm hover:bg-[#888] hover:text-white transition-all"
              >
                FADE
              </button>
            </div>
          )
        )}

        {/* Resolve time */}
        <div className="flex items-center gap-1.5 mt-2">
          <Clock size={10} className="text-[#CCC]" />
          <span className="font-mono text-[10px] text-[#AAA]">{isResolved ? "Resolved" : `Resolves ${poll.resolvesAt}`}</span>
        </div>
      </div>
    </div>
  );
}
