import { motion } from "framer-motion";
import { Dot } from "../ui/Dot";
import { ArrowRight, ChevronRight, Play } from "lucide-react";

export function LiveView() {
  return (
    <div className="pt-24 min-h-screen bg-[#FAFAFA] text-black w-full flex">
      {/* Sidebar */}
      <div className="w-[320px] shrink-0 border-r border-[#F0F0F0] h-[calc(100vh-6rem)] overflow-y-auto hidden lg:block bg-white relative z-10">
        <div className="p-6">
          <h3 className="font-syne font-bold text-sm tracking-wider text-black/40 mb-4">TONIGHT'S ACTION</h3>
          
          <div className="space-y-3">
            {[
              { id: 1, home: "OKC", away: "DAL", time: "Q3 4:47", hScore: 88, aScore: 82, active: true },
              { id: 2, home: "BOS", away: "PHI", time: "8:00 PM", hScore: 0, aScore: 0 },
              { id: 3, home: "DEN", away: "LAL", time: "10:30 PM", hScore: 0, aScore: 0 },
            ].map((game) => (
              <div 
                key={game.id} 
                className={`relative p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                  game.active 
                  ? "bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#10b981]/20" 
                  : "bg-[#FAFAFA] border border-[#F0F0F0] hover:border-[#E0E0E0]"
                }`}
              >
                {game.active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#10b981] rounded-r-md" />
                )}
                
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-[10px] text-black/50 font-semibold">{game.time}</span>
                  {game.active && <Dot color="green" />}
                </div>
                
                <div className="space-y-1 font-syne font-bold text-lg">
                  <div className="flex justify-between">
                    <span>{game.away}</span>
                    <span className={game.active ? "" : "text-black/30"}>{game.active ? game.aScore : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{game.home}</span>
                    <span className={game.active ? "" : "text-black/30"}>{game.active ? game.hScore : '-'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Live Header */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className="font-syne font-black text-6xl tracking-tight">DAL</span>
                <span className="font-mono text-sm text-black/50 mt-2">34-25</span>
              </div>
              <span className="font-syne font-black text-7xl text-black/20 px-4">82</span>
            </div>
            
            <div className="flex flex-col items-center justify-center px-8 py-4 bg-white rounded-2xl border border-[#F0F0F0] shadow-sm">
              <div className="flex items-center gap-2 text-[#10b981] font-mono font-bold text-sm mb-1">
                <Dot color="green" /> Q3 4:47
              </div>
              <span className="text-black/40 text-xs font-mono uppercase tracking-widest">Spread: OKC -4.5</span>
            </div>

            <div className="flex items-center gap-6">
              <span className="font-syne font-black text-7xl text-black/80 px-4">88</span>
              <div className="flex flex-col items-center">
                <span className="font-syne font-black text-6xl tracking-tight">OKC</span>
                <span className="font-mono text-sm text-black/50 mt-2">41-17</span>
              </div>
            </div>
          </div>

          {/* Momentum Bar */}
          <div className="mb-16">
            <div className="flex justify-between font-mono text-xs text-black/40 mb-2">
              <span>DAL Momentum</span>
              <span>OKC Momentum</span>
            </div>
            <div className="h-3 w-full bg-[#FAFAFA] border border-[#F0F0F0] rounded-full overflow-hidden flex">
              <div className="h-full bg-blue-500 w-[35%] transition-all duration-1000" />
              <div className="h-full bg-[#10b981] w-[65%] transition-all duration-1000 relative">
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
          </div>

          {/* IRIS Analysis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Dot color="green" pulse={false} />
                <h2 className="font-syne font-bold text-2xl tracking-tight">IRIS LIVE VERDICT</h2>
              </div>
              <p className="text-lg text-black/70 leading-relaxed font-sans">
                Oklahoma City's defensive rotations have tightened significantly in the second half. Dallas is shooting only <span className="font-mono font-bold text-black">28%</span> from deep since Q2, while SGA is exploiting the pick-and-roll drop coverage efficiently.
              </p>
              
              <div className="flex gap-4 pt-4">
                <div className="flex-1 bg-white p-5 rounded-xl border border-[#F0F0F0]">
                  <span className="block font-mono text-xs text-black/40 uppercase mb-2">Possessions</span>
                  <span className="font-syne font-bold text-2xl">OKC +6</span>
                </div>
                <div className="flex-1 bg-white p-5 rounded-xl border border-[#F0F0F0]">
                  <span className="block font-mono text-xs text-black/40 uppercase mb-2">Pace</span>
                  <span className="font-syne font-bold text-2xl">102.4</span>
                </div>
              </div>
            </div>

            {/* The Pick Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0F1012] rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl"
            >
              {/* Decorative background glow */}
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[#10b981]/20 blur-[80px] rounded-full pointer-events-none" />
              
              <div className="relative z-10">
                <div className="inline-block px-3 py-1 bg-white/10 rounded-full font-mono text-[10px] text-[#10b981] font-bold tracking-widest mb-6">
                  LIVE CALCULATION
                </div>
                
                <h3 className="font-syne font-bold text-4xl mb-2 text-white/90">OKC Covers -4.5</h3>
                <div className="flex items-baseline gap-2 mb-8">
                  <span className="font-mono text-xl text-[#10b981]">-110</span>
                  <span className="text-white/40 text-sm">Implied Prob: 68.2%</span>
                </div>
                
                <div className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 mb-8">
                  <div className="flex justify-between items-center text-sm font-mono mb-2">
                    <span className="text-white/60">Edge Value</span>
                    <span className="text-[#10b981]">+8.4%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#10b981] w-[85%]" />
                  </div>
                </div>

                <button className="w-full py-4 bg-white text-black font-syne font-bold text-lg rounded-xl flex items-center justify-center gap-2 hover:bg-[#F0F0F0] transition-colors group">
                  Bet on Edge
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
