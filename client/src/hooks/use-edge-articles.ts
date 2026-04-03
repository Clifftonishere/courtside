import { useState, useEffect } from "react";

export interface EdgeArticle {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  readTime: string;
  game: string;
  playerFocus?: string;
}

export function useEdgeArticles() {
  const [articles, setArticles] = useState<EdgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch("/api/edge/articles");
        const data = await res.json();
        if (data.articles?.length > 0) {
          setArticles(data.articles);
          setIsLive(true);
        }
      } catch { /* fall back to empty */ }
      finally { setLoading(false); }
    }
    fetch_();
    const interval = setInterval(fetch_, 120000); // refresh every 2 min
    return () => clearInterval(interval);
  }, []);

  return { articles, loading, isLive };
}
