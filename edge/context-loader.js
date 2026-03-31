/**
 * Edge Protocol — NBA Context Loader
 *
 * Reads the nightly context file at:
 *   context/nba-context-{date}.json
 *
 * Provides helpers for:
 *   - Injury lookups (OUT / Doubtful players)
 *   - ESPN news injury keyword scan
 *   - Market divergence comparison
 *   - Reddit sentiment summary
 *   - Team form adjustments (last-10 vs season avg)
 *
 * Expected context file schema:
 * {
 *   "generated_at": "2026-03-11T14:00:00Z",
 *   "date": "2026-03-11",
 *   "injured_key_players": [
 *     { "player": "Kawhi Leonard", "team": "LAC", "status": "Out", "reason": "knee" }
 *   ],
 *   "espn_news": [
 *     { "title": "...", "summary": "...", "game": "LAC @ PHX" }
 *   ],
 *   "betting_consensus": [
 *     { "home_team": "PHX", "away_team": "LAC",
 *       "consensus_home_prob": 0.55, "consensus_away_prob": 0.45 }
 *   ],
 *   "reddit_previews": [
 *     { "game": "LAC @ PHX", "top_comments": ["...", "..."], "sentiment": "negative" }
 *   ],
 *   "team_stats_last10": [
 *     { "team": "LAC", "off_rtg": 108.5, "def_rtg": 112.0,
 *       "off_rtg_season": 110.2, "def_rtg_season": 113.5, "wins": 4, "losses": 6 }
 *   ]
 * }
 */

const fs   = require('fs');
const path = require('path');

const CONTEXT_DIR = path.join(__dirname, 'context');

// Keywords that signal a player is unavailable
const OUT_KEYWORDS = ['out', 'doubtful', 'will not play', 'dnp', 'scratch', 'ruled out', 'won\'t play'];

// ── Load season-out list (players done for the year) ─────────────────────────
function loadSeasonOut() {
  const file = path.join(__dirname, 'data', 'season-out.json');
  if (!fs.existsSync(file)) return new Map();
  try {
    const { players } = JSON.parse(fs.readFileSync(file, 'utf8'));
    const map = new Map();
    for (const p of players || []) {
      map.set(normName(p.player), {
        player: p.player,
        team: (p.team || '').toUpperCase(),
        status: 'Out (season)',
        reason: p.reason || 'Season-ending',
        source: 'season-out.json',
      });
    }
    console.log(`[Context] Season-out list: ${map.size} player(s) — ${[...map.values()].map(p=>p.player).join(', ')}`);
    return map;
  } catch (e) {
    console.error('[Context] Failed to parse season-out.json:', e.message);
    return new Map();
  }
}

// ── Load context file ─────────────────────────────────────────────────────────
function loadContext(date) {
  const file = path.join(CONTEXT_DIR, `nba-context-${date}.json`);
  if (!fs.existsSync(file)) {
    console.log(`[Context] No context file found for ${date} — proceeding without adjustments`);
    return null;
  }
  try {
    const ctx = JSON.parse(fs.readFileSync(file, 'utf8'));
    const age = ctx.generated_at ? Math.round((Date.now() - new Date(ctx.generated_at).getTime()) / 60000) : null;
    console.log(`[Context] Loaded context file (${date}) — generated ${age !== null ? age + ' min ago' : 'unknown time ago'})`);
    return ctx;
  } catch (e) {
    console.error(`[Context] Failed to parse context file: ${e.message}`);
    return null;
  }
}

// ── Build OUT player set ──────────────────────────────────────────────────────
/**
 * Returns a Map of player_name_lower → { status, team, reason, source }
 * Handles both array and dict formats for team_stats_last10.
 * Sources: injured_key_players, injuries[].players, espn_news keyword scan.
 */
