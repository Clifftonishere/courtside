import { GAMES } from "@/lib/mock-data";
import { useNBAGames } from "@/hooks/use-nba-games";

interface TickerItem {
  id: string;
  away: string;
  home: string;
  awayScore: number | null;
  homeScore: number | null;
  status: string;
  isLive: boolean;
  isFinal: boolean;
}

interface TickerProps {
  onGameSelect?: (gameId: string) => void;
}

function TickerGame({ item, onGameSelect }: { item: TickerItem; onGameSelect?: (id: string) => void }) {
  // Try matching by ID first (live data), fall back to mock GAMES by team abbrs
  const matchingMock = GAMES.find(g =>
    (g.away.abbr === item.away && g.home.abbr === item.home) ||
    (g.away.abbr === item.home && g.home.abbr === item.away)
  );
  const gameId = item.id || matchingMock?.id;

  const handleClick = () => {
    if (gameId && onGameSelect) {
      onGameSelect(gameId);
    }
  };

  return (
    <span
      className={`flex items-center gap-2 px-5 shrink-0 whitespace-nowrap border-r border-[#2a2a2a] ${gameId ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}`}
      onClick={handleClick}
    >
      {item.isLive && (
        <span className="relative flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E] relative">
            <span className="absolute inset-0 rounded-full bg-[#C8102E] live-dot" />
          </span>
          <span className="font-condensed font-bold text-[#C8102E] text-[10px] uppercase tracking-[0.5px]">LIVE</span>
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <span className="font-condensed font-bold text-[#999] text-[12px] uppercase">{item.away}</span>
        {item.awayScore !== null && (
          <span className={`font-mono font-semibold text-[12px] ${item.isFinal && item.awayScore < (item.homeScore ?? 0) ? "text-[#666]" : "text-white"}`}>
            {item.awayScore}
          </span>
        )}
        <span className="text-[#444] text-[10px]">@</span>
        <span className="font-condensed font-bold text-[#999] text-[12px] uppercase">{item.home}</span>
        {item.homeScore !== null && (
          <span className={`font-mono font-semibold text-[12px] ${item.isFinal && item.homeScore < (item.awayScore ?? 0) ? "text-[#666]" : "text-white"}`}>
            {item.homeScore}
          </span>
        )}
      </span>
      <span className={`font-mono text-[10px] ${item.isLive ? "text-[#C8102E]" : item.isFinal ? "text-[#555]" : "text-[#666]"}`}>
        {item.isFinal ? "FINAL" : item.status}
      </span>
    </span>
  );
}

export function Ticker({ onGameSelect }: TickerProps) {
  const { games } = useNBAGames();

  const tickerItems: TickerItem[] = games.map(g => ({
    id: g.id,
    away: g.away.abbr,
    home: g.home.abbr,
    awayScore: g.awayScore,
    homeScore: g.homeScore,
    status: g.isLive ? `Q${g.quarter} ${g.timeRemaining}` : g.isFinal ? "FINAL" : g.tipoff,
    isLive: g.isLive,
    isFinal: g.isFinal,
  }));

  const doubled = [...tickerItems, ...tickerItems];
  return (
    <div className="fixed left-0 right-0 z-40 bg-[#1a1a1a] border-b border-[#2a2a2a] overflow-hidden" style={{ top: 48, height: 32 }}>
      <div className="flex items-center h-full ticker-track">
        {doubled.map((item, i) => (
          <TickerGame key={`${item.id}-${i}`} item={item} onGameSelect={onGameSelect} />
        ))}
      </div>
    </div>
  );
}
