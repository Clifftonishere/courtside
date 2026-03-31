/**
 * Edge Protocol — Nightly Batch Resolution v2
 *
 * Runs at 6:30 AM UTC (2:30 PM SGT). Loads yesterday's bet file,
 * fetches NBA CDN box scores, resolves all bets, outputs full P&L report.
 *
 * Usage: node batch-resolve.js [YYYY-MM-DD]
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const { resolvePrediction, loadAll } = require('./logger');
const { matchBoxScore, normalize: normalizeName } = require('./player-names');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

function sendTelegram(text) {
  if (!BOT_TOKEN || !CHAT_ID) return Promise.resolve();
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' });
    const opts = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(opts, res => { res.resume(); resolve(); });
    req.on('error', () => resolve());
    req.write(body); req.end();
  });
}

const DATA_DIR = path.join(__dirname, 'data');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, data: null }); } });
    }).on('error', reject);
  });
}

function resolveDate(arg) {
  if (arg) return arg;
  // Pricing runs at 11 PM UTC for that same UTC date.
  // Resolve runs at 6:30 AM UTC (next day).
  // Bet file is named for the pricing date (yesterday in UTC).
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = d.toISOString().split('T')[0];
  // But check: if today's bet file exists (e.g. manual re-run), use today
  const today = new Date().toISOString().split('T')[0];
  const todayFile = path.join(DATA_DIR, `bets-${today}.json`);
  const yestFile  = path.join(DATA_DIR, `bets-${yesterday}.json`);
  if (!fs.existsSync(yestFile) && fs.existsSync(todayFile)) return today;
  return yesterday;
}

// ── Get game IDs for a date: static file + live NBA CDN schedule fallback ─────
async function getGameIds(date) {
  // 1. Try static game_results.json first
  const resultsFile = path.join(DATA_DIR, 'game_results.json');
  if (fs.existsSync(resultsFile)) {
    const results = JSON.parse(fs.readFileSync(resultsFile));
    const found = results.filter(g => g.date === date);
    if (found.length > 0) {
      console.log(`  Using static game_results.json: ${found.length} games`);
      return found;
    }
  }

  // 2. Fallback: fetch live NBA CDN scoreboard for the date
  // NBA CDN scoreboard endpoint uses YYYYMMDD format
  const dateCompact = date.replace(/-/g, '');
  console.log(`  Static file missing games for ${date}, trying NBA CDN scoreboard...`);
  try {
    await sleep(300);
    const { status, data } = await fetchJSON(
      `https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json`
    );
    if (status === 200 && data?.leagueSchedule?.gameDates) {
      const gameDates = data.leagueSchedule.gameDates;
      // Find the matching date
      const dayEntry = gameDates.find(d => {
        const gameDate = (d.gameDate || '').split('T')[0].replace(/-/g,'').slice(0,8);
        return gameDate === dateCompact || d.gameDate?.startsWith(date);
      });
      if (dayEntry?.games?.length > 0) {
        const games = dayEntry.games.map(g => ({
          game_id: g.gameId,
          date,
          home_team: g.homeTeam?.teamTricode,
          away_team: g.awayTeam?.teamTricode,
        }));
        console.log(`  NBA CDN schedule: ${games.length} games for ${date}`);
        return games;
      }
    }
  } catch (e) {
    console.error('  NBA CDN schedule fetch error:', e.message);
  }

  // 3. Final fallback: derive game IDs from bets file game labels
  // Game IDs for 2025-26 season are 0022500XXX — try scanning the bet file
  const betFile = path.join(DATA_DIR, `bets-${date}.json`);
  if (fs.existsSync(betFile)) {
    try {
      const betData = JSON.parse(fs.readFileSync(betFile));
      const gameLabels = [...new Set((betData.predictions || []).map(p => p.game).filter(Boolean))];
      console.log(`  Deriving game IDs from bet file: ${gameLabels.length} unique games`);

      // Try fetching the live scoreboard for today
      await sleep(300);
      const { status, data } = await fetchJSON(
        `https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json`
      );
      if (status === 200 && data?.scoreboard?.games?.length > 0) {
        const sbGames = data.scoreboard.games;
        const yesterday = new Date(date + 'T23:00:00Z');
        // Accept games from this date or the previous calendar date (US ET vs UTC)
        return sbGames
          .filter(g => g.gameStatus >= 3) // 3 = final
          .map(g => ({
            game_id: g.gameId,
            date,
            home_team: g.homeTeam?.teamTricode,
            away_team: g.awayTeam?.teamTricode,
          }));
      }
    } catch (e) {
      console.error('  Scoreboard fallback error:', e.message);
    }
  }

  console.log(`  No game IDs found for ${date}`);
  return [];
}

// ── Fetch box scores for a given date ─────────────────────────────────────────
async function fetchBoxScores(date) {
  const games = await getGameIds(date);
  if (games.length === 0) return {};

  const boxes = {};
  for (const g of games) {
    try {
      await sleep(250);
      const { status, data } = await fetchJSON(`https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${g.game_id}.json`);
      if (status !== 200 || !data?.game) continue;

      const game = data.game;
      const players = [];
      const periods = {};

      const addPlayers = (teamData, abbr) => {
        for (const p of teamData.players || []) {
          const s = p.statistics;
          if (!s) continue;
          players.push({
            name: `${p.firstName} ${p.familyName}`.trim(),
            pts: s.points || 0,
            reb: s.reboundsTotal || s.rebounds || 0,
            ast: s.assists || 0,
            fg3: s.threePointersMade || s.fg3_made || 0,
            stl: s.steals || 0,
            blk: s.blocks || 0,
            team: abbr,
          });
        }
      };

      const homeAbbr = game.homeTeam?.teamTricode;
      const awayAbbr = game.awayTeam?.teamTricode;
      addPlayers(game.homeTeam, homeAbbr);
      addPlayers(game.awayTeam, awayAbbr);

      // Quarter scores
      const homeQ = (game.homeTeam?.periods || []).map(p => p.score || 0);
      const awayQ = (game.awayTeam?.periods || []).map(p => p.score || 0);
      for (let q = 1; q <= 4; q++) {
        const homeSum = homeQ.slice(0,q).reduce((a,b)=>a+b,0);
        const awaySum = awayQ.slice(0,q).reduce((a,b)=>a+b,0);
        periods[q] = { home: homeSum, away: awaySum, homeAbbr, awayAbbr };
      }

      const homeScore = game.homeTeam?.score || 0;
      const awayScore = game.awayTeam?.score || 0;

      boxes[g.game_id] = {
        game_id: g.game_id, home_team: homeAbbr, away_team: awayAbbr,
        home_score: homeScore, away_score: awayScore,
        total_score: homeScore + awayScore,
        winner: homeScore > awayScore ? homeAbbr : awayAbbr,
        home_margin: homeScore - awayScore,
        periods, players,
      };
      console.log(`  ✓ Box score: ${awayAbbr} @ ${homeAbbr} — ${awayScore}-${homeScore}`);
    } catch (e) {
      console.error(`  ✗ Box score ${g.game_id}: ${e.message}`);
    }
  }
  return boxes;
}

// ── Resolve a single bet against box score data ───────────────────────────────
function resolvebet(bet, logged, boxes) {
  const { stat, condition, threshold } = logged.request;
  const player = logged.request.player;

  // Novelty: always manual
  if (stat?.startsWith('novelty_') || bet.type === 'novelty') {
    return { resolved: false, reason: 'manual_review' };
  }

  // Find relevant box score (by team abbreviations in game label)
  const [awayAbbr, homeAbbr] = (bet.game || '').split(' @ ');

  const box = Object.values(boxes).find(b =>
    (b.home_team === homeAbbr && b.away_team === awayAbbr) ||
    (b.home_team === awayAbbr && b.away_team === homeAbbr) ||
    (homeAbbr && b.home_team === homeAbbr) ||
    (awayAbbr && b.away_team === awayAbbr)
  );

  if (!box) return { resolved: false, reason: 'no_box_score' };

  if (stat === 'game_win' || bet.type === 'winner') {
    const teamNorm = normalizeName(player || '');
    const won = box.winner && (
      (box.winner === toAbbr(player)) ||
      (normalizeName(box.home_team || '').includes(teamNorm) && box.home_score > box.away_score) ||
      (normalizeName(box.away_team || '').includes(teamNorm) && box.away_score > box.home_score)
    );
    return { resolved: true, outcome: !!won, actual_value: box.winner };
  }

  if (stat === 'spread' || bet.type === 'spread') {
    const abbr = toAbbr(player);
    const isHome = abbr === box.home_team;
    const margin = isHome ? box.home_margin : -box.home_margin;
    const covered = margin > (threshold || 0);
    return { resolved: true, outcome: covered, actual_value: margin };
  }

  if (stat === 'total_points' || bet.type === 'total') {
    const over = box.total_score > (threshold || 0);
    return { resolved: true, outcome: over, actual_value: box.total_score };
  }

  if (stat === 'quarter_leader' || bet.type === 'quarter') {
    const q = threshold || 1;
    const period = box.periods?.[q];
    if (!period || period.home === 0 && period.away === 0) return { resolved: false, reason: 'no_period_data' };
    const teamAbbr = (player||'').toUpperCase().slice(0,3);
    const isHome = teamAbbr === box.home_team;
    const teamScore = isHome ? period.home : period.away;
    const oppScore  = isHome ? period.away : period.home;
    return { resolved: true, outcome: teamScore > oppScore, actual_value: `${period.home}-${period.away}` };
  }

  if (stat === 'double_double' || bet.type === 'double_double') {
    const p = matchBoxScore(player, box.players);
    if (!p) return { resolved: false, reason: 'player_not_found' };
    const dd = p.pts >= 10 && p.reb >= 10;
    return { resolved: true, outcome: dd, actual_value: `${p.pts}pts/${p.reb}reb` };
  }

  // Player stat prop
  const statMap = { points:'pts', rebounds:'reb', assists:'ast', fg3_made:'fg3', steals:'stl', blocks:'blk' };
  const field = statMap[stat];
  if (!field) return { resolved: false, reason: `unknown_stat:${stat}` };

  const playerRow = matchBoxScore(player, box.players);

  if (!playerRow) return { resolved: false, reason: 'player_not_found' };

  const actual = playerRow[field] || 0;
  const hit = condition === 'over' ? actual > threshold : actual < threshold;
  return { resolved: true, outcome: hit, actual_value: actual };
}

function toAbbr(name) {
  const map = {
    'atlanta hawks':'ATL','boston celtics':'BOS','brooklyn nets':'BKN','charlotte hornets':'CHA',
    'chicago bulls':'CHI','cleveland cavaliers':'CLE','dallas mavericks':'DAL','denver nuggets':'DEN',
    'detroit pistons':'DET','golden state warriors':'GSW','houston rockets':'HOU','indiana pacers':'IND',
    'los angeles clippers':'LAC','la clippers':'LAC','los angeles lakers':'LAL','la lakers':'LAL',
    'memphis grizzlies':'MEM','miami heat':'MIA','milwaukee bucks':'MIL','minnesota timberwolves':'MIN',
    'new orleans pelicans':'NOP','new york knicks':'NYK','oklahoma city thunder':'OKC','orlando magic':'ORL',
    'philadelphia 76ers':'PHI','phoenix suns':'PHX','portland trail blazers':'POR','sacramento kings':'SAC',
    'san antonio spurs':'SAS','toronto raptors':'TOR','utah jazz':'UTA','washington wizards':'WAS',
  };
  return map[(name||'').toLowerCase()] || (name||'').slice(0,3).toUpperCase();
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const date = resolveDate(process.argv[2]);
  console.log(`\n📊 Edge Protocol — Batch Resolve v2 (${date})\n`);

  const betFile = path.join(DATA_DIR, `bets-${date}.json`);
  if (!fs.existsSync(betFile)) {
    const msg = `No bet file for ${date} — nothing to resolve.`;
    console.log(msg);
    process.stdout.write(msg + '\n');
    return;
  }

  const betData = JSON.parse(fs.readFileSync(betFile));
  const predictions = betData.predictions || [];
  console.log(`${predictions.length} bets from ${date} | Volume: $${(betData.total_volume||0).toLocaleString()}\n`);

  // Fetch box scores
  console.log('Fetching box scores...');
  const boxes = await fetchBoxScores(date);
  const gamesResolved = Object.keys(boxes).length;

  if (gamesResolved === 0) {
    const msg = `⚠️ No completed box scores found for ${date}. Games may not be final yet.`;
    console.log(msg);
    process.stdout.write(msg + '\n');
    return;
  }

  // Load logged predictions for resolution
  const allLogged = loadAll();
  const loggedMap = new Map(allLogged.map(p => [p.id, p]));

  // Count and report cancellations
  const canceledBets = predictions.filter(b => b.canceled);
  const canceledVolume = canceledBets.reduce((a, b) => a + (b.refund_amount || b.bet_amount || 0), 0);
  if (canceledBets.length > 0) {
    console.log(`  ↩️  ${canceledBets.length} canceled bets | $${canceledVolume.toLocaleString()} refunded — excluded from P&L`);
  }

  // Resolve each bet (skip canceled)
  const results = [];
  for (const bet of predictions) {
    if (bet.canceled) continue; // refunded — skip
    const logged = loggedMap.get(bet.id);
    if (!logged) continue; // no log entry — skip

    // If already resolved (e.g. from a manual run), include in P&L but don't re-write
    if (logged.outcome !== null) {
      results.push({ ...bet, outcome: logged.outcome, actual_value: logged.actual_value, resolved: true });
      continue;
    }

    const r = resolvebet(bet, logged, boxes);

    if (r.resolved) {
      resolvePrediction(bet.id, r.outcome, r.actual_value);
      results.push({ ...bet, outcome: r.outcome, actual_value: r.actual_value, resolved: true });
    } else {
      results.push({ ...bet, outcome: null, resolved: false, reason: r.reason });
    }
  }

  // ── Write outcomes back to bet file ─────────────────────────────────────
  try {
    const updatedBetData = JSON.parse(fs.readFileSync(betFile));
    const resultMap = {};
    for (const r of results) resultMap[r.id] = r;
    updatedBetData.predictions = updatedBetData.predictions.map(p => {
      const r = resultMap[p.id];
      if (r && r.outcome !== null && r.outcome !== undefined) {
        return { ...p, outcome: r.outcome ? 'won' : 'lost', actual_value: r.actual_value, resolved_at: new Date().toISOString() };
      }
      return p;
    });
    fs.writeFileSync(betFile, JSON.stringify(updatedBetData, null, 2));
    console.log(`  ✅ Outcomes written back to ${betFile}`);
  } catch(e) { console.error('  ⚠️ Could not write outcomes back:', e.message); }

  // ── P&L Calculation ────────────────────────────────────────────────────────
  const resolved = results.filter(r => r.resolved && r.outcome !== null);
  const wins     = resolved.filter(r => r.outcome === true);
  const losses   = resolved.filter(r => r.outcome === false);

  const totalVolume      = resolved.reduce((a,b) => a+(b.bet_amount||0), 0);
  const winnerStakes     = wins.reduce((a,b) => a+(b.bet_amount||0), 0);
  const loserStakes      = losses.reduce((a,b) => a+(b.bet_amount||0), 0);
  const winnerNetPayout  = wins.reduce((a,b) => a + (b.bet_amount||0) * ((b.decimal_odds||1)-1), 0); // profit paid to winners
  const totalReturnedToWinners = winnerStakes + winnerNetPayout; // stake back + profit
  // Correct P&L: Edge collects all stakes, returns (stake + profit) to winners, keeps loser stakes minus winner profits
  const netProfit     = totalVolume - totalReturnedToWinners; // = loserStakes - winnerNetPayout
  const holdRate      = totalVolume > 0 ? ((netProfit/totalVolume)*100).toFixed(1) : '0.0';
  const vigTheoretical = resolved.reduce((a,b) => a + (b.bet_amount||0)*(b.vig_applied||0.05), 0);
  const totalPaidOut   = totalReturnedToWinners; // for display clarity

  // Category breakdown
  const cats = {};
  for (const r of resolved) {
    const type = r.type || 'prop';
    if (!cats[type]) cats[type] = { w:0, l:0, prob_sum:0, pnl:0 };
    r.outcome ? cats[type].w++ : cats[type].l++;
    cats[type].prob_sum += r.probability || 0;
    cats[type].pnl += r.outcome ? -(r.bet_amount||0)*((r.decimal_odds||1)-1) : (r.bet_amount||0);
  }

  // Best wins / worst losses (by house perspective)
  const byHousePnl = resolved.map(r => ({
    ...r,
    house_pnl: r.outcome ? -(r.bet_amount||0)*((r.decimal_odds||1)-1) : (r.bet_amount||0)
  })).sort((a,b) => b.house_pnl - a.house_pnl);

  const top3Wins   = byHousePnl.filter(r => r.house_pnl > 0).slice(0,3);
  const top3Losses = byHousePnl.filter(r => r.house_pnl < 0).sort((a,b) => a.house_pnl - b.house_pnl).slice(0,3);

  // Model insights: over/under-priced categories
  const insights = [];
  for (const [type, s] of Object.entries(cats)) {
    const total = s.w + s.l;
    if (total < 3) continue;
    const hitRate = s.w / total;
    const avgProb = s.prob_sum / total;
    const diff = hitRate - avgProb;
    if (diff > 0.08) insights.push({ type, hitRate, avgProb, direction:'underpriced', diff });
    else if (diff < -0.08) insights.push({ type, hitRate, avgProb, direction:'overpriced', diff });
  }

  // Market divergence check
  const compBets = resolved.filter(r => r.has_market_comp && r.market_reference);
  const arbCount = compBets.filter(r => {
    const mktOdds = parseFloat((r.market_reference||'').match(/[\d.]+x/)?.[0]);
    return mktOdds && Math.abs(r.decimal_odds - mktOdds) / mktOdds > 0.10;
  }).length;

  // ── Format report (plain language) ───────────────────────────────────────
  const fmt$ = n => `$${Math.round(n).toLocaleString()}`;
  const fmtPct = (w, t) => t > 0 ? `${w}/${t} (${((w/t)*100).toFixed(0)}%)` : 'N/A';

  // P&L plain explanation
  const profitSign = netProfit >= 0 ? '+' : '';
  const holdExplain = netProfit >= 0
    ? `Edge kept ${holdRate}% of all money wagered (target: 3–8%)`
    : `Edge paid out more than it collected — a losing day`;

  // Category labels (plain English)
  const CAT_LABELS = {
    winner:        'Which team wins the game',
    prop:          'Player stat bets (e.g. Jokic scores over 27 pts)',
    total:         'Total points scored in the game (over/under)',
    quarter:       'Which team leads after each quarter',
    double_double: 'Player gets 10+ pts AND 10+ rebounds',
    novelty:       'Fun bets (overtime, ejections, tech fouls)',
  };

  // Build category accuracy lines
  const catLines = [];
  for (const [key, label] of Object.entries(CAT_LABELS)) {
    const c = cats[key];
    if (!c) continue;
    const total = c.w + c.l;
    const pct = ((c.w/total)*100).toFixed(0);
    catLines.push(`• ${label}: ${c.w}/${total} correct (${pct}%)`);
  }

  // Top wins/losses in plain language
  // Wins for Edge = user's bet lost. Losses for Edge = user's bet won.
  const topUserWins   = byHousePnl.filter(r => r.house_pnl < 0).sort((a,b) => a.house_pnl - b.house_pnl).slice(0,3);
  const topEdgeWins   = byHousePnl.filter(r => r.house_pnl > 0).slice(0,3);

  // Model calibration insights in plain language
  const insightLines = [];
  for (const i of insights) {
    const hitPct  = (i.hitRate*100).toFixed(0);
    const predPct = (i.avgProb*100).toFixed(0);
    const label   = CAT_LABELS[i.type] || i.type;
    if (i.direction === 'overpriced') {
      insightLines.push(`• "${label}" bets: users won only ${hitPct}% of the time, but we were pricing them as if they'd win ${predPct}% — we were too generous, Edge lost money on these`);
    } else {
      insightLines.push(`• "${label}" bets: users won ${hitPct}% of the time, but we only priced them as ${predPct}% likely — we were too stingy with the odds, users are getting a better deal than they should`);
    }
  }

  const lines = [
    `📊 *Edge Protocol — Daily Report (${date})*`,
    '━━━━━━━━━━━━━━━━━━━━',
    '',
    '💰 *Money Summary*',
    `Users placed bets totalling ${fmt$(totalVolume)}.`,
    `• Users who lost their bets: Edge kept ${fmt$(loserStakes)}`,
    `• Users who won their bets: Edge paid back their stake + winnings = ${fmt$(totalReturnedToWinners)}`,
    `• *Edge net profit today: ${profitSign}${fmt$(netProfit)}*`,
    `• ${holdExplain}`,
    '',
    '🎯 *How accurate were our odds?*',
    `Out of ${resolved.length} resolved bets, users won ${wins.length} and lost ${losses.length}.`,
    ...catLines,
    '',
  ];

  if (topUserWins.length > 0) {
    lines.push('🏆 *Biggest user wins (Edge paid out the most on these):*');
    for (const r of topUserWins) {
      lines.push(`• "${r.bet}" — user won, Edge paid out ${fmt$(Math.abs(r.house_pnl))} in profit`);
    }
    lines.push('');
  }
  if (topEdgeWins.length > 0) {
    lines.push('💼 *Biggest Edge wins (users lost the most on these):*');
    for (const r of topEdgeWins) {
      lines.push(`• "${r.bet}" — user lost their ${fmt$(r.bet_amount)} stake`);
    }
    lines.push('');
  }

  lines.push('🔍 *What we learned about our pricing model:*');
  if (insightLines.length === 0) {
    lines.push('• Pricing was well-calibrated today — no major adjustments needed');
  } else {
    lines.push(...insightLines);
  }
  if (arbCount > 0) lines.push(`• ${arbCount} of our odds differed significantly from sportsbook lines — worth reviewing`);

  lines.push('');
  lines.push('📈 *Adjustments for tomorrow:*');
  if (insights.length > 0) {
    const over  = insights.filter(i => i.direction === 'overpriced');
    const under = insights.filter(i => i.direction === 'underpriced');
    if (over.length > 0) {
      const i = over[0]; const label = CAT_LABELS[i.type] || i.type;
      lines.push(`• Raise fees on "${label}" bets — users are winning less than we expected, so we can offer worse odds`);
    }
    if (under.length > 0) {
      const i = under[0]; const label = CAT_LABELS[i.type] || i.type;
      lines.push(`• Lower fees on "${label}" bets — users keep winning more than we expected, so we need to offer less generous odds`);
    }
  } else {
    lines.push('• No changes needed — model is performing within expected range');
  }

  const unresolvable = results.filter(r => !r.resolved);
  if (unresolvable.length > 0) {
    lines.push('');
    lines.push(`ℹ️ ${unresolvable.length} bets couldn't be resolved automatically (novelty bets or player name mismatches — need manual review)`);
  }

  if (canceledBets.length > 0) {
    lines.push('');
    lines.push(`↩️ ${canceledBets.length} bets were canceled and refunded (injured/inactive players): ${fmt$(canceledVolume)} returned to users`);
  }

  const report = lines.join('\n');
  console.log('\n─── TELEGRAM REPORT ───\n' + report);
  await sendTelegram(report);
  process.stdout.write('\n' + report + '\n');
}

main().catch(err => {
  console.error('batch-resolve error:', err);
  process.exit(1);
});
