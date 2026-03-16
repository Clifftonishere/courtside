import { SEASON_RECORD } from "@/lib/mock-data";

interface HeaderProps {
  activePage: "tonight" | "players" | "arena";
  onPageChange: (page: "tonight" | "players" | "arena") => void;
}

export function Header({ activePage, onPageChange }: HeaderProps) {
  return (
    <header
      data-testid="header"
      className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E4E4E0]"
    >
      <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between gap-6">
        {/* Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono font-bold text-xl text-[#1A1A18] tracking-tight">
            courtside
          </span>
          <span className="font-mono text-[11px] text-[#AEAEA8] font-normal hidden sm:block">
            see the edge
          </span>
        </div>

        {/* Nav */}
        <nav className="flex items-center bg-[#F3F3F0] rounded-full p-1 gap-1" data-testid="nav-pills">
          {(["tonight", "players", "arena"] as const).map((page) => (
            <button
              key={page}
              data-testid={`nav-${page}`}
              onClick={() => onPageChange(page)}
              className={`px-4 py-1.5 rounded-full text-sm font-sans font-medium transition-all capitalize tracking-tight ${
                activePage === page
                  ? "bg-white text-[#1A1A18] shadow-sm"
                  : "text-[#7A7A74] hover-elevate"
              }`}
            >
              {page}
            </button>
          ))}
        </nav>

        {/* Season record */}
        <div
          data-testid="season-record"
          className="font-mono text-[11px] flex items-center gap-2 shrink-0"
        >
          <span className="text-[#16a34a] font-semibold">{SEASON_RECORD.wins}W</span>
          <span className="text-[#AEAEA8]">·</span>
          <span className="text-[#dc2626] font-semibold">{SEASON_RECORD.losses}L</span>
          <span className="text-[#AEAEA8]">·</span>
          <span className="text-[#16a34a] font-semibold">{SEASON_RECORD.streak}</span>
          <span className="text-[#AEAEA8]">·</span>
          <span className="text-[#4A4A46] font-semibold">{SEASON_RECORD.pct}%</span>
        </div>
      </div>
    </header>
  );
}
