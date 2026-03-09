import { motion } from "framer-motion";
import { Search, ChevronRight } from "lucide-react";

export function DNAView() {
  return (
    <div className="pt-24 min-h-screen bg-[#050507] text-white w-full overflow-y-auto">
      
      {/* Decorative Header / Constellation */}
      <div className="relative h-[360px] w-full overflow-hidden flex flex-col items-center justify-center border-b border-white/[0.04]">
        {/* Abstract Constellation Lines */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full border-[0.5px] border-white/20 absolute" />
          <div className="w-[400px] h-[400px] rounded-full border-[0.5px] border-white/30 absolute" />
          <div className="w-[200px] h-[200px] rounded-full border border-white/10 absolute bg-[#7a6aaa]/5 blur-3xl" />
        </div>

        <h1 className="font-syne font-black text-[120px] text-white/5 tracking-tighter select-none absolute z-0 pointer-events-none">
          DNA
        </h1>
        
        <div className="relative z-10 text-center max-w-2xl px-6">
          <h2 className="font-syne font-bold text-4xl mb-4 text-white/90">Deconstruct the Player.</h2>
          <p className="text-white/40 font-sans text-lg mb-8">
            IRIS neural profiles update after every possession, evaluating over 240 micro-actions to define true identity.
          </p>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input 
              type="text"
              placeholder="Search any player..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-full py-4 pl-12 pr-6 text-white placeholder:text-white/30 font-sans focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Trending Players Ribbon */}
      <div className="py-8 border-b border-white/[0.04]">
        <div className="px-8 flex items-center justify-between mb-6">
          <h3 className="font-mono text-xs uppercase tracking-widest text-white/40">Trending Profiles</h3>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5"><ChevronRight className="w-4 h-4 rotate-180" /></button>
            <button className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        
        <div className="flex gap-4 px-8 overflow-x-auto no-scrollbar pb-4">
          {[
            { name: "Shai Gilgeous-Alexander", team: "OKC", identity: "Methodical rim-pressurizer with elite deceleration.", img: "SGA" },
            { name: "Anthony Edwards", team: "MIN", identity: "Explosive slasher vulnerable to high-stunt coverages.", img: "AE" },
            { name: "Luka Doncic", team: "DAL", identity: "High-gravity orchestrator. Unbothered by blitzes.", img: "LD" },
            { name: "Jayson Tatum", team: "BOS", identity: "Volume wing relying on perimeter self-creation.", img: "JT" },
          ].map((p, i) => (
            <div key={i} className="min-w-[280px] p-5 surface-dark rounded-2xl hover:border-white/[0.15] transition-colors cursor-pointer group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-syne font-bold text-xl group-hover:scale-110 transition-transform">
                  {p.img}
                </div>
                <div>
                  <h4 className="font-syne font-bold text-lg text-white/90">{p.name}</h4>
                  <span className="font-mono text-[10px] text-white/40 uppercase">{p.team}</span>
                </div>
              </div>
              <p className="text-sm text-white/60 font-sans leading-relaxed">{p.identity}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Detail Section (Simulating SGA clicked) */}
      <div className="max-w-6xl mx-auto px-8 py-16">
        
        {/* Player Hero */}
        <div className="relative w-full rounded-[2rem] overflow-hidden bg-[#0F1012] border border-white/[0.06] mb-12 p-12">
          <div className="absolute top-0 right-0 w-3/4 h-full bg-gradient-to-l from-[#10b981]/10 to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex justify-between items-end">
            <div>
              <span className="font-mono text-[#10b981] font-bold tracking-widest text-sm mb-4 block">ACTIVE PROFILE</span>
              <h2 className="font-syne font-black text-6xl mb-2 text-white/95">Shai Gilgeous-Alexander</h2>
              <p className="text-xl text-white/60 font-syne italic">"Methodical rim-pressurizer with elite deceleration."</p>
            </div>
            <div className="text-right">
              <span className="font-syne font-black text-8xl text-white/5 block -mb-4">#2</span>
              <span className="font-mono text-white/40">Point Guard • OKC</span>
            </div>
          </div>
        </div>

        {/* 2-Column Data Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Col: Dissection & Exploitable */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h3 className="font-syne font-bold text-2xl text-white/90 mb-6 flex items-center gap-3">
                <div className="w-1 h-6 bg-white/20 rounded-full" />
                DISSECTION
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { trait: "Deceleration Rate", val: "Top 1%", desc: "Creates 4.2ft of separation on drives" },
                  { trait: "Drive Efficiency", val: "1.24 PPP", desc: "Highest among guards" },
                  { trait: "Mid-Range ISO", val: "54.2%", desc: "Unbothered by length" },
                  { trait: "Clutch FT%", val: "92.0%", desc: "Automatic in last 5 mins" },
                ].map((s, i) => (
                  <div key={i} className="glass-dark p-6 rounded-2xl">
                    <span className="text-white/40 font-mono text-xs uppercase block mb-1">{s.trait}</span>
                    <span className="font-syne font-bold text-2xl text-white block mb-2">{s.val}</span>
                    <span className="text-sm text-white/50">{s.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-syne font-bold text-2xl text-[#EF5350] mb-6 flex items-center gap-3">
                <div className="w-1 h-6 bg-[#EF5350]/40 rounded-full" />
                EXPLOITABLE
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#EF5350]/[0.03] border border-[#EF5350]/20 p-6 rounded-2xl">
                  <span className="text-[#EF5350]/60 font-mono text-xs uppercase block mb-2">Late Clock Traps</span>
                  <p className="text-white/70 text-sm">Turnover rate spikes by 14% when hard-doubled beyond 28ft.</p>
                </div>
                <div className="bg-[#EF5350]/[0.03] border border-[#EF5350]/20 p-6 rounded-2xl">
                  <span className="text-[#EF5350]/60 font-mono text-xs uppercase block mb-2">Deep Drop Bigs</span>
                  <p className="text-white/70 text-sm">Struggles slightly vs elite rim protectors forcing him into floaters.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Report & Notes */}
          <div className="space-y-8">
            <div className="surface-dark p-8 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 text-9xl font-serif text-white/[0.02] -mt-10 -mr-4 pointer-events-none">"</div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-white/40 mb-6">Scout Notes</h3>
              <div className="space-y-6">
                <p className="text-white/80 font-serif italic text-lg leading-relaxed">
                  "He doesn't blow by you with speed; he rocks you to sleep and creates the angle before you realize you're leaning the wrong way."
                </p>
                <div className="w-full h-[1px] bg-white/[0.06]" />
                <p className="text-white/80 font-serif italic text-lg leading-relaxed">
                  "You can't speed him up. Even down 5 with a minute left, he plays at 75% speed until the exact moment he needs 100%."
                </p>
              </div>
            </div>

            <button className="w-full py-5 bg-gradient-to-r from-white to-white/90 text-black font-syne font-bold text-xl rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] transition-all flex justify-center items-center gap-3">
              Build Bet on Edge
              <Zap className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
