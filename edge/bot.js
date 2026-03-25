#!/usr/bin/env node
/**
 * Jarvis — Edge Protocol Telegram Bot
 * Connects to the Edge pricing engine on port 3747
 *
 * Commands:
 *   /start        — Welcome message
 *   /help         — Command list
 *   /health       — Check Edge engine status
 *   /injuries     — Live NBA injury report
 *   /games        — Today's NBA schedule
 *   /price        — Price a bet (guided prompts)
 *   /quick <player> <stat> <over|under> <line> vs <OPP> — Quick price
 *
 * Start: node bot.js
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const DATA_DIR = '/root/.openclaw/workspace/projects/edge-protocol/data';
const http = require('http');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;
const API_KEY   = process.env.EDGE_API_KEY || 'edge-dev-key';
const EDGE_URL  = 'http://localhost:3747';

if (!BOT_TOKEN) { console.error('TELEGRAM_BOT_TOKEN not set'); process.exit(1); }
if (!CHAT_ID)   { console.error('TELEGRAM_CHAT_ID not set');   process.exit(1); }

// ── Telegram API helpers ─────────────────────────────────

function tgRequest(method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(params);
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function sendMessage(text, extra = {}) {
  return tgRequest('sendMessage', { chat_id: CHAT_ID, text, parse_mode: 'Markdown', ...extra });
}

function sendTyping() {
  return tgRequest('sendChatAction', { chat_id: CHAT_ID, action: 'typing' });
}

// ── Edge API helpers ─────────────────────────────────────

function edgeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 3747,
      path,
      method,
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    };
    const req = http.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON from Edge API')); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Command handlers ─────────────────────────────────────

async function handleStart() {
  await sendMessage(
    `🤖 *Jarvis is online.*\n\n` +
    `Edge Protocol pricing engine connected.\n\n` +
    `Type /help to see what I can do.`
  );
}

async function handleHelp() {
  await sendMessage(
    `*Jarvis — Edge Protocol Bot*\n\n` +
    `*/health* — Check engine status\n` +
    `*/injuries* — Live NBA injury report\n` +
    `*/games* — Today's NBA schedule\n` +
    `*/price* — Price a bet (step by step)\n` +
    `*/quick* — Quick bet price\n` +
    `  Format: \`/quick LeBron James points over 25 vs LAC\`\n\n` +
    `_All prices from the Edge Protocol engine on port 3747._`
  );
}

async function handleHealth() {
  await sendTyping();
  try {
    const data = await edgeRequest('GET', '/health');
    await sendMessage(
      `✅ *Edge Protocol Online*\n\n` +
      `Engine: ${data.engine}\n` +
      `Uptime: ${Math.floor((data.uptime || 0) / 3600)}h ${Math.floor(((data.uptime || 0) % 3600) / 60)}m\n` +
      `Odds API: ${data.odds_api?.enabled ? 'enabled' : 'disabled'}\n` +
      `Requests used: ${data.odds_api?.requests_used_session ?? 'n/a'}`
    );
  } catch (e) {
    await sendMessage(`❌ *Edge engine unreachable*\n\`${e.message}\`\n\nRun: \`node server.js\` in the edge-protocol directory.`);
  }
}

async function handleInjuries() {
  await sendTyping();
  try {
    const data = await edgeRequest('GET', '/injuries');
    const injuries = data.injuries || data;
    if (!injuries || injuries.length === 0) {
      await sendMessage('✅ No significant injuries reported.');
      return;
    }
    const lines = injuries.slice(0, 20).map(p =>
      `• *${p.player || p.name}* (${p.team}) — ${p.status} | ${p.note || p.injury || ''}`
    );
    await sendMessage(`🏥 *NBA Injury Report*\n\n${lines.join('\n')}`);
  } catch (e) {
    await sendMessage(`❌ Could not fetch injuries: \`${e.message}\``);
  }
}

async function handleGames() {
  await sendTyping();
  try {
    const data = await edgeRequest('GET', '/games/today');
    const games = data.games || data;
    if (!games || games.length === 0) {
      await sendMessage('📅 No games scheduled today.');
      return;
    }
    const lines = games.map(g =>
      `• *${g.away_team || g.away}* @ *${g.home_team || g.home}* — ${g.time || g.status || ''}`
    );
    await sendMessage(`🏀 *Today's NBA Games*\n\n${lines.join('\n')}`);
  } catch (e) {
    await sendMessage(`❌ Could not fetch games: \`${e.message}\``);
  }
}

