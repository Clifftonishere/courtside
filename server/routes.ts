import type { Express } from "express";
import { createServer, type Server } from "http";
import https from "https";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get("/api/nba-logo/:teamId", (req, res) => {
    const { teamId } = req.params;
    const url = `https://cdn.nba.com/logos/nba/${teamId}/primary/L/logo.svg`;
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (proxyRes) => {
        res.set("Content-Type", "image/svg+xml");
        res.set("Cache-Control", "public, max-age=86400");
        proxyRes.pipe(res);
      })
      .on("error", () => res.status(404).send(""));
  });

  app.get("/api/nba-headshot/:playerId", (req, res) => {
    const { playerId } = req.params;
    const url = `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`;
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (proxyRes) => {
        res.set("Content-Type", "image/png");
        res.set("Cache-Control", "public, max-age=86400");
        proxyRes.pipe(res);
      })
      .on("error", () => res.status(404).send(""));
  });

  return httpServer;
}
