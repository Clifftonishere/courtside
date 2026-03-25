#!/usr/bin/env python3
"""
Edge Protocol — NBA Context Ingestion
Runs nightly at 9 PM UTC (5 AM SGT), before the 11 PM UTC pricing job.
Outputs: /workspace/projects/edge-protocol/context/nba-context-{date}.json

Sources:
  1. nba_api        — official NBA stats, injury report, today's schedule
  2. ESPN RSS        — breaking news, lineup changes, analyst takes
  3. Reddit r/nba   — preview threads, analyst sentiment (no API key needed)
  4. Action Network  — public betting consensus & line movement
"""

import json
import os
import re
import time
import datetime
import requests
import feedparser
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
OUTPUT_DIR = Path(os.environ.get(
    "EDGE_CONTEXT_DIR",
    "/root/.openclaw/workspace/projects/edge-protocol/context"
))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TODAY = datetime.date.today()
DATE_STR = TODAY.strftime("%Y-%m-%d")
OUTPUT_FILE = OUTPUT_DIR / f"nba-context-{DATE_STR}.json"

HEADERS = {
    "User-Agent": "EdgeProtocol/1.0 (nba-context-bot; contact: edge@tally.xyz)"
}

# ── 1. NBA API — Schedule & Stats ─────────────────────────────────────────────
def fetch_nba_schedule():
    """Fetch today's NBA games and team stats from nba_api."""
    print("[1/4] Fetching NBA schedule & team stats...")
    games = []
    team_stats = {}

    try:
        from nba_api.stats.endpoints import scoreboardv3, leaguedashteamstats
        from nba_api.stats.static import teams as nba_teams

        # Today's scoreboard
        board = scoreboardv3.ScoreboardV3(game_date=DATE_STR)
        game_header = board.game_header.get_dict()
        line_score = board.line_score.get_dict()

        game_ids = []
        if game_header["data"]:
            headers_h = game_header["headers"]
            for row in game_header["data"]:
                g = dict(zip(headers_h, row))
                # ScoreboardV3 uses gameCode format: "20260314/BKNPHI" (away@home)
                game_code = g.get("gameCode", "")
                teams_part = game_code.split("/")[1] if "/" in game_code else ""
                # NBA team abbrs are 2-3 chars; gameCode is AWYHOME concatenated
                # Use nba_teams lookup to split correctly
                away_abbr, home_abbr = "", ""
                if teams_part:
                    all_abbrs = sorted(
                        [t["abbreviation"] for t in nba_teams.get_teams()],
                        key=lambda x: -len(x)
                    )
                    for abbr in all_abbrs:
                        if teams_part.startswith(abbr):
                            away_abbr = abbr
                            home_abbr = teams_part[len(abbr):]
                            break
                games.append({
                    "game_id": g.get("gameId"),
                    "home_team": home_abbr or g.get("gameId"),
                    "away_team": away_abbr or g.get("gameId"),
                    "game_time": g.get("gameStatusText", ""),
                    "arena": "",
                })
                game_ids.append(g.get("gameId"))

        # Season team stats (last 10 games for recency)
        time.sleep(0.6)
        stats = leaguedashteamstats.LeagueDashTeamStats(
            last_n_games=10,
            season="2025-26",
            per_mode_detailed="PerGame"
        )
        ts_data = stats.get_dict()["resultSets"][0]
        ts_headers = ts_data["headers"]
        for row in ts_data["rowSet"]:
            t = dict(zip(ts_headers, row))
            abbr = t.get("TEAM_NAME", "")
            team_stats[abbr] = {
                "pts_pg": round(t.get("PTS", 0), 1),
                "opp_pts_pg": round(t.get("OPP_PTS", 0) if "OPP_PTS" in t else 0, 1),
                "pace": round(t.get("PACE", 0) if "PACE" in t else 0, 1),
                "off_rtg": round(t.get("OFF_RATING", 0) if "OFF_RATING" in t else 0, 1),
                "def_rtg": round(t.get("DEF_RATING", 0) if "DEF_RATING" in t else 0, 1),
                "w_pct": round(t.get("W_PCT", 0), 3),
                "last10_wins": t.get("W", 0),
            }

        print(f"  → {len(games)} games found, {len(team_stats)} teams with stats")
    except Exception as e:
        print(f"  ⚠ nba_api error: {e}")

    return games, team_stats


