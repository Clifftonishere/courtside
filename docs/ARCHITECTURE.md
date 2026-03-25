# Courtside Edge — System Architecture

## Overview

Courtside Edge is a multi-component system that combines real-time NBA data ingestion, a probabilistic prediction pricing engine, AI-generated editorial analysis, and a consumer-facing web platform.

## Component Map

```
┌──────────────────────────────────────────────────────────┐
│                      COURTSIDE                            │
│              (Next.js 14 on Vercel)                       │
│                                                           │
│  Ask Bar → Analysis Cards → Courtside Calls (polls)       │
│  Game Cards → Player DNA profiles → Leaderboard           │
│  Trending Signals → Hot Takes → Stat Leaders              │
└────────────────────────┬─────────────────────────────────┘
                         │ API calls
┌────────────────────────▼─────────────────────────────────┐
│                    EDGE ENGINE                             │
│              (Node.js on Hetzner VPS)                     │
│                                                           │
│  Pricing Pipeline (8 steps):                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Baseline │→│  Form    │→│ Defense  │→│ Coaching │    │
│  │ 77K logs │ │ HOT/SLMP │ │ matchup  │ │ 30 teams │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│       │                                                   │
│  ┌────▼─────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Claude   │→│ Market   │→│Confidence│→│  Odds    │    │
│  │ adjust   │ │ calibrate│ │ scoring  │ │ compile  │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                           │
│  HTTP API: POST /price, GET /accuracy, GET /player/:name  │
└────────────────────────┬─────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────┐
│                   DATA PIPELINE                            │
│                                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ NBA API  │ │ ESPN RSS │ │ Odds API │ │  Kalshi  │    │
│  │stats.nba │ │ injuries │ │sportsbook│ │ markets  │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                           │
│  Ingestion: nba_context.py       (daily, 5 AM SGT)       │
│  Monitoring: monitor.js          (hourly during games)    │
│  Resolution: batch-resolve.js    (daily, 2:30 PM SGT)    │
└────────────────────────┬─────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────┐
│                      JARVIS                                │
│            (Telegram bot on VPS)                           │
│                                                           │
│  Operator interface for monitoring & manual control        │
│  /quick — price a bet    /summary — daily P&L report      │
│  /games — tonight's NBA  /resolve — trigger resolution    │
│  Free-text — Claude-powered conversational queries         │
└──────────────────────────────────────────────────────────┘
```

## Data Flow

### Pre-Game (5 AM → 11:59 PM SGT)
1. `nba_context.py` ingests schedule, team stats (L10), injuries, ESPN news, Reddit threads, betting consensus
2. Context file saved: `context/nba-context-YYYY-MM-DD.json`
3. `batch-price.js` reads context, fetches Odds API lines, generates 150-200 predictions
4. Predictions logged to `data/predictions.jsonl` and `data/bets-YYYY-MM-DD.json`
5. Summary pushed to Telegram via Jarvis

### During Games (8 AM → 1 PM SGT)
1. `monitor.js` runs hourly, scans ESPN RSS for injury updates
2. Affected predictions canceled with refunds
3. Replacement predictions priced for unstarted games
4. Alerts pushed to Telegram

### Post-Game (2:30 PM SGT)
1. `batch-resolve.js` fetches NBA CDN box scores
2. Each prediction resolved against actual stats
3. Outcomes written back to bet file
4. Full P&L report generated (accuracy by category, biggest wins/losses, model insights)
5. Report pushed to Telegram
6. Accuracy tracker updated for self-calibration feedback loop

## Cache Architecture (7 tiers)

| Tier | Fresh TTL | Stale TTL | Use Case |
|------|-----------|-----------|----------|
| LIVE_GAME | 10s | 30s | Live scores during games |
| SCOREBOARD | 15s | 60s | Game list and status |
| MARKET | 60s | 5min | Prediction market odds |
| IRIS_TAKE_LIVE | 2min | 10min | Live AI reactions |
| IRIS_TAKE_PRE | 30min | 2hr | Pre-game AI analysis |
| PLAYER_STATS | 1hr | 2hr | Season averages |
| PLAYER_BIO | 24hr | 48hr | Player info |

All tiers use stale-while-revalidate: serve cached data immediately, refresh in background.

## Infrastructure

| Service | Host | Port | Auto-restart |
|---------|------|------|-------------|
| Edge Engine | Hetzner VPS (SG) | 3747 | systemd (10s) |
| Jarvis Bot | Hetzner VPS (SG) | — | systemd (10s) |
| Courtside Web | Vercel | 443 | Managed |
| Edge Watchdog | Hetzner VPS (SG) | — | systemd |

## External APIs

| API | Purpose | Auth |
|-----|---------|------|
| Anthropic Claude | AI analysis, editorial takes, pricing adjustment | API key |
| The Odds API | Sportsbook lines for market calibration | API key |
| NBA API (stats.nba.com) | Schedule, team stats, standings | None |
| NBA CDN | Live scores, box scores for resolution | None |
| ESPN RSS | Injury news, lineup changes | None |
| balldontlie | Player data, game logs | API key |
| Kalshi | Prediction market odds | None (public) |
| Telegram Bot API | Jarvis messaging | Bot token |
