import { ExternalLink, Clock, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";
import type { EdgeMarket } from "@/hooks/use-edge-markets";

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

const CONF_COLORS: Record<string, string> = {
  HIGH: "#008248", MED: "#F5A623", COND: "#888",
};

const REC_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  BUY_YES:  { bg: "#008248", text: "#fff", label: "BUY YES" },
  BUY_NO:   { bg: "#C8102E", text: "#fff", label: "BUY NO" },
  NO_EDGE:  { bg: "#E0E0E0", text: "#555", label: "NO EDGE" },
  HOLD:     { bg: "#F5A623", text: "#fff", label: "HOLD" },
};

const CAT_LABELS: Record<string, string> = {
  game_winner: "WINNER",
  player_prop: "PROP",
  total: "TOTAL",
  special: "SPREAD",
};

interface MarketCardProps {
  market: EdgeMarket;
  compact?: boolean;
}

export function MarketCard({ market, compact = false }: MarketCardProps) {
  const confColor = CONF_COLORS[market.confidence] || "#888";
  const rec = REC_STYLES[market.recommendation] || REC_STYLES.NO_EDGE;
  const catLabel = CAT_LABELS[market.category] || market.category.toUpperCase();

  // Parse game teams for logos
  const gameMatch = market.game.match(/([A-Z]{2,3})\s*@\s*([A-Z]{2,3})/);
  const awayTeam = gameMatch?.[1] || "";
  const homeTeam = gameMatch?.[2] || "";

  // Edge bar percentages
  const edgePct = Math.round(market.edge_probability * 100);
  const mktPct = Math.round(market.market_price * 100);
  const edgeVal = Math.round(market.edge_value * 100);
  const hasEdge = Math.abs(market.edge_value) > 0.01;

  // Format expiry
  const expiresAt = market.expires_at
    ? new Date(market.expires_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    : "";

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden hover:border-[#1D428A] transition-colors">
      <div className={compact ? "p-3" : "p-4"}>
        {/* Top row: game + team logos + category + confidence */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-[#AAA]">{market.game}</span>
            {gameMatch && (
              <div className="flex items-center gap-0.5">
                <TeamLogo abbr={awayTeam} teamId={NBA_TEAM_IDS[awayTeam] || 0} size={16} />
                <span className="font-mono text-[8px] text-[#CCC]">@</span>
                <TeamLogo abbr={homeTeam} teamId={NBA_TEAM_IDS[homeTeam] || 0} size={16} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-condensed font-bold text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 bg-[#F0F0F0] text-[#888] rounded-sm">
              {catLabel}
            </span>
            <span className="font-condensed font-bold text-[10px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-sm"
              style={{ color: confColor, background: `${confColor}20` }}>
              {market.confidence}
            </span>
          </div>
        </div>

        {/* Title */}
        <p className={`font-sans font-semibold text-[#111] leading-tight mb-2 ${compact ? "text-[13px]" : "text-[15px]"}`}>
          {market.title}
        </p>

        {/* Recommendation pill */}
        <div className="flex items-center gap-2 mb-3">
          <span className="font-condensed font-bold text-[11px] uppercase tracking-[0.5px] px-2.5 py-1 rounded-sm"
            style={{ background: rec.bg, color: rec.text }}>
            {rec.label}
          </span>
          {hasEdge && (
            <span className="flex items-center gap-1 font-mono text-[11px] font-semibold"
              style={{ color: edgeVal > 0 ? "#008248" : "#C8102E" }}>
              {edgeVal > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {edgeVal > 0 ? "+" : ""}{edgeVal}pp edge
            </span>
          )}
          {!hasEdge && market.recommendation !== "HOLD" && (
            <span className="flex items-center gap-1 font-mono text-[11px] text-[#AAA]">
              <Minus size={11} /> Fair price
            </span>
          )}
          {market.recommendation === "HOLD" && !hasEdge && (
            <span className="flex items-center gap-1 font-mono text-[11px] text-[#F5A623]">
              <AlertCircle size={11} /> Low confidence
            </span>
          )}
        </div>

        {/* Edge comparison bar */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="font-mono text-[10px] text-[#1D428A] font-semibold">Edge {edgePct}%</span>
            <span className="font-mono text-[10px] text-[#888]">Market {mktPct}%</span>
          </div>
          <div className="relative h-2 rounded-sm overflow-hidden bg-[#F0F0F0]">
            {/* Edge probability bar */}
            <div className="absolute top-0 left-0 h-full bg-[#1D428A] rounded-sm transition-all duration-500"
              style={{ width: `${edgePct}%` }} />
            {/* Market price marker */}
            <div className="absolute top-0 h-full w-0.5 bg-[#C8102E] transition-all duration-500"
              style={{ left: `${mktPct}%` }} />
          </div>
          {hasEdge && (
            <div className="flex justify-center mt-1">
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-sm"
                style={{
                  color: edgeVal > 0 ? "#008248" : "#C8102E",
                  background: edgeVal > 0 ? "#00824815" : "#C8102E15",
                }}>
                {edgeVal > 0 ? "Underpriced" : "Overpriced"} by {Math.abs(edgeVal)}pp
              </span>
            </div>
          )}
        </div>

        {/* Reasoning */}
        {!compact && market.reasoning.length > 0 && (
          <div className="mb-3 space-y-1">
            {market.reasoning.slice(0, 3).map((r, i) => (
              <p key={i} className="font-sans text-[11px] text-[#555] leading-snug flex gap-1.5">
                <span className="text-[#CCC] flex-shrink-0">-</span>
                <span>{r}</span>
              </p>
            ))}
          </div>
        )}

        {/* Footer: platform + expiry */}
        <div className="flex items-center justify-between pt-2 border-t border-[#F0F0F0]">
          {market.platform === "polymarket" && market.url ? (
            <a href={market.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-condensed font-semibold text-[10px] uppercase tracking-[0.5px] text-[#1D428A] hover:underline">
              Polymarket <ExternalLink size={9} />
            </a>
          ) : (
            <span className="font-condensed font-semibold text-[10px] uppercase tracking-[0.5px] text-[#AAA]">
              Sportsbook
            </span>
          )}
          {expiresAt && (
            <div className="flex items-center gap-1">
              <Clock size={9} className="text-[#CCC]" />
              <span className="font-mono text-[10px] text-[#AAA]">Tip {expiresAt}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