// Session state for guided /price flow
const sessions = {};

async function handlePrice(chatId, text, messageText) {
  const session = sessions[chatId] || { step: 0 };

  if (messageText === '/price') {
    sessions[chatId] = { step: 1 };
    await sendMessage(`🎯 *Price a Bet*\n\nStep 1/5 — Player name?\n_e.g. Jayson Tatum_`);
    return;
  }

  if (!session.step) return;

  if (session.step === 1) {
    session.player = text;
    session.step = 2;
    sessions[chatId] = session;
    await sendMessage(`Step 2/5 — Stat?\n_e.g. points, rebounds, assists, threes_`);
  } else if (session.step === 2) {
    session.stat = text;
    session.step = 3;
    sessions[chatId] = session;
    await sendMessage(`Step 3/5 — Over or under?`);
  } else if (session.step === 3) {
    const cond = text.toLowerCase();
    if (!['over', 'under'].includes(cond)) {
      await sendMessage(`Please reply *over* or *under*.`);
      return;
    }
    session.condition = cond;
    session.step = 4;
    sessions[chatId] = session;
    await sendMessage(`Step 4/5 — Line (threshold)?\n_e.g. 25.5_`);
  } else if (session.step === 4) {
    const val = parseFloat(text);
    if (isNaN(val)) { await sendMessage(`Please enter a number, e.g. \`25.5\``); return; }
    session.threshold = val;
    session.step = 5;
    sessions[chatId] = session;
    await sendMessage(`Step 5/5 — Opponent team abbreviation?\n_e.g. MIA, LAL, GSW_`);
  } else if (session.step === 5) {
    session.opponent = text.toUpperCase();
    delete sessions[chatId];
    await sendTyping();
    await fetchAndSendPrice(session);
  }
}

async function handleQuick(args) {
  // Format: /quick LeBron James points over 25 vs LAC
  const match = args.match(/^(.+?)\s+(points|rebounds|assists|threes|blocks|steals|pts|reb|ast)\s+(over|under)\s+([\d.]+)\s+(?:vs\.?\s*)?([A-Z]{2,4})$/i);
  if (!match) {
    await sendMessage(
      `❓ *Quick price format:*\n` +
      `\`/quick LeBron James points over 25 vs LAC\`\n\n` +
      `Supported stats: points, rebounds, assists, threes, blocks, steals`
    );
    return;
  }
  const [, player, stat, condition, threshold, opponent] = match;
  await sendTyping();
  await fetchAndSendPrice({ player, stat, condition, threshold: parseFloat(threshold), opponent: opponent.toUpperCase() });
}

async function fetchAndSendPrice({ player, stat, condition, threshold, opponent }) {
  try {
    const payload = {
      player,
      stat,
      condition,
      threshold,
      opponent,
      game_date: new Date().toISOString().split('T')[0]
    };
    const data = await edgeRequest('POST', '/price', payload);

    if (data.error) {
      await sendMessage(`❌ Pricing error: ${data.error}`);
      return;
    }

    const prob = data.probability ?? data.prob ?? data.edge ?? null;
    const ev   = data.ev ?? data.expected_value ?? null;
    const rec  = data.recommendation ?? data.signal ?? null;
    const conf = data.confidence ?? null;

    let msg = `🎯 *${player}* — ${stat} ${condition} ${threshold} vs ${opponent}\n\n`;
    if (prob !== null) msg += `Probability: *${(prob * 100).toFixed(1)}%*\n`;
    if (ev   !== null) msg += `EV: *${ev > 0 ? '+' : ''}${typeof ev === 'number' ? ev.toFixed(3) : ev}*\n`;
    if (conf !== null) msg += `Confidence: *${conf}*\n`;
    if (rec  !== null) msg += `Signal: *${rec}*\n`;

    if (data.context) {
      msg += `\n_${data.context}_`;
    }

    await sendMessage(msg);
  } catch (e) {
    await sendMessage(`❌ Could not price bet: \`${e.message}\``);
  }
}


