import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { Header } from "@/components/Header";
import { Ticker } from "@/components/Ticker";
import { Tonight } from "@/pages/Tonight";
import { Players } from "@/pages/Players";
import { PlayerProfile } from "@/pages/PlayerProfile";
import { Arena } from "@/pages/Arena";

type Page = "tonight" | "players" | "arena";

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
    <div className="min-h-screen bg-[#FAFAF8]">
      <Header activePage={activePage} onPageChange={handlePageChange} />
      <Ticker />

      <div className="pt-[56px]">
        {activePage === "tonight" && <Tonight />}
        {activePage === "players" && !selectedPlayerId && (
          <Players onPlayerSelect={handlePlayerSelect} />
        )}
        {activePage === "players" && selectedPlayerId && (
          <PlayerProfile playerId={selectedPlayerId} onBack={handleBackToPlayers} />
        )}
        {activePage === "arena" && <Arena />}
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
