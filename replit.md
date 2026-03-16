# Courtside — NBA Intelligence Platform

## Overview
An AI-powered NBA intelligence platform with the tagline "See the edge." Combines real-time game data, prediction model outputs, AI-generated editorial analysis, and comprehensive player scouting.

**This is a frontend-only mockup.** All data is hardcoded. No real API calls.

## Architecture
- **Frontend:** React + Vite (TypeScript)
- **Backend:** Express (minimal — no routes used, static file serving only)
- **Styling:** Tailwind CSS with custom CSS variables
- **Charts:** Recharts (for win probability area charts)
- **Icons:** Lucide React
- **Routing:** Simple state-based page switching (no URL routing)

## Design System
- **Fonts:** JetBrains Mono (all numbers/data) + Outfit (all text/headings)
- **Theme:** Light (#FAFAF8 background) everywhere except Player Profile pages (dark #0A0A0B)
- **Colors:** Green (#16a34a) for wins/HIGH confidence, Amber (#d97706) for MED, Gray for COND, Red (#dc2626) for losses

## Pages
1. **Tonight** (`/`) — Ask bar + live game cards + trending insights
2. **Players** (`/players`) — Player grid with search/filter by position and tier
3. **Player Profile** (`/players/:id`) — Dark theme "shrine" page with radar chart, props, dissection, scout notes
4. **Arena** (`/arena`) — Editorial content hub with newsletter CTA

## Key Components
- `Header.tsx` — Fixed top nav with wordmark, tab pills, season record
- `Ticker.tsx` — Auto-scrolling live scores bar below header
- `AnalysisCard.tsx` — Analysis result card + AskBar component with loading animation
- `GameCard.tsx` — Expandable game card with power model, win prob chart, market odds
- `PlayerProfile.tsx` — Dark theme player shrine with streaming text animation, hexagon radar chart

## Mock Data
All data lives in `client/src/lib/mock-data.ts`:
- `GAMES` — 6 games (upcoming/live/final mix)
- `PLAYERS` — 10 players across all tiers
- `MOCK_ANALYSES` — Pre-built analysis results for the Ask Bar
- `ARENA_ARTICLES` — Editorial articles
- `TRENDING_INSIGHTS` — Clickable signal cards
- `SEASON_RECORD` — Header record display

## Confidence Tiers
- **HIGH** → Green (#16a34a)
- **MED** → Amber (#d97706)
- **COND** → Gray (#9ca3af)

## Running
The workflow `Start application` runs `npm run dev` which starts both Express and Vite on port 5000.
