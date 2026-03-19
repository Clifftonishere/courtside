import type { Express } from "express";
import { createServer, type Server } from "http";
import https from "https";
import http from "http";

// ── Helpers ───────────────────────────────────────────────────────────────

function fetchJSON(url: string, options: { headers?: Record<string, string> } = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith("https");
    const lib = isHttps ? https : http;
    const req = lib.get(url, { headers: { "User-Agent": "Courtside/1.0", ...options.headers } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("JSON parse failed")); }
      });
    });
    req.on("error", reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

function proxyImage(url: string, contentType: string, res: any) {
  const isHttps = url.startsWith("https");
  const lib = isHttps ? https : http;
  lib.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (proxyRes) => {
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400");
    proxyRes.pipe(res);
  }).on("error", () => res.status(404).send(""));
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ── NBA CDN Image Proxies ──────────────────────────────────────────────
  app.get("/api/nba-logo/:teamId", (req, res) => {
    proxyImage(`https://cdn.nba.com/logos/nba/${req.params.teamId}/primary/L/logo.svg`, "image/svg+xml", res);
  });

  app.get("/api/nba-headshot/:playerId", (req, res) => {
    proxyImage(`https://cdn.nba.com/headshots/nba/latest/1040x760/${req.params.playerId}.png`, "image/png", res);
  });

  // ── NBA CDN Live Scoreboard ────────────────────────────────────────────
  app.get("/api/nba/scoreboard", async (req, res) => {
    try {
      const data = await fetchJSON("https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json");
      res.json(data);
    } catch (e: any) {
      res.status(503).json({ error: "NBA CDN unavailable", detail: e.message });
    }
  });

  // ── balldontlie — Stat Leaders ─────────────────────────────────────────
  app.get("/api/stats/leaders", async (req, res) => {
    const apiKey = process.env.BALLDONTLIE_API_KEY || "";
    const season = 2025;
    try {
      const [pts, reb, ast] = await Promise.all([
        fetchJSON(`https://api.balldontlie.io/v1/season_averages?season=${season}&sort_by=pts&per_page=3`, { headers: { Authorization: apiKey } }),
        fetchJSON(`https://api.balldontlie.io/v1/season_averages?season=${season}&sort_by=reb&per_page=3`, { headers: { Authorization: apiKey } }),
        fetchJSON(`https://api.balldontlie.io/v1/season_averages?season=${season}&sort_by=ast&per_page=3`, { headers: { Authorization: apiKey } }),
      ]);
      res.json({ points: pts.data, rebounds: reb.data, assists: ast.data });
    } catch (e: any) {
      res.status(503).json({ error: "Stats unavailable", detail: e.message });
    }
  });

  // ── balldontlie — Tonight's Games ─────────────────────────────────────
  app.get("/api/nba/games/tonight", async (req, res) => {
    const apiKey = process.env.BALLDONTLIE_API_KEY || "";
    const today = new Date().toISOString().split("T")[0];
    try {
      const data = await fetchJSON(
        `https://api.balldontlie.io/v1/games?dates[]=${today}&per_page=30`,
        { headers: { Authorization: apiKey } }
      );
      res.json(data);
    } catch (e: any) {
      res.status(503).json({ error: "BDL unavailable", detail: e.message });
    }
  });

  // ── balldontlie — Player Search ────────────────────────────────────────
  app.get("/api/players/search", async (req, res) => {
    const apiKey = process.env.BALLDONTLIE_API_KEY || "";
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "q required" });
    try {
      const data = await fetchJSON(
        `https://api.balldontlie.io/v1/players?search=${encodeURIComponent(String(q))}&per_page=10`,
        { headers: { Authorization: apiKey } }
      );
      res.json(data);
    } catch (e: any) {
      res.status(503).json({ error: "Search unavailable", detail: e.message });
    }
  });

  // ── Edge VPS — Today's Priced Bets → Courtside Calls ──────────────────
  app.get("/api/edge/calls", async (req, res) => {
    try {
      const data = await fetchJSON(
        "http://5.223.72.173:3747/games/today",
        { headers: { "x-api-key": "edge-dev-key" } }
      );
      res.json(data);
    } catch (e: any) {
      // Return empty — frontend falls back to mock polls
      res.json({ games: [], error: "Edge VPS unreachable" });
    }
  });

  // ── Edge VPS — Price a specific bet ───────────────────────────────────
  app.post("/api/edge/price", async (req, res) => {
    try {
      const response = await new Promise<any>((resolve, reject) => {
        const body = JSON.stringify(req.body);
        const options = {
          hostname: "5.223.72.173",
          port: 3747,
          path: "/price",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
            "x-api-key": "edge-dev-key",
          },
        };
        const proxyReq = http.request(options, (proxyRes) => {
          let data = "";
          proxyRes.on("data", (chunk) => (data += chunk));
          proxyRes.on("end", () => {
            try { resolve(JSON.parse(data)); }
            catch (e) { reject(e); }
          });
        });
        proxyReq.on("error", reject);
        proxyReq.setTimeout(10000, () => { proxyReq.destroy(); reject(new Error("Timeout")); });
        proxyReq.write(body);
        proxyReq.end();
      });
      res.json(response);
    } catch (e: any) {
      res.status(503).json({ error: "Edge pricing unavailable", detail: e.message });
    }
  });

  // ── Edge VPS — Accuracy stats ──────────────────────────────────────────
  app.get("/api/edge/accuracy", async (req, res) => {
    try {
      const data = await fetchJSON(
        "http://5.223.72.173:3747/accuracy",
        { headers: { "x-api-key": "edge-dev-key" } }
      );
      res.json(data);
    } catch (e: any) {
      res.json({ error: "Edge VPS unreachable", winner_accuracy: null, prop_accuracy: null });
    }
  });

  // ── Claude — Player Dissection (server-side, key stays hidden) ────────
  app.post("/api/claude/dissection", async (req, res) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

    const { playerName, teamAbbr, pts, reb, ast } = req.body;
    if (!playerName) return res.status(400).json({ error: "playerName required" });

    const systemPrompt = `You are Caesar — the sharpest basketball mind on the planet. Output MUST be valid JSON only — no markdown, no backticks, no preamble.

{
  "identity": "string (max 80 chars — THE defining sentence. Bold, editorial, memorable.)",
  "scoutingReport": "string (2-3 paragraphs, pure basketball editorial voice)",
  "traits": [{ "category": "OFFENSE|DEFENSE|PLAYMAKING|PHYSICALITY|INTANGIBLES", "label": "string", "editorial": "string" }],
  "weaknesses": [{ "area": "string", "detail": "string (specific, actionable — HOW opponents exploit this)" }],
  "scoutingQuotes": ["string (3 quotes as scouts talking about this player)"],
  "attributes": { "insideScoring": 0-99, "outsideScoring": 0-99, "playmaking": 0-99, "athleticism": 0-99, "defending": 0-99, "rebounding": 0-99 },
  "ovr": 0-99,
  "tendencies": [{ "playType": "string", "frequency": 0-100, "pointsPerPossession": 1.0-1.3, "percentile": 0-99 }],
  "tags": ["ASCENDING|BREAKOUT|CLUTCH|UNDERRATED|LOCKED-IN|DECLINING|FRANCHISE-CHANGER (1-2 tags)"]
}

OVR: 97+=historic, 93-96=MVP, 88-92=All-Star, 82-87=starter. Include 3-5 traits, 2-3 weaknesses, 3 quotes, 3-5 tendencies.`;

    const userPrompt = `Generate a scouting dissection for ${playerName} (${teamAbbr}). Season averages: ${pts} PPG, ${reb} RPG, ${ast} APG. Be specific about their actual game.`;

    try {
      const claudeRes = await new Promise<any>((resolve, reject) => {
        const body = JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1200,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });
        const options = {
          hostname: "api.anthropic.com",
          path: "/v1/messages",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Length": Buffer.byteLength(body),
          },
        };
        const req = https.request(options, (proxyRes) => {
          let data = "";
          proxyRes.on("data", (chunk) => (data += chunk));
          proxyRes.on("end", () => {
            try { resolve(JSON.parse(data)); }
            catch (e) { reject(e); }
          });
        });
        req.on("error", reject);
        req.setTimeout(30000, () => { req.destroy(); reject(new Error("Timeout")); });
        req.write(body);
        req.end();
      });

      const text = claudeRes.content?.find((c: any) => c.type === "text")?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const profile = JSON.parse(clean);
      res.json(profile);
    } catch (e: any) {
      res.status(500).json({ error: "Claude unavailable", detail: e.message });
    }
  });

  return httpServer;
}