async function handleSummary(args) {
  const date = (args || '').trim() || new Date().toISOString().split('T')[0];
  const betFile = path.join(DATA_DIR, 'bets-' + date + '.json');
  let bets;
  try { bets = JSON.parse(fs.readFileSync(betFile, 'utf8')); }
  catch (e) { await sendMessage('No bet file found for ' + date + '. Bets generated at 11 PM UTC.'); return; }
  // Merge resolution data from predictions.jsonl into bet file predictions
  const predictions = bets.predictions || [];
  try {
    const jsonl = fs.readFileSync(path.join(DATA_DIR, 'predictions.jsonl'), 'utf8');
    const resolved = {};
    jsonl.trim().split('\n').forEach(line => {
      try { const r = JSON.parse(line); if (r.id && r.outcome !== null && r.outcome !== undefined) resolved[r.id] = r; } catch(e) {}
    });
    predictions.forEach(p => {
      if (resolved[p.id]) { p.outcome = resolved[p.id].outcome; p.actual_value = resolved[p.id].actual_value; }
    });
  } catch(e) {}
  const total = predictions.length;
  const totalVolume = bets.total_volume || predictions.reduce((s,b) => s+(b.bet_amount||0), 0);
  const resolved = predictions.filter(b => b.outcome !== null && b.outcome !== undefined);
  const unresolved = predictions.filter(b => b.outcome === null || b.outcome === undefined);
  const won = resolved.filter(b => b.outcome === 'won' || b.outcome === true);
  const lost = resolved.filter(b => b.outcome === 'lost' || b.outcome === false);
  const edgeProfit = lost.reduce((s,b) => s+(b.bet_amount||0), 0) - won.reduce((s,b) => s+((b.potential_payout||0)-(b.bet_amount||0)), 0);
  const byType = {};
  for (const b of resolved) {
    const t = b.type || 'unknown';
    if (byType[t] === undefined) byType[t] = {won:0, lost:0};
    if (b.outcome === 'won' || b.outcome === true) byType[t].won++; else byType[t].lost++;
  }
  const typeLines = Object.entries(byType).map(([t,v]) => '  - ' + t + ': ' + v.won + '/' + (v.won+v.lost) + ' (' + Math.round(v.won/(v.won+v.lost)*100) + '%)');
  const topWins = [...won].sort((a,b) => ((b.potential_payout||0)-(b.bet_amount||0))-((a.potential_payout||0)-(a.bet_amount||0))).slice(0,3);
  const topLosses = [...lost].sort((a,b) => (b.bet_amount||0)-(a.bet_amount||0)).slice(0,3);
  // Build game breakdown
  const byGame = {};
  for (const p of predictions) {
    const g = p.game || 'Unknown';
    if (!byGame[g]) byGame[g] = { total: 0, volume: 0, types: {} };
    byGame[g].total++;
    byGame[g].volume += p.bet_amount || 0;
    const t = p.type || 'prop';
    byGame[g].types[t] = (byGame[g].types[t] || 0) + 1;
  }

  // Build stat breakdown
  const byStat = {};
  for (const p of predictions) {
    const s = p.stat || 'unknown';
    if (!byStat[s]) byStat[s] = { total: 0, volume: 0 };
    byStat[s].total++;
    byStat[s].volume += p.bet_amount || 0;
  }

  let msg = 'Edge Protocol — ' + date + '\n';
  msg += '━━━━━━━━━━━━━━━━━━━━\n\n';
  msg += 'Volume: $' + totalVolume.toLocaleString() + ' across ' + total + ' bets\n';
  msg += 'Resolved: ' + resolved.length + ' | Won: ' + won.length + ' | Lost: ' + lost.length;
  if (unresolved.length > 0) msg += ' | Pending: ' + unresolved.length;
  msg += '\n';
  if (resolved.length > 0) {
    const holdPct = (lost.reduce((s,b)=>s+(b.bet_amount||0),0)/totalVolume*100).toFixed(1);
    msg += 'Edge profit: $' + edgeProfit.toLocaleString() + ' (' + holdPct + '% hold)\n';
  }

  // By game
  msg += '\nBy Game:\n';
  Object.entries(byGame).sort((a,b) => b[1].volume - a[1].volume).forEach(([game, g]) => {
    const typeStr = Object.entries(g.types).map(([t,n]) => t+':'+n).join(', ');
    msg += '  ' + game + ' — ' + g.total + ' bets ($' + g.volume.toLocaleString() + ') [' + typeStr + ']\n';
  });

  // By stat type
  msg += '\nBy Stat:\n';
  Object.entries(byStat).sort((a,b) => b[1].total - a[1].total).slice(0,8).forEach(([stat, s]) => {
    msg += '  ' + stat + ': ' + s.total + ' bets ($' + s.volume.toLocaleString() + ')\n';
  });

  if (typeLines.length > 0) msg += '\nBy bet type:\n' + typeLines.join('\n') + '\n';

  if (topWins.length > 0) {
    msg += '\nBiggest user wins:\n';
    topWins.forEach(b => { msg += '  - ' + b.bet + ' paid $' + ((b.potential_payout||0)-(b.bet_amount||0)).toLocaleString() + '\n'; });
  }
  if (topLosses.length > 0) {
    msg += '\nBiggest Edge wins:\n';
    topLosses.forEach(b => { msg += '  - ' + b.bet + ' user lost $' + (b.bet_amount||0).toLocaleString() + '\n'; });
  }
  if (unresolved.length > 0) msg += '\n' + unresolved.length + ' bets pending resolution.';

  // Split into chunks if too long for Telegram
  const chunks = [];
  let current = '';
  for (const line of msg.split('\n')) {
    if ((current + line).length > 3800) { chunks.push(current); current = ''; }
    current += line + '\n';
  }
  if (current) chunks.push(current);
  for (const chunk of chunks) await sendMessage(chunk);
}


