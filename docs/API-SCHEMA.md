# Edge Protocol — API Schema

## Base URL
```
http://localhost:3747
```

## Authentication
All endpoints (except `/health`) require `x-api-key` header.

---

## POST /price
Price a single prediction.

### Request
```json
{
  "player": "Jalen Brunson",
  "stat": "points",
  "condition": "over",
  "threshold": 27.5,
  "opponent": "BOS",
  "home": true,
  "game_date": "2026-03-15",
  "player_team": "NYK",
  "notes": "optional context"
}
```

### Response
```json
{
  "prediction_id": "pred_abc123",
  "bet": "Jalen Brunson over 27.5 points",
  "player": "Jalen Brunson",
  "probability": 0.58,
  "baseline_probability": 0.55,
  "calibrated_probability": 0.58,
  "confidence_score": 72,
  "confidence_tier": "high",
  "vig_applied": 0.055,
  "decimal_odds": 1.65,
  "fair_decimal": 1.72,
  "american": "-154",
  "fair_american": "-138",
  "implied_probability": 0.606,
  "max_bet_size": 4000,
  "max_payout": 6600,
  "has_market_comp": true,
  "market_reference": "FanDuel over 27.5 @ 1.71x",
  "data_points_used": 211,
  "recent_games_30d": 12,
  "reasoning": [
    "Brunson's L5 average of 31.2 exceeds season pace",
    "Boston's defense ranks top-5, historically suppresses guards",
    "Home court partially offsets defensive matchup"
  ],
  "key_risk": "Boston switches everything — Brunson's mid-range may be contested",
  "splits": {
    "this_season": { "rate": 0.55, "pct": "55.0%", "games": 62 },
    "all_seasons": { "rate": 0.48, "pct": "48.0%", "games": 211 },
    "last_10": { "rate": 0.60, "pct": "60.0%", "games": 10 },
    "last_20": { "rate": 0.55, "pct": "55.0%", "games": 20 },
    "home": { "rate": 0.61, "pct": "61.0%", "games": 31 },
    "away": { "rate": 0.48, "pct": "48.0%", "games": 31 },
    "vs_opponent": { "rate": 0.43, "pct": "43.0%", "games": 7 }
  },
  "recent_5": [
    { "date": "2026-03-14", "opp": "MIA", "val": 34, "hit": true },
    { "date": "2026-03-12", "opp": "CHA", "val": 31, "hit": true }
  ]
}
```

---

## PATCH /resolve
Resolve a prediction outcome.

### Request
```json
{
  "id": "pred_abc123",
  "outcome": true,
  "actual_value": 32
}
```

---

## GET /accuracy?days=30
Accuracy and calibration report.

### Response
```json
{
  "period_days": 30,
  "total_predictions": 487,
  "resolved": 412,
  "accuracy": {
    "overall": 0.568,
    "by_tier": {
      "high": { "correct": 48, "total": 67, "pct": 71.6 },
      "medium": { "correct": 102, "total": 185, "pct": 55.1 },
      "low": { "correct": 37, "total": 77, "pct": 48.1 }
    }
  },
  "avg_margin_error": 4.2,
  "hold_rate": 6.8
}
```

---

## GET /player/:name
Player stats and split analysis.

## GET /defense/:team
Team defensive ratings and rankings.

## GET /injuries
Live NBA injury report from ESPN.

## GET /games/today
Today's NBA schedule from NBA CDN.

## GET /health
Engine status, uptime, Odds API quota.
