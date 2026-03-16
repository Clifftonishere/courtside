import { LEADERBOARD } from "@/lib/mock-data";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";

const TIER_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  "Courtside": { color: "#F5A623", bg: "#F5A62318", label: "COURTSIDE" },
  "Floor Seat": { color: "#C0C0C0", bg: "#C0C0C018", label: "FLOOR SEAT" },
  "Lower Bowl": { color: "#CD7F32", bg: "#CD7F3218", label: "LOWER BOWL" },
  "Upper Deck": { color: "#888", bg: "#88888818", label: "UPPER DECK" },
};

const POINT_RULES = [
  { conf: "HIGH", correct: "+3", harder: "Most likely to be right — smaller reward" },
  { conf: "MED", correct: "+5", harder: "Moderate edge — balanced reward" },
  { conf: "COND", correct: "+8", harder: "Hardest to call — highest reward" },
];

export function LeaderboardPage() {
  const top3 = LEADERBOARD.slice(0, 3);
  const rest = LEADERBOARD.slice(3);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-[#E0E0E0] bg-[#111111]">
        <div className="max-w-[1280px] mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Trophy size={24} className="text-[#F5A623]" />
            <h1 className="font-condensed font-bold text-[32px] uppercase text-white leading-none tracking-[0.5px]">
              Leaderboard
            </h1>
          </div>
          <p className="font-sans text-[14px] text-[#888] max-w-[600px]">
            Top performers earn recognition and future access to exclusive perks. Prove your basketball IQ.
          </p>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main leaderboard */}
          <div className="lg:col-span-2">
            {/* Podium: top 3 */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {top3.map((entry) => {
                const tier = TIER_STYLES[entry.tier];
                const isWin = entry.streak.startsWith("W");
                const podiumSizes: Record<number, string> = { 1: "text-[28px]", 2: "text-[22px]", 3: "text-[18px]" };
                return (
                  <div
                    key={entry.rank}
                    className={`bg-white border border-[#E0E0E0] rounded-lg p-4 text-center ${entry.rank === 1 ? "border-[#F5A623] border-2" : ""}`}
                    data-testid={`card-leaderboard-${entry.rank}`}
                  >
                    <div className="font-mono text-[11px] text-[#AAA] mb-2">#{entry.rank}</div>
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 font-condensed font-bold text-[18px] uppercase"
                      style={{ background: tier.bg, color: tier.color }}
                    >
                      {entry.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="font-sans font-semibold text-[12px] text-[#111] mb-1 break-words">{entry.username}</div>
                    <span
                      className="font-condensed font-bold text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 inline-block mb-2"
                      style={{ color: tier.color, background: tier.bg, borderRadius: 4 }}
                    >
                      {tier.label}
                    </span>
                    <div className={`font-mono font-bold ${podiumSizes[entry.rank] ?? "text-[18px]"} text-[#1D428A] leading-none`}>
                      {entry.points}
                    </div>
                    <div className="font-condensed font-semibold text-[10px] uppercase text-[#AAA] tracking-[0.5px]">pts</div>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <span className="font-mono text-[10px] text-[#888]">{entry.accuracy}%</span>
                      <span className={`font-mono text-[10px] font-semibold ${isWin ? "text-[#008248]" : "text-[#C8102E]"}`}>
                        {entry.streak}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Full table */}
            <SectionHeader title="Full Rankings" />
            <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[40px_1fr_80px_60px_60px_70px] items-center px-4 py-2 bg-[#F5F5F5] border-b border-[#E0E0E0]">
                <span className="font-condensed font-bold text-[10px] uppercase text-[#888] tracking-[0.5px]">#</span>
                <span className="font-condensed font-bold text-[10px] uppercase text-[#888] tracking-[0.5px]">Player</span>
                <span className="font-condensed font-bold text-[10px] uppercase text-[#888] tracking-[0.5px] text-right">Points</span>
                <span className="font-condensed font-bold text-[10px] uppercase text-[#888] tracking-[0.5px] text-right">Acc.</span>
                <span className="font-condensed font-bold text-[10px] uppercase text-[#888] tracking-[0.5px] text-right">Streak</span>
                <span className="font-condensed font-bold text-[10px] uppercase text-[#888] tracking-[0.5px] text-right">Tier</span>
              </div>
              {rest.map((entry, i) => {
                const tier = TIER_STYLES[entry.tier];
                const isWin = entry.streak.startsWith("W");
                return (
                  <div
                    key={entry.rank}
                    className={`grid grid-cols-[40px_1fr_80px_60px_60px_70px] items-center px-4 py-2.5 hover:bg-[#F5F5F5] transition-colors ${
                      i < rest.length - 1 ? "border-b border-[#F5F5F5]" : ""
                    }`}
                    data-testid={`row-leaderboard-${entry.rank}`}
                  >
                    <span className="font-mono text-[12px] text-[#AAA]">{entry.rank}</span>
                    <span className="font-sans font-semibold text-[13px] text-[#111]">{entry.username}</span>
                    <span className="font-mono font-bold text-[14px] text-[#1D428A] text-right">{entry.points}</span>
                    <span className="font-mono text-[12px] text-[#888] text-right">{entry.accuracy}%</span>
                    <span className={`font-mono font-semibold text-[12px] text-right ${isWin ? "text-[#008248]" : "text-[#C8102E]"}`}>
                      {entry.streak}
                    </span>
                    <span className="text-right">
                      <span
                        className="font-condensed font-bold text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 inline-block"
                        style={{ color: tier.color, background: tier.bg, borderRadius: 3 }}
                      >
                        {tier.label.split(" ")[0]}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* How points work */}
            <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E0E0E0] bg-[#F5F5F5]">
                <SectionHeader title="How Points Work" accentColor="#1D428A" className="mb-0" />
              </div>
              <div className="p-4 space-y-3">
                {POINT_RULES.map((rule) => (
                  <div key={rule.conf} className="flex items-start gap-3">
                    <span
                      className="font-condensed font-bold text-[10px] uppercase tracking-[0.5px] px-1.5 py-0.5 flex-shrink-0"
                      style={{
                        color: rule.conf === "HIGH" ? "#008248" : rule.conf === "MED" ? "#F5A623" : "#888",
                        background: rule.conf === "HIGH" ? "#00824818" : rule.conf === "MED" ? "#F5A62318" : "#88888818",
                        borderRadius: 4,
                      }}
                    >
                      {rule.conf}
                    </span>
                    <div>
                      <span className="font-mono font-bold text-[14px] text-[#1D428A]">{rule.correct}</span>
                      <p className="font-sans text-[11px] text-[#888] mt-0.5">{rule.harder}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-[#F0F0F0]">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-[14px] text-[#1D428A]">+2</span>
                    <p className="font-sans text-[11px] text-[#888]">Bonus when your created poll gets 10+ votes</p>
                  </div>
                </div>
                <p className="font-sans text-[11px] text-[#AAA] pt-1">Incorrect votes earn 0 points — never negative. Keep it fun.</p>
              </div>
            </div>

            {/* Tier guide */}
            <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E0E0E0] bg-[#F5F5F5]">
                <SectionHeader title="Tiers" className="mb-0" />
              </div>
              <div className="divide-y divide-[#F5F5F5]">
                {Object.entries(TIER_STYLES).map(([name, style]) => (
                  <div key={name} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: style.color }} />
                    <div>
                      <span className="font-condensed font-bold text-[13px]" style={{ color: style.color }}>{name}</span>
                      <p className="font-sans text-[11px] text-[#888]">
                        {name === "Courtside" ? "Top 1% — the floor" :
                         name === "Floor Seat" ? "Top 5% — elite" :
                         name === "Lower Bowl" ? "Top 20% — above average" :
                         "Everyone else — keep grinding"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
