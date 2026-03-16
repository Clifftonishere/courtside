import { HOT_TAKES, type ConfTier } from "@/lib/mock-data";
import { SectionHeader } from "@/components/SectionHeader";

const CONF_COLORS: Record<ConfTier, { color: string; bg: string }> = {
  HIGH: { color: "#008248", bg: "rgba(0,130,72,0.18)" },
  MED: { color: "#F5A623", bg: "rgba(245,166,35,0.15)" },
  COND: { color: "#999", bg: "rgba(153,153,153,0.12)" },
};

export function HotTakes() {
  return (
    <section className="py-5 border-b border-[#E0E0E0]">
      <div className="max-w-[1280px] mx-auto px-4">
        <SectionHeader title="Courtside Hot Takes" />

        <div
          className="flex gap-3 overflow-x-auto no-scrollbar snap-scroll pb-2"
        >
          {HOT_TAKES.map((take) => {
            const c = CONF_COLORS[take.conf];
            return (
              <div
                key={take.id}
                className="snap-card flex-shrink-0 bg-[#1A1A1A] rounded-lg overflow-hidden border border-[#2a2a2a] hover:border-[#333] transition-colors cursor-pointer"
                style={{ width: 320 }}
                data-testid={`card-hottake-${take.id}`}
              >
                <div className="p-4">
                  {/* Game + conf badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[10px] text-[#666]">{take.game}</span>
                    <span
                      className="font-condensed font-bold text-[10px] uppercase tracking-[0.5px] px-1.5 py-0.5"
                      style={{ color: c.color, background: c.bg, borderRadius: 4 }}
                    >
                      {take.conf}
                    </span>
                  </div>

                  {/* Headline */}
                  <h3 className="font-condensed font-bold text-[18px] text-white leading-tight mb-2">
                    {take.headline}
                  </h3>

                  {/* Body */}
                  <p className="font-sans text-[12px] text-[#999] leading-relaxed mb-4" style={{ lineHeight: 1.5 }}>
                    {take.body}
                  </p>

                  {/* Bottom pick row */}
                  <div className="pt-3 border-t border-[#2a2a2a]">
                    <span className="font-mono text-[11px] text-[#666]">
                      Courtside pick:{" "}
                      <span style={{ color: c.color }} className="font-semibold">
                        {take.pick}
                      </span>
                      {" · "}
                      <span className="text-[#888]">{take.prob}%</span>
                      {" · "}
                      <span className="text-[#888]">{take.margin}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
