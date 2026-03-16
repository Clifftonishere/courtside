import { ARENA_ARTICLES } from "@/lib/mock-data";

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  Preview: { bg: "bg-blue-50", text: "text-blue-700", label: "Preview" },
  Verdict: { bg: "bg-green-50", text: "text-green-700", label: "Verdict" },
  Spotlight: { bg: "bg-amber-50", text: "text-amber-700", label: "Spotlight" },
  Rankings: { bg: "bg-purple-50", text: "text-purple-700", label: "Power Rankings" },
};

function ArticleTypeBadge({ type }: { type: string }) {
  const s = TYPE_STYLES[type] ?? { bg: "bg-gray-50", text: "text-gray-600", label: type };
  return (
    <span className={`font-mono text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

export function Arena() {
  const featured = ARENA_ARTICLES[0];
  const rest = ARENA_ARTICLES.slice(1);

  return (
    <div className="min-h-screen bg-[#FAFAF8] pt-22">
      <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-10">

        <div>
          <h1 className="font-sans font-bold text-2xl text-[#1A1A18] tracking-tight mb-1">
            The Arena
          </h1>
          <p className="font-sans text-sm text-[#7A7A74]">
            Editorial analysis, game verdicts, and deep dives from the Courtside desk.
          </p>
        </div>

        {/* Featured article */}
        <section data-testid="featured-article">
          <div className="border border-[#E4E4E0] rounded-xl bg-white overflow-hidden cursor-pointer hover-elevate transition-all">
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <ArticleTypeBadge type={featured.type} />
                <span className="font-mono text-[11px] text-[#AEAEA8]">{featured.date}</span>
                <span className="font-mono text-[11px] text-[#AEAEA8]">{featured.readTime}</span>
              </div>
              <h2 className="font-sans font-bold text-2xl text-[#1A1A18] tracking-tight leading-tight mb-3">
                {featured.headline}
              </h2>
              <p className="font-sans text-[#4A4A46] leading-relaxed max-w-2xl">
                {featured.excerpt}
              </p>
              <div className="mt-5 flex items-center gap-2">
                <span className="font-mono text-xs text-[#AEAEA8]">{featured.author}</span>
                <span className="font-mono text-xs text-[#AEAEA8]">·</span>
                <span className="font-sans text-xs text-[#16a34a] font-medium cursor-pointer">
                  Read analysis →
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Article grid */}
        <section data-testid="article-grid">
          <div className="font-mono text-[11px] text-[#AEAEA8] uppercase tracking-widest mb-4">
            Recent
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rest.map((article) => (
              <div
                key={article.id}
                data-testid={`article-card-${article.id}`}
                className="border border-[#E4E4E0] rounded-xl bg-white p-5 cursor-pointer hover-elevate transition-all flex flex-col"
              >
                <div className="flex items-center gap-2 mb-3">
                  <ArticleTypeBadge type={article.type} />
                </div>
                <h3 className="font-sans font-semibold text-[#1A1A18] text-sm leading-tight mb-2 flex-1">
                  {article.headline}
                </h3>
                <p className="font-sans text-xs text-[#7A7A74] leading-relaxed line-clamp-3 mb-4">
                  {article.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#AEAEA8]">{article.date}</span>
                  <span className="font-mono text-[10px] text-[#AEAEA8]">{article.readTime}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Newsletter CTA */}
        <section data-testid="newsletter-cta">
          <div className="border border-[#E4E4E0] rounded-xl bg-[#1A1A18] p-8 text-center">
            <div className="font-mono text-[11px] text-white/40 uppercase tracking-widest mb-2">
              The Daily Edge
            </div>
            <h3 className="font-sans font-bold text-white text-xl tracking-tight mb-2">
              Get the pre-game breakdown every day at noon.
            </h3>
            <p className="font-sans text-sm text-white/60 mb-6 max-w-md mx-auto">
              Model picks, key props, and market reads — delivered before tip-off. Join 14,200 subscribers.
            </p>
            <div className="flex items-center gap-3 max-w-sm mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                data-testid="newsletter-input"
                className="flex-1 font-mono text-sm bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 outline-none focus:border-white/40"
              />
              <button
                data-testid="newsletter-submit"
                className="bg-white text-[#1A1A18] font-sans font-semibold text-sm px-4 py-2.5 rounded-lg shrink-0 hover-elevate"
              >
                Subscribe
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center py-4 border-t border-[#E4E4E0]">
          <p className="font-mono text-[10px] text-[#AEAEA8] italic">
            Educational analysis only. Not financial advice. Courtside does not facilitate real-money wagering.
          </p>
        </div>
      </div>
    </div>
  );
}
