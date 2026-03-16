import { NBA_HEADLINES } from "@/lib/mock-data";
import { SectionHeader } from "@/components/SectionHeader";

export function Headlines() {
  return (
    <section className="py-5 bg-[#F5F5F5] border-b border-[#E0E0E0]">
      <div className="max-w-[1280px] mx-auto px-4">
        <SectionHeader title="NBA Headlines" />
        <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
          {NBA_HEADLINES.map((h, i) => (
            <div
              key={h.id}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-[#F5F5F5] cursor-pointer transition-colors ${
                i < NBA_HEADLINES.length - 1 ? "border-b border-[#F0F0F0]" : ""
              }`}
              data-testid={`item-headline-${h.id}`}
            >
              {/* Category tag */}
              <span
                className="flex-shrink-0 font-condensed font-semibold text-[10px] uppercase tracking-[0.5px] px-1.5 py-0.5 text-white rounded-sm"
                style={{ background: h.tagColor, minWidth: 64, textAlign: "center", borderRadius: 4 }}
              >
                {h.tag}
              </span>

              {/* Headline */}
              <span className="flex-1 font-sans font-semibold text-[14px] text-[#111] leading-tight">
                {h.headline}
              </span>

              {/* Time */}
              <span className="flex-shrink-0 font-mono text-[11px] text-[#AAA]">{h.time}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
