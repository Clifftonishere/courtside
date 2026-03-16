import { TICKER_ITEMS } from "@/lib/mock-data";

function TickerItem({ item }: { item: typeof TICKER_ITEMS[0] }) {
  return (
    <span className="flex items-center gap-2 px-6 shrink-0 whitespace-nowrap">
      {item.status === "live" && (
        <span className="relative flex items-center justify-center w-2 h-2 shrink-0">
          <span className="absolute w-2 h-2 rounded-full bg-[#16a34a] live-dot" />
          <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
        </span>
      )}
      <span className="font-mono text-[11px] font-semibold text-[#1A1A18]">{item.text}</span>
      <span className="font-mono text-[11px] text-[#AEAEA8]">{item.detail}</span>
      <span className="text-[#E4E4E0] mx-2 font-mono">|</span>
    </span>
  );
}

export function Ticker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div
      data-testid="ticker"
      className="fixed top-14 left-0 right-0 z-40 bg-[#F3F3F0] border-b border-[#E4E4E0] overflow-hidden h-8 flex items-center"
    >
      {/* Gradient fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-[#F3F3F0] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-[#F3F3F0] to-transparent pointer-events-none" />

      <div className="ticker-track flex">
        {doubled.map((item, i) => (
          <TickerItem key={i} item={item} />
        ))}
      </div>
    </div>
  );
}
