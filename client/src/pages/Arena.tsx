import { useState } from "react";
import { ARENA_ARTICLES } from "@/lib/mock-data";
import { SectionHeader } from "@/components/SectionHeader";
import { BookOpen, Clock } from "lucide-react";
import { PlayerHeadshot, TeamLogo } from "@/components/TeamLogo";
import { extractPlayerId, extractPlayerName, extractTeamsFromGame } from "@/lib/player-ids";

const CATEGORY_COLORS: Record<string, string> = {
  "DEEP DIVE": "#1D428A",
  "ANALYSIS": "#1D428A",
  "SCOUTING": "#008248",
  "POWER RANKINGS": "#C8102E",
  "FILM ROOM": "#888",
};

const NBA_TEAM_IDS: Record<string, number> = {
  ATL: 1610612737, BOS: 1610612738, BKN: 1610612751, CHA: 1610612766,
  CHI: 1610612741, CLE: 1610612739, DAL: 1610612742, DEN: 1610612743,
  DET: 1610612765, GSW: 1610612744, HOU: 1610612745, IND: 1610612754,
  LAC: 1610612746, LAL: 1610612747, MEM: 1610612763, MIA: 1610612748,
  MIL: 1610612749, MIN: 1610612750, NOP: 1610612740, NYK: 1610612752,
  OKC: 1610612760, ORL: 1610612753, PHI: 1610612755, PHX: 1610612756,
  POR: 1610612757, SAC: 1610612758, SAS: 1610612759, TOR: 1610612761,
  UTA: 1610612762, WAS: 1610612764,
};

// Team abbreviation from player/team context
const PLAYER_TEAMS: Record<string, string> = {
  "Nikola Jokic": "DEN", "Jokic": "DEN",
  "Shai Gilgeous-Alexander": "OKC", "SGA": "OKC",
  "Victor Wembanyama": "SAS", "Wembanyama": "SAS",
  "Jalen Brunson": "NYK", "Brunson": "NYK",
  "Anthony Edwards": "MIN", "Edwards": "MIN",
  "Jayson Tatum": "BOS", "Tatum": "BOS",
  "LeBron James": "LAL", "LeBron": "LAL",
  "Luka Doncic": "DAL", "Luka": "DAL",
  "Stephen Curry": "GSW", "Curry": "GSW",
};

const TEAM_COLORS: Record<string, string> = {
  OKC: "#007AC1", DEN: "#0E2240", SAS: "#C4CED4", NYK: "#006BB6",
  MIN: "#0C2340", BOS: "#007A33", LAL: "#552583", DAL: "#00538C",
  GSW: "#1D428A", MIA: "#98002E", MIL: "#00471B", PHI: "#006BB6",
};

