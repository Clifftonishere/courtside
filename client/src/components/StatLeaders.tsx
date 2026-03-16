import { STAT_LEADERS } from "@/lib/mock-data";
import { SectionHeader } from "@/components/SectionHeader";

type LeaderEntry = { player: string; team: string; value: number };

const CATEGORIES: { key: keyof typeof STAT_LEADERS; label: string; unit: string }[] = [
  { key: "points", label: "Points", unit: "PTS" },
  { key: "rebounds", label: "Rebounds", unit: "REB" },
  { key: "assists", label: "Assists", unit: "AST" },
  { key: "steals", label: "Steals", unit: "STL" },
  { key: "blocks", label: "Blocks", unit: "BLK" },
];

function LeaderCard({ label, unit, leaders }: { label: string; unit: string; leaders: LeaderEntry[] }) {
  const [first, second, third] = leaders;
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden" data-testid={`card-statleader-${label.toLowerCase()}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#E0E0E0] bg-[#F5F5F5]">
        <span className="font-condensed font-bold text-[11px] uppercase text-[#888] tracking-[0.5px]">{label}</span>
      </div>

      <div className="p-3 space-y-3">
        {/* #1 — emphasized */}
        <div className="flex items-center gap-2 pl-2 border-l-[3px] border-[#1D428A]">
          <div className="flex-1 min-w-0">
            <div className="font-sans font-semibold text-[13px] text-[#111] truncate">{first.player}</div>
            <div className="font-condensed font-semibold text-[10px] uppercase text-[#888]">{first.team}</div>
          </div>
          <div className="font-mono font-semibold text-[22px] text-[#1D428A] flex-shrink-0">
            {first.value}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#F0F0F0]" />

        {/* #2 */}
        <div className="flex items-center gap-2">
          <div className="font-mono text-[10px] text-[#CCC] w-3 flex-shrink-0">2</div>
          <div className="flex-1 min-w-0">
            <div className="font-sans font-semibold text-[12px] text-[#444] truncate">{second.player}</div>
            <div className="font-condensed font-semibold text-[10px] uppercase text-[#AAA]">{second.team}</div>
          </div>
          <div className="font-mono font-semibold text-[15px] text-[#444] flex-shrink-0">{second.value}</div>
        </div>

        {/* #3 */}
        <div className="flex items-center gap-2">
          <div className="font-mono text-[10px] text-[#CCC] w-3 flex-shrink-0">3</div>
          <div className="flex-1 min-w-0">
            <div className="font-sans font-semibold text-[11px] text-[#888] truncate">{third.player}</div>
            <div className="font-condensed font-semibold text-[10px] uppercase text-[#AAA]">{third.team}</div>
          </div>
          <div className="font-mono font-semibold text-[13px] text-[#888] flex-shrink-0">{third.value}</div>
        </div>
      </div>
    </div>
  );
}

export function StatLeaders() {
  return (
    <section className="py-5 border-b border-[#E0E0E0]">
      <div className="max-w-[1280px] mx-auto px-4">
        <SectionHeader title="Today's Stat Leaders" accentColor="#1D428A" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {CATEGORIES.map(({ key, label, unit }) => (
            <LeaderCard key={key} label={label} unit={unit} leaders={STAT_LEADERS[key]} />
          ))}
        </div>
      </div>
    </section>
  );
}
