# Infrastructure — Deployment Configs

## Cron Schedule (UTC → SGT)

| UTC | SGT | Job | Description |
|-----|-----|-----|-------------|
| 21:00 | 05:00 | `nba_context.py` | NBA data ingestion |
| 15:59 | 23:59 | `batch-price.js` | Generate nightly predictions |
| 00:00-05:00 | 08:00-13:00 | `monitor.js` | Hourly injury monitoring |
| 06:30 | 14:30 | `batch-resolve.js` | Resolution + P&L report |
| 18:00 | 02:00 | `backup.sh` | Data backup (7-day retention) |

All cron jobs use `run.sh` to source environment variables.