function buildOutMap(ctx) {
  const outMap = new Map();
  if (!ctx) return outMap;

  // 1. Direct injured_key_players list
  for (const entry of ctx.injured_key_players || []) {
    const status = (entry.status || '').toLowerCase();
    if (OUT_KEYWORDS.some(kw => status.includes(kw))) {
      const key = normName(entry.player);
      outMap.set(key, {
        player: entry.player,
        team: (entry.team || '').toUpperCase(),
        status: entry.status,
        reason: entry.reason || '',
        source: 'injury_report',
      });
    }
  }

  // 2. injuries[] array (may contain per-player entries)
  for (const entry of ctx.injuries || []) {
    // Skip meta notes
    if (entry.note || !entry.player) continue;
    const status = (entry.status || '').toLowerCase();
    if (OUT_KEYWORDS.some(kw => status.includes(kw))) {
      const key = normName(entry.player);
      if (!outMap.has(key)) {
        outMap.set(key, {
          player: entry.player,
          team: (entry.team || '').toUpperCase(),
          status: entry.status || 'Out',
          reason: entry.reason || '',
          source: 'injuries_list',
        });
      }
    }
  }

  // 3. ESPN news keyword scan — extract player names from headlines
  const OUT_PATTERNS = [
    /([A-Z][a-záéíóú]+ [A-Z][a-záéíóú]+(?:-[A-Z][a-z]+)?) (?:will not play|is out|ruled out|won't play|scratched|day-to-day|doubtful)/i,
    /([A-Z][a-záéíóú]+ [A-Z][a-záéíóú]+) \((?:out|doubtful|dnp|day-to-day)/i,
  ];
  for (const article of ctx.espn_news || []) {
    const text = `${article.title || ''} ${article.summary || ''}`;
    const textLow = text.toLowerCase();
    if (!OUT_KEYWORDS.some(kw => textLow.includes(kw))) continue;
    for (const pat of OUT_PATTERNS) {
      const match = text.match(pat);
      if (match) {
        const name = match[1];
        const key  = normName(name);
        if (!outMap.has(key)) {
          outMap.set(key, {
            player: name, team: '',
            status: 'Out (ESPN)',
            reason: (article.title || '').slice(0, 80),
            source: 'espn_news',
          });
        }
        break;
      }
    }
  }

  return outMap;
}

// ── Team form adjustments ─────────────────────────────────────────────────────
/**
 * Returns a Map of team_abbr → { off_adj, def_adj, note }
 * Handles both array format and dict format for team_stats_last10.
 */
function buildFormAdjustments(ctx) {
  const adjMap = new Map();
  if (!ctx) return adjMap;

  // Normalise: handle both array and object/dict format
  let entries = ctx.team_stats_last10 || [];
  if (!Array.isArray(entries)) {
    // dict format: { "LAL": { off_rtg: ... }, ... }
    entries = Object.entries(entries).map(([team, stats]) => ({ team, ...stats }));
  }

  for (const t of entries) {
    const team = (t.team || '').toUpperCase();
    const offDelta = (t.off_rtg || 0) - (t.off_rtg_season || 0);
    const defDelta = (t.def_rtg || 0) - (t.def_rtg_season || 0);

    // Only adjust if delta is meaningful (>3 points either way)
    const offAdj = Math.abs(offDelta) > 3 ? 1 + (offDelta / 100) : 1.0;
    const defAdj = Math.abs(defDelta) > 3 ? 1 + (defDelta / 100) : 1.0;

    const notes = [];
    if (offDelta < -3) notes.push(`Off ↓${Math.abs(offDelta).toFixed(1)} L10`);
    if (offDelta >  3) notes.push(`Off ↑${offDelta.toFixed(1)} L10`);
    if (defDelta < -3) notes.push(`Def ↑${Math.abs(defDelta).toFixed(1)} L10`); // lower def_rtg = better defense
    if (defDelta >  3) notes.push(`Def ↓${defDelta.toFixed(1)} L10`);

    adjMap.set(team, { offAdj, defAdj, offDelta, defDelta, note: notes.join(', ') });
  }
  return adjMap;
}

// ── Reddit sentiment ──────────────────────────────────────────────────────────
/**
 * Returns a Map of "AWAY_HOME" game key → { sentiment, notes, confidenceAdj }
 * confidenceAdj: points to add/subtract from confidence score (-10 to +5)
 */
function buildSentimentMap(ctx) {
  const sentMap = new Map();
  if (!ctx) return sentMap;

  for (const thread of ctx.reddit_previews || []) {
    const game = (thread.game || '').toUpperCase().replace(/\s/g, '');
    const sentiment = (thread.sentiment || 'neutral').toLowerCase();
    const comments  = (thread.top_comments || []).join(' ').toLowerCase();

    // Check comments for injury/lineup keywords
    const hasInjuryMention = OUT_KEYWORDS.some(kw => comments.includes(kw));
    const confAdj = sentiment === 'negative' ? -8
                  : sentiment === 'positive' ? 3
                  : hasInjuryMention         ? -5
                  : 0;

    sentMap.set(game, {
      sentiment,
      has_injury_mention: hasInjuryMention,
      confidence_adj: confAdj,
      note: thread.top_comments?.[0]?.slice(0, 80) || '',
    });
  }
  return sentMap;
}

// ── Market consensus comparison ───────────────────────────────────────────────
/**
 * Returns a Map of "AWAY_HOME" game key → { consensus_home_prob, consensus_away_prob }
 */
function buildConsensusMap(ctx) {
  const consMap = new Map();
  if (!ctx) return consMap;

  for (const line of ctx.betting_consensus || []) {
    const home = (line.home_team || '').toUpperCase();
    const away = (line.away_team || '').toUpperCase();
    const key  = `${away}_${home}`;
    consMap.set(key, {
      home_prob: line.consensus_home_prob || null,
      away_prob: line.consensus_away_prob || null,
      home_team: home, away_team: away,
    });
  }
  return consMap;
}

// ── Check game key variants ───────────────────────────────────────────────────
function getConsensus(consMap, homeAbbr, awayAbbr) {
  return consMap.get(`${awayAbbr}_${homeAbbr}`)
      || consMap.get(`${homeAbbr}_${awayAbbr}`)
      || null;
}

function getSentiment(sentMap, homeAbbr, awayAbbr) {
  return sentMap.get(`${awayAbbr}@${homeAbbr}`.replace(/\s/g,''))
      || sentMap.get(`${awayAbbr}_${homeAbbr}`)
      || sentMap.get(`${homeAbbr}_${awayAbbr}`)
      || null;
}

// ── Confidence score adjustment ───────────────────────────────────────────────
/**
 * Reduce confidence by how much a key player's absence matters.
 * Star player out (top scorer/PPG leader) = -20 points.
 * Role player out = -5 points.
 */
function injuryConfidenceAdj(playerName, teamPlayers, outMap) {
  const key = normName(playerName);
  if (!outMap.has(key)) return 0;

  // Is this the team's top scorer?
  const sortedByPts = [...teamPlayers].sort((a,b) => b.pts_avg - a.pts_avg);
  const rank = sortedByPts.findIndex(p => normName(p.name) === key);
  return rank === 0 ? -20 : rank === 1 ? -12 : -5;
}

// ── Name normaliser ───────────────────────────────────────────────────────────
function normName(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z ]/g, '').trim();
}

