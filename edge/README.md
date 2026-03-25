# Edge Protocol — File Reference

## Public Files (full source)

| File | Lines | Description |
|------|-------|-------------|
| `nba_context.py` | 414 | Daily NBA data ingestion. Pulls schedule, team stats, injuries, ESPN news, Reddit previews, and betting consensus. Outputs a structured context JSON used by all downstream processes. |
| `context-loader.js` | 325 | Parses context files at pricing time. Builds OUT player maps from injuries + ESPN keyword scan, team form adjustments from L10 stats, Reddit sentiment signals, and market consensus comparisons. |
| `batch-resolve.js` | 580 | Post-game resolution engine. Fetches NBA CDN box scores, resolves all predictions against actual stats, writes outcomes back to bet files, generates full P&L reports with accuracy breakdowns by category. |
| `monitor.js` | 393 | Hourly injury monitor (runs during game hours). Scans ESPN RSS for OUT/Doubtful players, cancels affected predictions with refunds, prices replacement predictions using next-best player by PPG. |
| `server.js` | 331 | HTTP API server (port 3747). Exposes endpoints for pricing, resolution, accuracy reports, player stats, defensive ratings, injuries, and game schedules. Auth via API key header. |
| `bot.js` | 528 | Jarvis — Telegram bot for operator interaction. Supports slash commands (/quick, /summary, /resolve, /games, /injuries) and free-text conversational queries via Claude Haiku. System prompt redacted. |

## Redacted Files (structure visible, implementation proprietary)

| File | Description |
|------|-------------|
| `odds-agent.redacted.js` | The core pricing brain. Shows the 8-step pipeline structure (baseline → context → Claude → market → calibration → anti-arb → confidence → odds) without implementation details. |
| `pricing.redacted.js` | Confidence scoring engine. Shows the 5-factor composite scoring approach and tier structure without revealing vig values or specific formulas. |

## Private Files (not included — maintained in separate private repo)

| File | Description |
|------|-------------|
| `odds-agent.js` | Full 8-step pricing pipeline with Claude prompt engineering |
| `pricing.js` | Vig tiers, confidence formulas, max bet calculations |
| `calc.js` | Baseline probability calculator with weighted season splits |
| `market.js` | Market calibration, anti-arbitrage algorithm |
| `form.js` | Player form detection (HOT/SLUMP/NORMAL × defense matrix) |
| `batch-price.js` | Nightly batch pricing (150-200 predictions per night) |
| `context.js` | Real-time context builder for defensive/positional matchups |
