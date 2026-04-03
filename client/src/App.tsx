import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { Header, type Page } from "@/components/Header";
import { Ticker } from "@/components/Ticker";
import { Tonight } from "@/pages/Tonight";
import { Players } from "@/pages/Players";
import { PlayerProfile } from "@/pages/PlayerProfile";
import { GameDetail } from "@/pages/GameDetail";
import { Arena } from "@/pages/Arena";
import { Polls } from "@/pages/Polls";
import { Profile } from "@/pages/Profile";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { GAMES } from "@/lib/mock-data";

function AppContent() {
  const [activePage, setActivePage] = useState<Page>("tonight");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const handlePageChange = (page: Page) => {
    setActivePage(page);
    setSelectedPlayerId(null);
    setSelectedGameId(null);
  };

  const handleGameSelect = (id: string) => {
    setSelectedGameId(id);
    setActivePage("tonight");
    setSelectedPlayerId(null);
  };

  const selectedGame = selectedGameId ? GAMES.find(g => g.id === selectedGameId) : null;

  return (
    <div className="min-h-screen bg-white">
      <Header activePage={activePage} onPageChange={handlePageChange} />
      <Ticker onGameSelect={handleGameSelect} />

      <div style={{ paddingTop: 80 }}>
        {activePage === "tonight" && !selectedGameId && (
          <Tonight onGameSelect={handleGameSelect} />
        )}
        {activePage === "tonight" && selectedGameId && selectedGame && (
          <GameDetail game={selectedGame as any} onBack={() => setSelectedGameId(null)} />
        )}
        {activePage === "players" && !selectedPlayerId && (
          <Players onPlayerSelect={(id) => setSelectedPlayerId(id)} />
        )}
        {activePage === "players" && selectedPlayerId && (
          <PlayerProfile playerId={selectedPlayerId} onBack={() => setSelectedPlayerId(null)} />
        )}
        {activePage === "markets" && <Polls />}
        {activePage === "arena" && <Arena />}
        {activePage === "profile" && <Profile />}
        {activePage === "leaderboard" && <LeaderboardPage />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