// ── Analyst consensus ────────────────────────────────────────────────────────
/**
 * Returns a Map of "AWAY@HOME" game key → analyst_consensus object.
 * Reads ctx.analyst_takes written by analyst-ingestion.js.
 */
function buildAnalystMap(ctx) {
  const analystMap = new Map();
  if (!ctx || !ctx.analyst_takes || !Array.isArray(ctx.analyst_takes) || ctx.analyst_takes.length === 0) {
    return analystMap;
  }

  for (const take of ctx.analyst_takes) {
    const away = (take.away_team || '').toUpperCase();
    const home = (take.home_team || '').toUpperCase();
    if (!away || !home) continue;

    const key = `${away}@${home}`;

    // Accumulate takes per game
    if (!analystMap.has(key)) {
      analystMap.set(key, {
        direction: 'split',
        strength: 0.0,
        source_count: 0,
        sharp_alignment: false,
        notable_takes: [],
        prop_mentions: [],
        risk_flags: [],
      });
    }

    const consensus = analystMap.get(key);
    consensus.source_count += 1;

    // Merge notable takes
    if (take.source && take.take) {
      consensus.notable_takes.push({
        source: take.source,
        take: take.take,
        confidence: take.confidence || 'medium',
      });
    }

    // Merge prop mentions
    if (Array.isArray(take.prop_mentions)) {
      for (const pm of take.prop_mentions) {
        consensus.prop_mentions.push({
          player: pm.player || '',
          direction: pm.direction || '',
          stat: pm.stat || '',
          reason: pm.reason || '',
        });
      }
    }

    // Merge risk flags
    if (Array.isArray(take.risk_flags)) {
      for (const flag of take.risk_flags) {
        if (!consensus.risk_flags.includes(flag)) {
          consensus.risk_flags.push(flag);
        }
      }
    }

    // Update direction and strength from aggregate
    if (take.direction === 'home' || take.direction === 'away') {
      consensus.direction = take.direction;
    }
    if (typeof take.strength === 'number') {
      consensus.strength = Math.max(consensus.strength, take.strength);
    }
    if (take.sharp_alignment !== undefined) {
      consensus.sharp_alignment = take.sharp_alignment;
    }
  }

  return analystMap;
}

/**
 * Look up analyst consensus for a game, trying both key orderings.
 * @param {Map} analystMap
 * @param {string} homeAbbr
 * @param {string} awayAbbr
 * @returns {object|null}
 */
function getAnalystConsensus(analystMap, homeAbbr, awayAbbr) {
  return analystMap.get(`${awayAbbr}@${homeAbbr}`)
      || analystMap.get(`${homeAbbr}@${awayAbbr}`)
      || null;
}

// ── Build context summary for Telegram ───────────────────────────────────────
function buildContextSummary(ctx, outMap, divergences) {
  if (!ctx && outMap.size === 0 && divergences.length === 0) return null;

  const lines = [];

  const genAt = ctx?.generated_at
    ? new Date(ctx.generated_at).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
    : 'unknown';

  const injuryLines = [...outMap.values()].map(i => `  ⚠️ ${i.player} (${i.team}) — ${i.status}`);
  if (injuryLines.length > 0) lines.push(...injuryLines);

  for (const d of divergences) {
    lines.push(`  📊 ${d.game}: our model ${(d.our_prob*100).toFixed(0)}% vs market ${(d.market_prob*100).toFixed(0)}% — high divergence flagged`);
  }

  const espnCount   = ctx?.espn_news?.length || 0;
  const redditCount = ctx?.reddit_previews?.length || 0;
  const consCount   = ctx?.betting_consensus?.length || 0;

  lines.push(`  ✅ ${espnCount} ESPN articles, ${redditCount} Reddit threads, ${consCount} consensus lines ingested`);

  return `📋 *Context Used (${ctx?.date || 'today'} — ${genAt})*\n${lines.join('\n')}`;
}

module.exports = {
  loadContext,
  loadSeasonOut,
  buildOutMap,
  buildFormAdjustments,
  buildSentimentMap,
  buildConsensusMap,
  getConsensus,
  getSentiment,
  buildAnalystMap,
  getAnalystConsensus,
  injuryConfidenceAdj,
  buildContextSummary,
  normName,
};
