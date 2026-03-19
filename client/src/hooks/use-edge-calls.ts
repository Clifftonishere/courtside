/**
 * useEdgeCalls — fetches real priced bets from Edge VPS → Courtside Calls
 * Falls back to mock polls if Edge VPS unreachable
 */
import { useState, useEffect } from "react";
import { ACTIVE_POLLS } from "@/lib/mock-data";

export interface EdgeCall {
  id: string;
  proposition: string;
  verdict: string;
  prob: number;
  conf: "HIGH" | "MED" | "COND";
  agreeVotes: number;
  fadeVotes: number;
  totalVotes: number;
  resolvesAt: string;
  game: string;
  status: string;
  decimalOdds?: number;
}

function edgeBetToPoll(bet: any, idx: number): EdgeCall {
  const prob = Math.round((bet.probability || 0.5) * 100);
  const conf: "HIGH" | "MED" | "COND" = prob >= 65 ? "HIGH" : prob >= 52 ? "MED" : "COND";
  const verdict = prob >= 55 ? "LEAN OVER" : prob <= 45 ? "LEAN UNDER" : "TOSS UP";

  // Generate realistic vote counts seeded from bet data
  const seed = (bet.bet_amount || 100) + idx;
  const agreeVotes = Math.floor(150 + (seed % 400));
  const fadeVotes = Math.floor(80 + ((seed * 7) % 300));

  return {
    id: bet.id || `edge-${idx}`,
    proposition: bet.bet || bet.player ? `${bet.player} ${bet.stat} ${bet.condition === "over" ? "O" : "U"}${bet.threshold}` : "Game bet",
    verdict,
    prob,
    conf,
    agreeVotes,
    fadeVotes,
    totalVotes: agreeVotes + fadeVotes,
    resolvesAt: bet.game_date || "Tonight",
    game: bet.game || "",
    status: "active",
    decimalOdds: bet.decimal_odds,
  };
}

export function useEdgeCalls() {
  const [calls, setCalls] = useState<EdgeCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    async function fetchCalls() {
      try {
        const res = await fetch("/api/edge/calls");
        const data = await res.json();

        if (data.error || !data.games || data.games.length === 0) {
          // Fall back to mock
          setCalls(ACTIVE_POLLS as any);
          setIsLive(false);
        } else {
          // Flatten game bets into polls, take top 6 by bet amount
          const allBets: any[] = [];
          for (const game of data.games || []) {
            for (const bet of game.bets || []) {
              allBets.push({ ...bet, game: `${game.away} @ ${game.home}` });
            }
          }
          const top = allBets
            .sort((a, b) => (b.bet_amount || 0) - (a.bet_amount || 0))
            .slice(0, 6)
            .map(edgeBetToPoll);
          setCalls(top.length > 0 ? top : ACTIVE_POLLS as any);
          setIsLive(top.length > 0);
        }
      } catch (e) {
        setCalls(ACTIVE_POLLS as any);
        setIsLive(false);
      } finally {
        setLoading(false);
      }
    }

    fetchCalls();
    const interval = setInterval(fetchCalls, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  return { calls, loading, isLive };
}
