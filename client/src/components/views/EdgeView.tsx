import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, CheckCircle2, ChevronDown, Flame } from "lucide-react";

export function EdgeView() {
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [wager, setWager] = useState<string>("100");

  const steps = [
    "Parsing natural language...",
    "Identifying entities (SGA, Edwards, etc)...",
    "Pulling IRIS DNA intelligence...",
    "Correlating matchups & usage...",
    "Running 10,000 simulations...",
    "Structuring optimal parlay...",
    "Finalizing edge value..."
  ];

  const handleAnalysis = () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    setAnalysisStep(0);
    setAnalysisComplete(false);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= steps.length) {
        clearInterval(interval);
        setTimeout(() => setAnalysisComplete(true), 600);
      } else {
        setAnalysisStep(step);
      }
    }, 500); // 500ms per step
  };

  const chips = [
    "SGA over 30 points",
    "Luka triple double",
    "Celtics cover -5",
    "Anthony Edwards dunk",
    "Jokic under 8 assists",
    "Knicks moneyline"
  ];

  const oddsMultiplier = 4.5;
  const potentialWin = (parseFloat(wager || "0") * oddsMultiplier).toFixed(2);

  return (
    <div className="pt-24 min-h-screen bg-[#0A0A0C] text-white w-full flex">
      
      {/* Main Content: Wizard */}
      <div className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          
          <h1 className="font-syne font-black text-4xl mb-2 text-white/90">CREATE YOUR BET</h1>
          <p className="text-white/40 font-sans mb-10 text-lg">Use plain English. IRIS will structure and optimize it.</p>

          {!isAnalyzing && !analysisComplete && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="relative group">
                <textarea 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="e.g., I want SGA to score 30+ and Edwards to have a big game against the drop coverage..."
                  className="w-full bg-[#1A1C20] border border-white/10 rounded-3xl p-6 text-xl font-sans text-white placeholder:text-white/20 focus:outline-none focus:border-[#10b981]/50 focus:ring-1 focus:ring-[#10b981]/50 transition-all min-h-[160px] resize-none"
                />
                <button 
                  onClick={handleAnalysis}
                  disabled={!inputText.trim()}
                  className="absolute right-4 bottom-4 w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-30 disabled:hover:scale-100"
                >
                  <Send className="w-5 h-5 ml-1" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {chips.map(chip => (
                  <button 
                    key={chip}
                    onClick={() => setInputText(prev => prev + (prev ? ", " : "") + chip)}
                    className="px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.02] text-white/60 text-sm font-sans hover:bg-white/[0.06] hover:text-white transition-colors"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {isAnalyzing && !analysisComplete && (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="w-24 h-24 relative mb-12">
                <div className="absolute inset-0 border-t-2 border-[#10b981] rounded-full animate-spin" style={{ animationDuration: '1s'}} />
                <div className="absolute inset-2 border-r-2 border-white/20 rounded-full animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse'}} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 bg-[#10b981] rounded-full animate-pulse" />
                </div>
              </div>
              
              <div className="space-y-4 w-full max-w-sm">
                {steps.map((step, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center gap-4 transition-all duration-300 ${
                      idx < analysisStep ? "text-white/40" : 
                      idx === analysisStep ? "text-white scale-105 transform origin-left" : 
                      "text-transparent opacity-0"
                    }`}
                  >
                    {idx < analysisStep ? (
                      <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
                    ) : (
                      <div className={`w-5 h-5 rounded-full border-2 ${idx === analysisStep ? 'border-[#10b981] bg-[#10b981]/20' : 'border-transparent'}`} />
                    )}
                    <span className="font-mono text-sm">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysisComplete && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="surface-dark rounded-3xl p-8 border border-[#10b981]/20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#10b981] to-transparent" />
                
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="font-mono text-[#10b981] text-xs uppercase tracking-widest mb-2">Optimized Parlay</h3>
                    <h2 className="font-syne font-bold text-2xl text-white/90">The SGA / Edwards Axis</h2>
                  </div>
                  <div className="bg-[#10b981]/10 text-[#10b981] px-4 py-2 rounded-xl font-mono font-bold text-lg border border-[#10b981]/20">
                    +{Math.round((oddsMultiplier - 1) * 100)}
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                    <span className="font-sans text-white/80">SGA Over 29.5 Points</span>
                    <span className="font-mono text-white/40">-110</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                    <span className="font-sans text-white/80">A. Edwards Over 3.5 Threes</span>
                    <span className="font-mono text-white/40">+125</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-6 bg-[#050507] rounded-2xl border border-white/[0.04]">
                  <div>
                    <span className="block font-mono text-xs text-white/40 mb-2 uppercase">Wager Amount</span>
                    <div className="flex items-center text-3xl font-mono font-bold">
                      <span className="text-white/30 mr-1">$</span>
                      <input 
                        type="number" 
                        value={wager}
                        onChange={(e) => setWager(e.target.value)}
                        className="bg-transparent border-none outline-none w-32 text-white focus:ring-0 p-0"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="block font-mono text-xs text-white/40 mb-2 uppercase">To Win</span>
                    <div className="text-3xl font-mono font-bold text-[#10b981]">
                      ${potentialWin}
                    </div>
                  </div>
                </div>

                <button className="w-full mt-6 py-5 bg-[#10b981] text-black font-syne font-bold text-xl rounded-2xl hover:bg-[#0ea5e9] transition-colors shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  Place Bet via Edge
                </button>
              </div>

              <button 
                onClick={() => { setInputText(""); setAnalysisComplete(false); }}
                className="w-full text-center text-white/40 font-mono text-sm hover:text-white transition-colors"
              >
                Reset and create new bet
              </button>
            </motion.div>
          )}

          {/* Community Bets */}
          <div className="mt-16 pt-12 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-syne font-bold text-2xl text-white/90">COMMUNITY EDGE</h2>
              <div className="flex gap-2">
                {['Trending', 'High Stakes', 'IRIS Validated'].map(f => (
                  <button key={f} className="px-4 py-1.5 rounded-full border border-white/[0.1] text-xs font-mono text-white/50 hover:bg-white/5 transition-colors">
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "Late Night Action", user: "@shark_69", w: "$500", mult: "x2.4", roi: "+24%" },
                { title: "Jokic Masterclass", user: "@denver_don", w: "$120", mult: "x5.0", roi: "+41%" }
              ].map((b, i) => (
                <div key={i} className="glass-dark p-6 rounded-2xl group cursor-pointer hover:bg-white/[0.04] transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-sans text-sm text-white/60">{b.user}</span>
                    <span className="flex items-center text-[#10b981] text-xs font-mono gap-1"><Flame className="w-3 h-3" /> {b.roi} Edge</span>
                  </div>
                  <h4 className="font-syne font-bold text-lg mb-4">{b.title}</h4>
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="block text-[10px] font-mono text-white/30 uppercase">Wager</span>
                      <span className="font-mono text-white/80">{b.w}</span>
                    </div>
                    <button className="px-4 py-2 bg-white/10 rounded-lg text-sm font-syne font-bold group-hover:bg-white group-hover:text-black transition-colors">
                      Tail Bet {b.mult}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-[340px] shrink-0 border-l border-white/[0.06] bg-[#0A0A0C] p-6 hidden xl:block z-10">
        
        {/* User Card */}
        <div className="surface-dark rounded-2xl p-6 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#E65100]/20 blur-[40px] rounded-full" />
          <div className="flex items-center justify-between mb-6">
            <span className="font-syne font-bold text-white/90">@alex_bets</span>
            <div className="px-2 py-1 bg-[#E65100]/20 text-[#E65100] text-[10px] font-mono font-bold uppercase rounded border border-[#E65100]/30">Gold Tier</div>
          </div>
          
          <div className="mb-4">
            <span className="block font-mono text-xs text-white/40 uppercase mb-1">Available Balance</span>
            <span className="font-mono text-3xl font-bold text-white">$4,250.00</span>
          </div>

          <div className="flex justify-between items-center py-3 border-t border-white/[0.06]">
            <span className="text-sm font-sans text-white/60">$EDGE Holdings</span>
            <span className="font-mono text-sm text-white/90">14,500</span>
          </div>
        </div>

        {/* Active Bets */}
        <div className="mb-8">
          <h3 className="font-syne font-bold text-sm tracking-widest text-white/40 mb-4">ACTIVE BETS</h3>
          <div className="space-y-3">
            <div className="glass-dark p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="font-sans text-sm text-white/80">LAL vs DEN Under 210</span>
                <span className="font-mono text-xs text-[#10b981]">Winning</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "75%" }}
                  className="h-full bg-[#10b981]"
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-white/40">
                <span>Q3 2:14</span>
                <span>$200 → $380</span>
              </div>
            </div>
            
            <div className="glass-dark p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="font-sans text-sm text-white/80">Curry Triple Double</span>
                <span className="font-mono text-xs text-[#EF5350]">Sweating</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "40%" }}
                  className="h-full bg-[#E65100]"
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-white/40">
                <span>Needs 4 Ast</span>
                <span>$50 → $450</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
