# Courtside Edge

An AI-powered NBA intelligence and prediction pricing engine.

Edge analyzes 77,000+ NBA game logs across 3 seasons, prices any basketball prediction in real-time, and tracks its own accuracy publicly.

**Season Record: 187-142 (56.8%) · HIGH Confidence: 71.6% · Streak: W4**

**Live App:** [courtside](https://iris-edge-protocol--cliffton1234.replit.app/)

---

## What Edge Does

Ask it any NBA question:

- "Will Brunson score 30+ tonight?" → **42% probability, MED confidence**
- "Jokic triple-double vs Lakers?" → **61% probability, HIGH confidence**
- "Warriors win by 5+ at Minnesota?" → **28% probability, COND confidence**

For each question, Edge returns a calibrated probability, confidence tier, factor breakdown, market comparison, and the reasoning behind its answer.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    COURTSIDE                          │
│             (Next.js frontend on Vercel)              │
│                                                       │
│  Ask Bar → Analysis Cards → Courtside Calls (polls)   │
│  Game Cards → Player DNA → Leaderboard                │
└──────────────────────┬───────────────────────────────┘
                       │ API
┌──────────────────────▼───────────────────────────────┐
│                   EDGE ENGINE                         │
│            (Node.js on Hetzner VPS)                   │
│                                                       │
│  8-Step Pricing Pipeline:                             │
│  1. Statistical baseline (77K game logs)              │
│  2. Player form detection (HOT/SLUMP/NORMAL)          │
│  3. Defensive matchup analysis                        │
│  4. Coaching edge profiles (30 teams)                 │
│  5. Claude AI contextual adjustment                   │
│  6. Market calibration (vs sportsbook lines)          │
│  7. Confidence scoring (5-factor composite)           │
│  8. Dynamic vig + odds compilation                    │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│                 DATA PIPELINE                         │
│                                                       │
│  Sources: NBA API · ESPN RSS · The Odds API           │
│           Kalshi · balldontlie · NBA CDN              │
│                                                       │
│  Ingestion: nba_context.py     (daily cron)           │
│  Monitoring: monitor.js        (hourly during games)  │
│  Resolution: batch-resolve.js  (post-game)            │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│                    JARVIS                              │
│          (Telegram bot — operator interface)           │
│                                                       │
│  /quick — instant bet pricing                         │
│  /summary — daily P&L report                          │
│  /games — tonight's schedule                          │
│  Conversational AI — free-text NBA queries             │
└──────────────────────────────────────────────────────┘
```

## The Pricing Pipeline

Edge prices predictions through an 8-step pipeline:

| Step | Component | Description | Latency |
|------|-----------|-------------|---------|
| 1 | Statistical Baseline | Weighted probability from 3 seasons of game logs | <1ms |
| 2 | Form Detection | L5 vs season avg → HOT / SLUMP / NORMAL classification | <1ms |
| 3 | Defensive Matchup | Opponent's defensive tier vs player's position | <1ms |
| 4 | Coaching Edge | 30 curated coaching profiles with dynamic performance adjustment | <1ms |
| 5 | Claude Adjustment | AI contextual analysis (injuries, narrative, matchups) | 3-8s |
| 6 | Market Calibration | Blend model estimate with sportsbook lines when available | 200ms |
| 7 | Confidence Scoring | 5-factor composite → tier assignment → vig selection | <1ms |
| 8 | Odds Compilation | Apply vig, anti-arbitrage check, max bet sizing | <1ms |

Steps 1-4 are deterministic and instant. Step 5 is the Claude API call. Steps 6-8 finalize the output.

> **Note:** The pricing algorithms (steps 1-8 implementation) are proprietary. This repo contains the data pipeline, orchestration, resolution, and frontend code. See `edge/odds-agent.redacted.js` and `edge/pricing.redacted.js` for pipeline structure.

## Daily Automation Cycle

| Time (SGT) | Job | Description |
|------------|-----|-------------|
| 5:00 AM | `nba_context.py` | Ingest NBA schedule, team stats, injuries, news |
| 11:59 PM | `batch-price.js` | Generate 150-200 predictions for all games |
| 8 AM-1 PM | `monitor.js` | Hourly injury scan, cancel/replace affected predictions |
| 2:30 PM | `batch-resolve.js` | Resolve predictions against box scores, generate P&L |

## Accuracy Tracking

Edge maintains a public accuracy record broken down by confidence tier, home/away, favorite/underdog, and average margin error. This record feeds back into Claude's prompts for self-calibration.

See [results/accuracy-summary.md](results/accuracy-summary.md) for the current season record.

## Tech Stack

- **Engine:** Node.js, Python 3
- **AI:** Anthropic Claude API (Sonnet for pricing, Haiku for chat)
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Data:** NBA API, ESPN, balldontlie, The Odds API, Kalshi
- **Cache:** Vercel KV (Redis) with 7-tier TTL architecture
- **Infrastructure:** Hetzner VPS (Singapore), Vercel (frontend)
- **Orchestration:** systemd services, cron, Telegram bot

## Repo Structure

| Directory | Contents | Status |
|-----------|----------|--------|
| `edge/` | Data pipeline, resolution, monitoring, Jarvis bot | Public |
| `docs/` | Architecture docs, API schemas | Public |
| `infra/` | Deployment configs, cron setup | Public |
| `results/` | Accuracy reports, sample outputs | Public |

The core pricing engine (odds-agent, pricing model, form analysis, market calibration) is proprietary. Redacted versions showing the pipeline structure are included in `edge/`.

## About

Built by Cliffton Lee ([@clifftonishere](https://x.com/yourhandle)).

Courtside Edge is an experimental project combining AI agents, quantitative modeling, and NBA basketball.

- **Live App:** [courtside](https://iris-edge-protocol--cliffton1234.replit.app/)
- **X:** [@clifftonishere]
