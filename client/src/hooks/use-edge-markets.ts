/**
 * useEdgeMarkets — fetches today's market intelligence from Edge VPS
 * Returns markets with edge probabilities, recommendations, and Polymarket links
 */
import { useState, useEffect } from "react";

export interface EdgeMarket {
  id: string;
  platform: "polymarket" | "sportsbook";
  url: string;
  title: string;
  category: "game_winner" | "player_prop" | "total" | "special";
  edge_probability: number;
  market_price: number;
  edge_value: number;
  recommendation: "BUY_YES" | "BUY_NO" | "NO_EDGE" | "HOLD";
  confidence: "HIGH" | "MED" | "COND";
  reasoning: string[];
  game: string;
  expires_at: string;
}

export interface MarketsResponse {
  markets: EdgeMarket[];
  date: string;
  source: string;
  error?: string;
}

export function useEdgeMarkets() {
  const [markets, setMarkets] = useState<EdgeMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [date, setDate] = useState("");

  useEffect(() => {
    async function fetchMarkets() {
      try {
        const res = await fetch("/api/edge/markets");
        const data: MarketsResponse = await res.json();

        if (data.error || !data.markets || data.markets.length === 0) {
          setMarkets([]);
          setIsLive(false);
        } else {
          setMarkets(data.markets);
          setDate(data.date);
          setIsLive(true);
        }
      } catch {
        setMarkets([]);
        setIsLive(false);
      } finally {
        setLoading(false);
      }
    }

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 60000);
    return () => clearInterval(interval);
  }, []);

  return { markets, loading, isLive, date };
}