def fetch_injury_report():
    """Fetch current NBA injury report via nba_api."""
    print("[2/4] Fetching injury report...")
    injuries = []
    try:
        from nba_api.stats.endpoints import commonplayerinfo, leaguedashplayerstats
        # Use the injury report endpoint
        url = "https://stats.nba.com/stats/commonteamroster"
        inj_url = "https://www.nba.com/players/injuries"

        # Scrape the public injury page lightly
        resp = requests.get(
            "https://stats.nba.com/injuries/",
            headers={**HEADERS, "Referer": "https://www.nba.com/"},
            timeout=10
        )
        # Parse JSON embedded in the page if available
        match = re.search(r'"data"\s*:\s*(\[.*?\])', resp.text, re.DOTALL)
        if match:
            raw = json.loads(match.group(1))
            for entry in raw[:50]:  # cap at 50
                injuries.append({
                    "player": entry.get("playerName") or entry.get("FirstName", "") + " " + entry.get("LastName", ""),
                    "team": entry.get("teamTricode") or entry.get("teamName", ""),
                    "status": entry.get("injuryStatus") or entry.get("status", ""),
                    "description": entry.get("injuryDescription") or entry.get("description", ""),
                })
        else:
            # Fallback: use nba_api commonallplayers
            from nba_api.stats.endpoints import commonallplayers
            time.sleep(0.6)
            # Just note that we couldn't get live injury data
            injuries = [{"note": "Live injury data unavailable — check nba.com/players/injuries manually"}]

        print(f"  → {len(injuries)} injury entries")
    except Exception as e:
        print(f"  ⚠ Injury fetch error: {e}")
        injuries = [{"note": f"Injury data unavailable: {e}"}]

    return injuries


# ── 2. ESPN RSS ───────────────────────────────────────────────────────────────
ESPN_FEEDS = [
    ("espn_nba_news",    "https://www.espn.com/espn/rss/nba/news"),
    ("espn_nba_insider", "https://www.espn.com/espn/rss/nba/insider"),
]

def fetch_espn_news():
    """Pull latest ESPN NBA news via RSS."""
    print("[3/4] Fetching ESPN NBA news...")
    articles = []
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=20)

    for feed_name, url in ESPN_FEEDS:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:15]:
                # Parse published date
                pub = None
                if hasattr(entry, "published_parsed") and entry.published_parsed:
                    pub = datetime.datetime(*entry.published_parsed[:6])

                if pub and pub < cutoff:
                    continue  # skip old articles

                articles.append({
                    "source": feed_name,
                    "title": entry.get("title", ""),
                    "summary": re.sub(r"<[^>]+>", "", entry.get("summary", ""))[:300],
                    "link": entry.get("link", ""),
                    "published": pub.isoformat() if pub else "",
                })
        except Exception as e:
            print(f"  ⚠ ESPN RSS error ({feed_name}): {e}")

    print(f"  → {len(articles)} ESPN articles")
    return articles


# ── 3. Reddit r/nba preview threads ──────────────────────────────────────────
REDDIT_HEADERS = {
    "User-Agent": "EdgeProtocol/1.0 context-bot (by /u/edgeprotocol_bot)"
}

def fetch_reddit_previews(games: list):
    """
    Search Reddit r/nba for today's game preview/discussion threads.
    Uses Reddit's public JSON API (no auth required for read-only).
    """
    print("[4/4] Fetching Reddit r/nba previews...")
    reddit_data = []

    search_base = "https://www.reddit.com/r/nba/search.json"

    seen_ids = set()
    for game in games[:6]:  # cap at 6 games to avoid rate limits
        home = game.get("home_team", "")
        away = game.get("away_team", "")
        if not home or not away:
            continue

        query = f"{away} {home} game thread"
        try:
            time.sleep(1.2)  # Reddit rate limit
            resp = requests.get(
                search_base,
                params={
                    "q": query,
                    "sort": "new",
                    "t": "day",
                    "restrict_sr": "1",
                    "limit": 3,
                },
                headers=REDDIT_HEADERS,
                timeout=10
            )
            data = resp.json()
            posts = data.get("data", {}).get("children", [])
            for post in posts:
                p = post.get("data", {})
                pid = p.get("id")
                if pid in seen_ids:
                    continue
                seen_ids.add(pid)

                # Filter to relevant posts
                title = p.get("title", "").lower()
                if not any(kw in title for kw in ["game thread", "preview", "discuss", "post game"]):
                    continue

                reddit_data.append({
                    "game": f"{away} @ {home}",
                    "title": p.get("title", ""),
                    "score": p.get("score", 0),
                    "num_comments": p.get("num_comments", 0),
                    "top_comments": _fetch_top_comments(p.get("permalink", "")),
                    "url": f"https://reddit.com{p.get('permalink', '')}",
                })
        except Exception as e:
            print(f"  ⚠ Reddit error for {away}@{home}: {e}")

    print(f"  → {len(reddit_data)} Reddit threads")
    return reddit_data


def _fetch_top_comments(permalink: str) -> list:
    """Fetch top 3 comments from a Reddit thread."""
    if not permalink:
        return []
    try:
        time.sleep(1.0)
        url = f"https://www.reddit.com{permalink}.json?limit=5&sort=top"
        resp = requests.get(url, headers=REDDIT_HEADERS, timeout=8)
        data = resp.json()
        comments = data[1]["data"]["children"] if len(data) > 1 else []
        top = []
        for c in comments[:3]:
            body = c.get("data", {}).get("body", "")
            if body and len(body) > 20 and body != "[deleted]":
                top.append(body[:400])
        return top
    except Exception:
        return []


