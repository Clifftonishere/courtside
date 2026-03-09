import { motion } from "framer-motion";
import { Dot } from "./ui/Dot";
import { Target, Activity, Zap } from "lucide-react";

export type TabType = "LIVE" | "DNA" | "EDGE";

interface NavBarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const scores = [
  "FINAL: IND 107, LAC 130",
  "FINAL: OKC 103, LAL 99",
  "FINAL: MIA 112, NYK 108",
  "Q4 2:10: BOS 98, PHI 95",
  "Q3 8:44: DAL 78, PHO 80",
  "HALF: DEN 55, MIL 60",
];

export function NavBar({ activeTab, setActiveTab }: NavBarProps) {
  const tabs = [
    { id: "LIVE", label: "LIVE", icon: Activity },
    { id: "DNA", label: "DNA", icon: Target },
    { id: "EDGE", label: "EDGE", icon: Zap, badge: "BETA", dot: true },
  ] as const;

  return (
    <div className="flex flex-col w-full fixed top-0 z-50">
      {/* Main Nav */}
      <div className="bg-[#0A0A0A] h-16 w-full flex items-center justify-between px-6 border-b border-white/[0.06]">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <div className="w-3 h-3 bg-black rounded-full" />
          </div>
          <span className="text-white font-syne font-bold text-xl tracking-wide">IRIS</span>
        </div>

        {/* Center: Tabs */}
        <div className="flex items-center bg-white/[0.04] p-1 rounded-full border border-white/[0.04]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`relative px-6 py-2 rounded-full flex items-center gap-2 text-sm font-semibold transition-colors duration-300 ${
                  isActive ? "text-black" : "text-white/60 hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-white rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.dot && !isActive && <Dot className="ml-1" />}
                {tab.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-sm ml-1 ${isActive ? 'bg-black/10 text-black' : 'bg-white/10 text-white/80'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Stats */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Season Record</span>
            <span className="text-[#10b981] font-mono font-semibold text-sm">56.6% W4</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7a6aaa] to-[#10b981] p-[2px]">
            <div className="w-full h-full bg-black rounded-full border-2 border-transparent" />
          </div>
        </div>
      </div>

      {/* Ticker */}
      <div className="bg-[#050507] h-8 w-full border-b border-white/[0.06] flex items-center overflow-hidden relative">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#050507] to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#050507] to-transparent z-10" />
        
        <div className="flex w-[200%] animate-ticker font-mono text-xs text-white/50 items-center">
          <div className="flex w-1/2 justify-around whitespace-nowrap">
            {scores.map((score, i) => (
              <span key={i} className="px-8 flex items-center gap-4">
                {score} <span className="w-1 h-1 rounded-full bg-white/20" />
              </span>
            ))}
          </div>
          <div className="flex w-1/2 justify-around whitespace-nowrap">
            {scores.map((score, i) => (
              <span key={`dup-${i}`} className="px-8 flex items-center gap-4">
                {score} <span className="w-1 h-1 rounded-full bg-white/20" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