/** Feature card — NBA.com style hero with giant headshot + team color bg */
function FeatureCard({ article }: { article: typeof ARENA_ARTICLES[0] }) {
  const fullText = `${article.title} ${article.excerpt}`;
  const playerId = extractPlayerId(fullText);
  const playerName = extractPlayerName(fullText);
  const teamAbbr = playerName ? PLAYER_TEAMS[playerName] : null;
  const teamColor = teamAbbr ? (TEAM_COLORS[teamAbbr] || "#1D428A") : "#111";
  const teamId = teamAbbr ? (NBA_TEAM_IDS[teamAbbr] || 0) : 0;
  const catColor = CATEGORY_COLORS[article.category] ?? "#888";

  return (
    <div className="relative rounded-lg overflow-hidden cursor-pointer hover:opacity-95 transition-opacity min-h-[260px]"
      style={{ background: `linear-gradient(135deg, ${teamColor} 0%, ${teamColor}dd 60%, #111 100%)` }}
      data-testid={`card-article-${article.id}`}>

      {/* Team logo watermark */}
      {teamId > 0 && (
        <div className="absolute right-[180px] top-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none">
          <TeamLogo abbr={teamAbbr!} teamId={teamId} size={200} />
        </div>
      )}

      {/* Giant player headshot right side */}
      {playerId && playerName && (
        <div className="absolute right-0 bottom-0 h-[260px] flex items-end pointer-events-none">
          <PlayerHeadshot playerId={playerId} playerName={playerName} size={220} className="opacity-90" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 p-6 max-w-[65%]">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-condensed font-bold text-[10px] uppercase tracking-[0.5px] px-1.5 py-0.5 text-white"
            style={{ background: catColor, borderRadius: 4 }}>
            {article.category}
          </span>
          <div className="flex items-center gap-1 text-white/40">
            <Clock size={10} />
            <span className="font-mono text-[10px]">{article.readTime}</span>
          </div>
        </div>
        <h2 className="font-condensed font-bold text-[26px] text-white leading-tight mb-3">
          {article.title}
        </h2>
        <p className="font-sans text-[13px] text-white/60 leading-relaxed mb-4 line-clamp-2">
          {article.excerpt}
        </p>
        <button className="font-condensed font-bold text-[12px] uppercase tracking-[0.5px] bg-white text-[#111] px-4 py-2 rounded-sm hover:bg-white/90 transition-colors">
          Read Article
        </button>
      </div>
    </div>
  );
}

/** Analysis tile — player headshot hero style */
function ArticleTile({ article }: { article: typeof ARENA_ARTICLES[0] }) {
  const fullText = `${article.title} ${article.excerpt}`;
  const playerId = extractPlayerId(fullText);
  const playerName = extractPlayerName(fullText);
  const teamAbbr = playerName ? PLAYER_TEAMS[playerName] : null;
  const teamColor = teamAbbr ? (TEAM_COLORS[teamAbbr] || "#1D428A") : "#1D428A";
  const teamId = teamAbbr ? (NBA_TEAM_IDS[teamAbbr] || 0) : 0;
  const teams = !playerName ? extractTeamsFromGame(fullText) : null;
  const catColor = CATEGORY_COLORS[article.category] ?? "#888";

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden cursor-pointer hover:shadow-md hover:border-[#1D428A] transition-all"
      data-testid={`card-article-${article.id}`}>

      {/* Hero image area */}
      <div className="relative h-[110px] overflow-hidden flex items-end"
        style={{ background: `linear-gradient(135deg, ${teamColor} 0%, ${teamColor}aa 100%)` }}>

        {/* Team logo watermark */}
        {teamId > 0 && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-[0.12] pointer-events-none">
            <TeamLogo abbr={teamAbbr!} teamId={teamId} size={100} />
          </div>
        )}

        {/* Player headshot */}
        {playerId && playerName && (
          <div className="absolute right-2 bottom-0 pointer-events-none">
            <PlayerHeadshot playerId={playerId} playerName={playerName} size={100} className="opacity-90" />
          </div>
        )}

        {/* Team logos for non-player articles */}
        {!playerName && teams && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
            <TeamLogo abbr={teams[0]} teamId={NBA_TEAM_IDS[teams[0]] || 0} size={36} />
            <TeamLogo abbr={teams[1]} teamId={NBA_TEAM_IDS[teams[1]] || 0} size={36} />
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-2 left-3">
          <span className="font-condensed font-bold text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 text-white"
            style={{ background: catColor, borderRadius: 4 }}>
            {article.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-sans font-semibold text-[13px] text-[#111] leading-snug mb-1 line-clamp-2">
          {article.title}
        </h3>
        <p className="font-sans text-[11px] text-[#888] leading-relaxed line-clamp-2">
          {article.excerpt}
        </p>
        <div className="flex items-center gap-1 mt-2 text-[#CCC]">
          <Clock size={9} />
          <span className="font-mono text-[9px]">{article.readTime}</span>
        </div>
      </div>
    </div>
  );
}

export function Arena() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const feature = ARENA_ARTICLES.find((a) => a.isFeature);
  const secondary = ARENA_ARTICLES.filter((a) => !a.isFeature);

  const categories = ["All", ...Object.keys(CATEGORY_COLORS)];
  const filtered = activeCategory === "All"
    ? secondary
    : secondary.filter(a => a.category === activeCategory);

  return (
    <div className="min-h-screen bg-white">
      {/* Page header */}
      <div className="border-b border-[#E0E0E0] bg-[#111111]">
        <div className="max-w-[1280px] mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={18} className="text-[#F5A623]" />
            <h1 className="font-condensed font-bold text-[28px] uppercase text-white leading-none tracking-[0.5px]">
              The Arena
            </h1>
          </div>
          <p className="font-sans text-[13px] text-[#888]">
            Deep dives, film room breakdowns, and editorial analysis from the Courtside desk.
          </p>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Feature — hero style */}
            {feature && (
              <div>
                <SectionHeader title="Featured" />
                <FeatureCard article={feature} />
              </div>
            )}

            {/* Category filter tabs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionHeader title="Latest Analysis" accentColor="#1D428A" />
              </div>
              <div className="flex gap-2 flex-wrap mb-4">
                {categories.map((cat) => (
                  <button key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`font-condensed font-bold text-[10px] uppercase tracking-[0.5px] px-3 py-1.5 rounded-sm transition-all ${
                      activeCategory === cat
                        ? "bg-[#1D428A] text-white"
                        : "bg-[#F5F5F5] text-[#888] hover:bg-[#E0E0E0]"
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Tile grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map((article) => (
                  <ArticleTile key={article.id} article={article} />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="bg-[#1D428A] rounded-lg overflow-hidden">
              <div className="p-5">
                <h3 className="font-condensed font-bold text-[20px] uppercase text-white leading-tight mb-2 tracking-[0.5px]">
                  The Courtside Edge
                </h3>
                <p className="font-sans text-[13px] text-[#9bb5e8] leading-relaxed mb-4">
                  Daily analysis, model outputs, and the sharpest NBA intelligence — delivered before tip-off.
                </p>
                {subscribed ? (
                  <div className="bg-white/10 rounded-sm px-4 py-3 text-center">
                    <p className="font-condensed font-bold text-[13px] uppercase text-white tracking-[0.5px]">You're in. Check your inbox.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input type="email" placeholder="your@email.com" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-newsletter-email"
                      className="w-full font-sans text-[13px] text-white placeholder-[#9bb5e8] bg-white/10 border border-white/20 focus:border-white rounded-sm px-3 py-2 outline-none transition-colors" />
                    <button onClick={() => { if (email) setSubscribed(true); }}
                      data-testid="btn-newsletter-subscribe"
                      className="w-full font-condensed font-bold text-[12px] uppercase tracking-[0.5px] bg-[#C8102E] text-white py-2.5 rounded-sm hover:bg-[#a50d27] transition-colors">
                      Get the Edge — Free
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E0E0E0] bg-[#F5F5F5]">
                <span className="font-condensed font-bold text-[13px] uppercase text-[#111] tracking-[0.5px]">Categories</span>
              </div>
              <div className="divide-y divide-[#F5F5F5]">
                {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                  <button key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[#F5F5F5] transition-colors ${activeCategory === cat ? "bg-[#F0F4FF]" : ""}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="font-condensed font-semibold text-[12px] uppercase text-[#444] tracking-[0.5px]">{cat}</span>
                    </div>
                    <span className="font-mono text-[11px] text-[#AAA]">
                      {secondary.filter(a => a.category === cat).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg p-4">
              <h4 className="font-condensed font-bold text-[13px] uppercase text-[#111] tracking-[0.5px] mb-2">About Courtside</h4>
              <p className="font-sans text-[12px] text-[#666] leading-relaxed">
                Courtside applies machine learning and advanced analytics to NBA predictions.
                <span className="font-semibold text-[#444]"> Educational analysis only — not financial advice.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
