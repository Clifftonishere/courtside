import { useState } from "react";
import { NavBar, type TabType } from "../components/NavBar";
import { LiveView } from "../components/views/LiveView";
import { DNAView } from "../components/views/DNAView";
import { EdgeView } from "../components/views/EdgeView";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("EDGE");

  return (
    <div className="min-h-screen w-full flex flex-col">
      <NavBar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* 
        Using simple conditional rendering as requested for the mock state.
        The wrapper dictates the transition of the body color indirectly,
        but since the views are full height/width and have their own backgrounds,
        they handle their own thematic colors.
      */}
      <main className="flex-1 w-full relative">
        {activeTab === "LIVE" && <LiveView />}
        {activeTab === "DNA" && <DNAView />}
        {activeTab === "EDGE" && <EdgeView />}
      </main>
    </div>
  );
}
