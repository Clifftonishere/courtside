# Courtside — Vercel Deployment Guide

## Prerequisites
- Vercel account (vercel.com)
- GitHub repo with Courtside code
- Anthropic API key
- balldontlie API key (free at balldontlie.io)

## Step 1 — Push to GitHub (run in Replit Shell)
```bash
git init
git add .
git commit -m "Courtside MVP"
git remote add origin https://github.com/YOUR_USERNAME/courtside.git
git push -u origin main
```

## Step 2 — Deploy to Vercel
1. Go to vercel.com → New Project → Import from GitHub
2. Select the courtside repo
3. Framework Preset: **Other**
4. Build Command: `npm run build`
5. Output Directory: `dist/public`
6. Click **Deploy**

## Step 3 — Set Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | `` |
| `BALLDONTLIE_API_KEY` | Your BDL key |
| `NODE_ENV` | `production` |

## Step 4 — Custom Domain (optional)
- Vercel Dashboard → Settings → Domains → Add domain
- Update DNS: CNAME → `cname.vercel-dns.com`

## Live Data Sources
| Endpoint | Source | Refreshes |
|---|---|---|
| `/api/nba/scoreboard` | NBA CDN | Every 30s (client) |
| `/api/nba/games/tonight` | balldontlie | Every 5min |
| `/api/stats/leaders` | balldontlie | Daily |
| `/api/edge/calls` | Edge VPS (5.223.72.173:3747) | Every 60s |
| `/api/edge/accuracy` | Edge VPS | On demand |
| `/api/claude/dissection` | Anthropic Claude | On demand |
| `/api/nba-logo/:id` | NBA CDN | Cached 24h |
| `/api/nba-headshot/:id` | NBA CDN | Cached 24h |

## Architecture
```
Browser → Vercel Edge → Express Server → {
  NBA CDN (scores, logos, headshots)
  balldontlie API (stats, games)
  Edge VPS 5.223.72.173:3747 (pricing)
  Anthropic API (dissection)
}
```