let offset = 0;


async function handleChat(text) {
  await sendTyping();
  try {
    const today = new Date().toISOString().split('T')[0];
    let ctxSummary = '';
    try {
      // Try today's context, fall back to most recent available
      let ctxFile = path.join(DATA_DIR, '../context/nba-context-' + today + '.json');
      if (!fs.existsSync(ctxFile)) {
        const files = fs.readdirSync(path.join(DATA_DIR, '../context')).filter(f => f.startsWith('nba-context-') && f.endsWith('.json')).sort();
        if (files.length) ctxFile = path.join(DATA_DIR, '../context', files[files.length-1]);
      }
      const ctx = JSON.parse(fs.readFileSync(ctxFile, 'utf8'));
      const games = (ctx.games_today || []).map(g => g.away_team + ' @ ' + g.home_team + ' (' + g.game_time + ')').join(', ');
      const injuries = (ctx.injured_key_players || []).map(p => p.name + ' (' + p.team + ') - ' + p.status).join(', ');
      const stats = Object.entries(ctx.team_stats_last10 || {}).slice(0,20).map(([t,s]) => t + ': pts=' + s.pts_pg + ' off=' + s.off_rtg + ' def=' + s.def_rtg).join(', ');
      ctxSummary = '\n\nTODAY NBA CONTEXT (' + today + '):\nGames: ' + (games || 'none') + '\nKey Injuries: ' + (injuries || 'none reported') + '\nTeam stats (last 10): ' + (stats || 'unavailable');
      if (ctx.jarvis_instructions) ctxSummary += '\nInstructions: ' + ctx.jarvis_instructions;
    } catch(e) {}
    try {
      const summaries = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'player_summaries.json'), 'utf8'));
      const teamsInText = ['ATL','BKN','BOS','CHA','CHI','CLE','DAL','DEN','DET','GSW','HOU','IND','LAC','LAL','MEM','MIA','MIL','MIN','NOP','NYK','OKC','ORL','PHI','PHX','POR','SAC','SAS','TOR','UTA','WAS'];
      const mentioned = teamsInText.filter(t => text.toUpperCase().includes(t) || (t==='LAL' && /lakers/i.test(text)) || (t==='GSW' && /warriors/i.test(text)) || (t==='BOS' && /celtics/i.test(text)) || (t==='NYK' && /knicks/i.test(text)) || (t==='MIA' && /heat/i.test(text)) || (t==='DEN' && /nuggets/i.test(text)) || (t==='SAS' && /spurs/i.test(text)) || (t==='PHI' && /sixers/i.test(text)) || (t==='MIL' && /bucks/i.test(text)) || (t==='PHX' && /suns/i.test(text)) || (t==='LAC' && /clippers/i.test(text)) || (t==='CLE' && /cavaliers|cavs/i.test(text)) || (t==='OKC' && /thunder/i.test(text)) || (t==='MEM' && /grizzlies/i.test(text)) || (t==='NOP' && /pelicans/i.test(text)) || (t==='SAC' && /kings/i.test(text)) || (t==='MIN' && /timberwolves|wolves/i.test(text)) || (t==='IND' && /pacers/i.test(text)) || (t==='ATL' && /hawks/i.test(text)) || (t==='CHA' && /hornets/i.test(text)) || (t==='ORL' && /magic/i.test(text)) || (t==='TOR' && /raptors/i.test(text)) || (t==='CHI' && /bulls/i.test(text)) || (t==='DET' && /pistons/i.test(text)) || (t==='WAS' && /wizards/i.test(text)) || (t==='POR' && /blazers|trail blazers/i.test(text)) || (t==='UTA' && /jazz/i.test(text)) || (t==='DAL' && /mavericks|mavs/i.test(text)) || (t==='HOU' && /rockets/i.test(text)) || (t==='BKN' && /nets/i.test(text)));
      if (mentioned.length > 0) {
        const roster = summaries.filter(p => mentioned.includes(p.team)).map(p => p.player_name + ' (' + p.team + ') ppg=' + p.ppg + ' rpg=' + p.rpg + ' apg=' + p.apg).join(', ');
        ctxSummary += '\nCurrent rosters: ' + roster;
      }
    } catch(e) {}
    const systemPrompt = `[System prompt redacted — contains operational instructions for the Jarvis orchestration agent including timezone logic, command routing, and NBA context awareness]` + ctxSummary;
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: text }]
    });
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'Content-Length': Buffer.byteLength(body) }
    };
    const reply = await new Promise((resolve, reject) => {
      const req = https.request(options, res => {
        let d = ''; res.on('data', c => d += c);
        res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
      });
      req.on('error', reject); req.write(body); req.end();
    });
    const msg = reply.content?.[0]?.text || 'Sorry, I could not generate a response.';
    await sendMessage(msg);
  } catch (e) {
    console.error('[chat error]', e.message, e.stack);
    await sendMessage('Error: ' + e.message);
  }
}


