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
import { Arena } from "@/pages/Arena";
import { Polls } from "@/pages/Polls";
import { LeaderboardPage } from "@/pages/LeaderboardPage";

function AppContent() {
  const [activePage, setActivePage] = useState<Page>("tonight");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const handlePageChange = (page: Page) => {
    setActivePage(page);
    setSelectedPlayerId(null);
  };

  const handlePlayerSelect = (id: string) => {
    setSelectedPlayerId(id);
  };

  const handleBackToPlayers = () => {
    setSelectedPlayerId(null);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header activePage={activePage} onPageChange={handlePageChange} />
      <Ticker />

      {/* Content pushed below fixed header (48px) + ticker (32px) = 80px */}
      <div style={{ paddingTop: 80 }}>
        {activePage === "tonight" && <Tonight />}
        {activePage === "players" && !selectedPlayerId && (
          <Players onPlayerSelect={handlePlayerSelect} />
        )}
        {activePage === "players" && selectedPlayerId && (
          <PlayerProfile playerId={selectedPlayerId} onBack={handleBackToPlayers} />
        )}
        {activePage === "polls" && <Polls />}
        {activePage === "arena" && <Arena />}
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