# ── 4. Action Network — Betting Consensus ─────────────────────────────────────
def fetch_betting_consensus(games: list):
    """
    Pull public betting consensus from Action Network's open endpoints.
    Shows % of bets and % of money on each side — key signal for sharp action.
    """
    print("[4b] Fetching betting consensus (Action Network)...")
    consensus = []

    try:
        # Action Network public API — game list
        date_param = TODAY.strftime("%Y%m%d")
        url = f"https://api.actionnetwork.com/web/v1/games?sport=nba&date={date_param}"
        resp = requests.get(url, headers=HEADERS, timeout=10)
        data = resp.json()

        an_games = data.get("games", [])
        for g in an_games:
            home = g.get("home_team", {})
            away = g.get("away_team", {})
            odds_data = g.get("odds", [])

            consensus_entry = {
                "game": f"{away.get('abbr', '')} @ {home.get('abbr', '')}",
                "home": home.get("full_name", ""),
                "away": away.get("full_name", ""),
                "spread": None,
                "total": None,
                "moneyline": None,
                "bet_pct": {},
                "money_pct": {},
            }

            # Pull consensus from a primary book (DraftKings or FanDuel)
            for odd in odds_data:
                book = odd.get("book_id")
                if book not in [15, 16, 283]:  # DK, FD, BetMGM
                    continue

                consensus_entry["spread"] = {
                    "home": odd.get("home_spread"),
                    "away": odd.get("away_spread"),
                    "home_odds": odd.get("home_spread_odds"),
                    "away_odds": odd.get("away_spread_odds"),
                }
                consensus_entry["total"] = {
                    "line": odd.get("total"),
                    "over_odds": odd.get("over_odds"),
                    "under_odds": odd.get("under_odds"),
                }
                consensus_entry["moneyline"] = {
                    "home": odd.get("home_ml"),
                    "away": odd.get("away_ml"),
                }

                # Bet % and money %
                consensus_entry["bet_pct"] = {
                    "home_ml": odd.get("home_ml_bet_pct"),
                    "away_ml": odd.get("away_ml_bet_pct"),
                    "home_spread": odd.get("home_spread_bet_pct"),
                    "over": odd.get("over_bet_pct"),
                }
                consensus_entry["money_pct"] = {
                    "home_ml": odd.get("home_ml_money_pct"),
                    "away_ml": odd.get("away_ml_money_pct"),
                    "over": odd.get("over_money_pct"),
                }
                break  # use first available book

            consensus.append(consensus_entry)

        print(f"  → {len(consensus)} games with consensus data")
    except Exception as e:
        print(f"  ⚠ Action Network error: {e}")

    return consensus


# ── Assemble & Save ───────────────────────────────────────────────────────────
def build_context():
    print(f"\n🏀 Edge Protocol — NBA Context Ingestion")
    print(f"   Date: {DATE_STR}")
    print(f"   Output: {OUTPUT_FILE}\n")

    games, team_stats = fetch_nba_schedule()
    injuries = fetch_injury_report()
    espn_news = fetch_espn_news()
    reddit_previews = fetch_reddit_previews(games)
    consensus = fetch_betting_consensus(games)

    # Build summary note for Jarvis
    injured_stars = [
        i for i in injuries
        if isinstance(i, dict) and i.get("status") in ["Out", "Doubtful", "Questionable"]
    ]

    context = {
        "date": DATE_STR,
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        "games_today": games,
        "team_stats_last10": team_stats,
        "injuries": injuries,
        "injured_key_players": injured_stars,
        "espn_news": espn_news,
        "reddit_previews": reddit_previews,
        "betting_consensus": consensus,
        "jarvis_instructions": (
            "Use this context file before pricing any bets today. "
            "Key priorities: (1) Check injured_key_players — if a star is Out/Doubtful, "
            "adjust their prop lines significantly. "
            "(2) Compare our pricing vs betting_consensus moneyline/spread — "
            "if >15pp divergence, flag for calibration. "
            "(3) Use reddit_previews top_comments for qualitative insight on team form. "
            "(4) ESPN news may contain last-minute lineup changes — prioritize recency."
        ),
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(context, f, indent=2, default=str)

    # Print summary
    print(f"\n✅ Context file saved: {OUTPUT_FILE}")
    print(f"   Games today:      {len(games)}")
    print(f"   Team stats:       {len(team_stats)} teams")
    print(f"   Injuries logged:  {len(injuries)}")
    print(f"   Stars out/doubtful: {len(injured_stars)}")
    print(f"   ESPN articles:    {len(espn_news)}")
    print(f"   Reddit threads:   {len(reddit_previews)}")
    print(f"   Consensus lines:  {len(consensus)} games")
    print()

    return context


if __name__ == "__main__":
    build_context()