async function handleResolve(args) {
  const date = (args || '').trim() || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();
  await sendMessage('Running batch resolution for ' + date + '... this takes 1-2 minutes.');
  const { exec } = require('child_process');
  const cmd = 'cd /root/.openclaw/workspace/projects/edge-protocol && ODDS_API_KEY=' + (process.env.ODDS_API_KEY||'') + ' ANTHROPIC_API_KEY=' + (process.env.ANTHROPIC_API_KEY||'') + ' TELEGRAM_BOT_TOKEN=' + process.env.TELEGRAM_BOT_TOKEN + ' TELEGRAM_CHAT_ID=' + process.env.TELEGRAM_CHAT_ID + ' node batch-resolve.js ' + date;
  exec(cmd, { timeout: 120000 }, async (err, stdout, stderr) => {
    if (err) {
      await sendMessage('Resolution error: ' + (err.message || stderr).slice(0, 500));
    } else {
      await sendMessage('Resolution complete for ' + date + '. Use /summary ' + date + ' to see results.');
    }
  });
}

async function poll() {
  try {
    const res = await tgRequest('getUpdates', { offset, limit: 10, timeout: 30 });
    if (res.ok && res.result.length > 0) {
      for (const update of res.result) {
        offset = update.update_id + 1;
        const msg = update.message;
        if (!msg || !msg.text) continue;

        // Only respond to your own chat
        if (String(msg.chat.id) !== String(CHAT_ID)) // operator-only filter continue;

        const text = msg.text.trim();
        const cmd  = text.split(' ')[0].toLowerCase().replace(`@jarvisedge1bot`, '');
        const args = text.slice(cmd.length).trim();

        console.log(`[${new Date().toISOString()}] ${cmd} ${args}`);

        if      (cmd === '/start')    await handleStart();
        else if (cmd === '/help')     await handleHelp();
        else if (cmd === '/health')   await handleHealth();
        else if (cmd === '/injuries') await handleInjuries();
        else if (cmd === '/games')    await handleGames();
        else if (cmd === '/price')    await handlePrice(msg.chat.id, args, text);
        else if (cmd === '/quick')    await handleQuick(args);
        else if (cmd === '/summary')  await handleSummary(args);
        else if (cmd === '/resolve')  await handleResolve(args);
        else if (cmd === '/summary')  await handleSummary(args);
        else if (cmd === '/resolve')  await handleResolve(args);
        else if (sessions[msg.chat.id]) await handlePrice(msg.chat.id, text, text);
        else await handleChat(text);
      }
    }
  } catch (e) {
    console.error(`[poll error] ${e.message}`);
  }
  setTimeout(poll, 1000);
}

// ── Boot ─────────────────────────────────────────────────

console.log(`[${new Date().toISOString()}] Jarvis starting...`);
sendMessage(`🤖 *Jarvis is back online.*\nEdge Protocol bot ready. Type /help.`)
  .then(() => poll())
  .catch(e => { console.error('Failed to send boot message:', e.message); poll(); });
