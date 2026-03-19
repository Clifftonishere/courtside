import { useState } from "react";
import { ARENA_ARTICLES } from "@/lib/mock-data";
import { SectionHeader } from "@/components/SectionHeader";
import { BookOpen, Clock } from "lucide-react";
import { PlayerHeadshot, TeamLogo } from "@/components/TeamLogo";
import {
  extractPlayerId,
  extractPlayerName,
  extractTeamsFromGame,
  NBA_TEAM_IDS,
} from "@/lib/player-ids";

const CATEGORY_COLORS: Record<string, string> = {
  "DEEP DIVE": "#1D428A",
  ANALYSIS: "#1D428A",
  SCOUTING: "#008248",
  "POWER RANKINGS": "#C8102E",
  "FILM ROOM": "#888",
};

/** Smart image for article: player headshot if player mentioned, else team logos */
function ArticleImage({
  title,
  excerpt,
  size = 48,
}: {
  title: string;
  excerpt: string;
  size?: number;
}) {
  const fullText = `${title} ${excerpt}`;
  const playerId = extractPlayerId(fullText);
  const playerName = extractPlayerName(fullText);

  if (playerId && playerName) {
    return (
      <PlayerHeadshot playerId={playerId} playerName={playerName} size={size} />
    );
  }

  // Try to detect game matchup from text
  const teams = extractTeamsFromGame(fullText);
  if (teams) {
    return (
      <div className="flex items-center gap-1">
        <TeamLogo
          abbr={teams[0]}
          teamId={NBA_TEAM_IDS[teams[0]] || 0}
          size={size * 0.55}
        />
        <TeamLogo
          abbr={teams[1]}
          teamId={NBA_TEAM_IDS[teams[1]] || 0}
          size={size * 0.55}
        />
      </div>
    );
  }

  // Generic NBA logo fallback
  return (
    <div
      className="flex items-center justify-center rounded-sm bg-[#1D428A] text-white font-condensed font-bold"
      style={{ width: size, height: size, fontSize: size * 0.3 }}
    >
      NBA
    </div>
  );
}

export function Arena() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const feature = ARENA_ARTICLES.find((a) => a.isFeature);
  const secondary = ARENA_ARTICLES.filter((a) => !a.isFeature);

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
            Deep dives, film room breakdowns, and editorial analysis from the
            Courtside desk.
          </p>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Feature article */}
            {feature && (
              <div>
                <SectionHeader title="Featured" />
                <div
                  className="bg-[#111111] rounded-lg overflow-hidden cursor-pointer hover:opacity-95 transition-opacity"
                  data-testid={`card-article-${feature.id}`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-condensed font-bold text-[10px] uppercase tracking-[0.5px] px-1.5 py-0.5 text-white"
                          style={{
                            background:
                              CATEGORY_COLORS[feature.category] ?? "#888",
                            borderRadius: 4,
                          }}
                        >
                          {feature.category}
                        </span>
                        <div className="flex items-center gap-1 text-[#666]">
                          <Clock size={10} />
                          <span className="font-mono text-[10px]">
                            {feature.readTime}
                          </span>
                        </div>
                      </div>
                      {/* Smart image — feature article, larger size */}
                      <ArticleImage
                        title={feature.title}
                        excerpt={feature.excerpt}
                        size={52}
                      />
                    </div>
                    <h2 className="font-condensed font-bold text-[26px] text-white leading-tight mb-3">
                      {feature.title}
                    </h2>
                    <p className="font-sans text-[14px] text-[#888] leading-relaxed mb-4">
                      {feature.excerpt}
                    </p>
                    <button className="font-condensed font-bold text-[12px] uppercase tracking-[0.5px] bg-[#1D428A] text-white px-4 py-2 rounded-sm hover:bg-[#163570] transition-colors">
                      Read Article
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Secondary articles */}
            <div>
              <SectionHeader title="Latest Analysis" accentColor="#1D428A" />
              <div className="space-y-0 bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
                {secondary.map((article, i) => (
                  <div
                    key={article.id}
                    className={`flex items-start gap-4 p-4 hover:bg-[#F5F5F5] cursor-pointer transition-colors ${
                      i < secondary.length - 1
                        ? "border-b border-[#F0F0F0]"
                        : ""
                    }`}
                    data-testid={`card-article-${article.id}`}
                  >
                    {/* Smart image */}
                    <div className="flex-shrink-0 mt-0.5">
                      <ArticleImage
                        title={article.title}
                        excerpt={article.excerpt}
                        size={40}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="font-condensed font-bold text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 text-white inline-block"
                          style={{
                            background:
                              CATEGORY_COLORS[article.category] ?? "#888",
                            borderRadius: 4,
                          }}
                        >
                          {article.category}
                        </span>
                      </div>
                      <h3 className="font-sans font-semibold text-[14px] text-[#111] leading-snug mb-1">
                        {article.title}
                      </h3>
                      <p className="font-sans text-[12px] text-[#888] leading-relaxed line-clamp-2">
                        {article.excerpt}
                      </p>
                    </div>

                    {/* Read time */}
                    <div className="flex-shrink-0 flex items-center gap-1 text-[#CCC]">
                      <Clock size={10} />
                      <span className="font-mono text-[10px]">
                        {article.readTime}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Newsletter */}
            <div className="bg-[#1D428A] rounded-lg overflow-hidden">
              <div className="p-5">
                <h3 className="font-condensed font-bold text-[20px] uppercase text-white leading-tight mb-2 tracking-[0.5px]">
                  The Courtside Edge
                </h3>
                <p className="font-sans text-[13px] text-[#9bb5e8] leading-relaxed mb-4">
                  Daily analysis, model outputs, and the sharpest NBA
                  intelligence — delivered before tip-off.
                </p>
                {subscribed ? (
                  <div className="bg-white/10 rounded-sm px-4 py-3 text-center">
                    <p className="font-condensed font-bold text-[13px] uppercase text-white tracking-[0.5px]">
                      You're in. Check your inbox.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-newsletter-email"
                      className="w-full font-sans text-[13px] text-white placeholder-[#9bb5e8] bg-white/10 border border-white/20 focus:border-white rounded-sm px-3 py-2 outline-none transition-colors"
                    />
                    <button
                      onClick={() => {
                        if (email) setSubscribed(true);
                      }}
                      data-testid="btn-newsletter-subscribe"
                      className="w-full font-condensed font-bold text-[12px] uppercase tracking-[0.5px] bg-[#C8102E] text-white py-2.5 rounded-sm hover:bg-[#a50d27] transition-colors"
                    >
                      Get the Edge — Free
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E0E0E0] bg-[#F5F5F5]">
                <span className="font-condensed font-bold text-[13px] uppercase text-[#111] tracking-[0.5px]">
                  Categories
                </span>
              </div>
              <div className="divide-y divide-[#F5F5F5]">
                {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                  <button
                    key={cat}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F5F5F5] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: color }}
                      />
                      <span className="font-condensed font-semibold text-[12px] uppercase text-[#444] tracking-[0.5px]">
                        {cat}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-[#AAA]">
                      {Math.floor(Math.random() * 12) + 2}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* About */}
            <div className="bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg p-4">
              <h4 className="font-condensed font-bold text-[13px] uppercase text-[#111] tracking-[0.5px] mb-2">
                About Courtside
              </h4>
              <p className="font-sans text-[12px] text-[#666] leading-relaxed">
                Courtside applies machine learning and advanced analytics to NBA
                predictions.
                <span className="font-semibold text-[#444]">
                  {" "}
                  Educational analysis only — not financial advice.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
