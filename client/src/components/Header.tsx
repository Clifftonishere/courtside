import { Trophy, User } from "lucide-react";
import { SEASON_RECORD } from "@/lib/mock-data";

export type Page = "tonight" | "players" | "markets" | "arena" | "leaderboard" | "profile";

interface HeaderProps {
  activePage: Page;
  onPageChange: (page: Page) => void;
}

const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: "tonight", label: "Tonight" },
  { id: "players", label: "Players" },
  { id: "markets", label: "Markets" },
  { id: "arena", label: "Arena" },
  { id: "profile", label: "Profile" },
];

export function Header({ activePage, onPageChange }: HeaderProps) {
  const { wins, losses, pct, streak } = SEASON_RECORD;
  const streakIsWin = streak.startsWith("W");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#111111] border-b border-[#2a2a2a]" style={{ height: 48 }}>
      <div className="max-w-[1280px] mx-auto h-full flex items-center justify-between px-4 gap-4">
        {/* Wordmark */}
        <button
          className="flex-shrink-0 font-condensed font-bold text-white uppercase tracking-[1px] text-[18px] hover:text-[#F5A623] transition-colors"
          onClick={() => onPageChange("tonight")}
          data-testid="nav-wordmark"
          style={{ lineHeight: 1 }}
        >
          COURTSIDE
        </button>

        {/* Nav pills */}
        <nav className="flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                data-testid={`nav-${item.id}`}
                className={`font-condensed font-semibold text-[13px] uppercase tracking-[0.5px] px-3 py-1.5 transition-all rounded-sm ${
                  isActive ? "bg-[#1D428A] text-white" : "text-[#999] hover:text-white hover:bg-white/10"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right: record + board + profile avatar */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 font-mono text-[12px]">
            <span className="text-[#008248] font-semibold">{wins}</span>
            <span className="text-[#555]">-</span>
            <span className="text-[#C8102E] font-semibold">{losses}</span>
            <span className="text-[#555] mx-1">·</span>
            <span className="text-[#888]">{pct}%</span>
            <span className="text-[#555] mx-1">·</span>
            <span className={streakIsWin ? "text-[#008248] font-semibold" : "text-[#C8102E] font-semibold"}>{streak}</span>
          </div>

          <button onClick={() => onPageChange("leaderboard")} data-testid="nav-leaderboard"
            className={`flex items-center gap-1.5 font-condensed font-semibold text-[12px] uppercase tracking-[0.5px] px-2.5 py-1 rounded-sm transition-all border ${
              activePage === "leaderboard" ? "bg-[#F5A623] text-[#111] border-[#F5A623]" : "text-[#888] border-[#333] hover:text-[#F5A623] hover:border-[#F5A623]"
            }`}>
            <Trophy size={11} />
            <span className="hidden md:inline">Board</span>
          </button>

          {/* Profile avatar button */}
          <button onClick={() => onPageChange("profile")} data-testid="nav-profile"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              activePage === "profile" ? "bg-[#1D428A]" : "bg-[#333] hover:bg-[#444]"
            }`}>
            <span className="font-condensed font-bold text-[10px] text-white uppercase">CL</span>
          </button>
        </div>
      </div>
    </header>
  );
}
