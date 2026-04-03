#!/usr/bin/env node
/**
 * Edge Protocol — Local Trade Execution Agent
 *
 * Runs on your Mac (not VPS). Listens for trade commands from Jarvis
 * via SSH reverse tunnel, executes them via Polymarket CLI through
 * your local NordVPN connection (Malaysia — non-blocked region).
 *
 * Architecture:
 *   VPS (Jarvis) → POST localhost:4747 → SSH tunnel → Mac:4747 → polymarket CLI
 *
 * Setup:
 *   1. Start this agent:  node trade-agent.js
 *   2. Start SSH tunnel:  ssh -R 4747:localhost:4747 root@5.223.72.173 -N
 *   3. Jarvis sends trade commands to localhost:4747 on the VPS
 *
 * Security: Only accepts requests with the correct API key.
 */

'use strict';

const http = require('http');
const { execSync } = require('child_process');

const PORT = 4747;
const API_KEY = process.env.TRADE_AGENT_KEY || 'edge-trade-agent-2026';
const PRIVATE_KEY = process.env.POLYMARKET_PRIVATE_KEY || '';

if (!PRIVATE_KEY) {
  console.error('POLYMARKET_PRIVATE_KEY not set. Export it before starting.');
  console.error('  export POLYMARKET_PRIVATE_KEY=your_key_here');
  process.exit(1);
}

function runPolymarket(cmd) {
  const fullCmd = `${cmd} --private-key "${PRIVATE_KEY}" --signature-type eoa`;
  try {
    const output = execSync(fullCmd, {
      encoding: 'utf8',
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { success: true, output: output.trim() };
  } catch (e) {
    const sanitized = (e.message || '').replace(/--private-key\s+"[^"]+"/g, '--private-key ***');
    return { success: false, error: sanitized.slice(0, 300) };
  }
}

const server = http.createServer((req, res) => {
  // CORS + JSON
  res.setHeader('Content-Type', 'application/json');

  // Auth check
  const authKey = req.headers['x-api-key'] || '';
  if (authKey !== API_KEY) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  // Health check
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', agent: 'trade-agent', uptime: process.uptime() }));
    return;
  }

  // Execute trade
  if (req.url === '/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { action } = data;

        let result;

        if (action === 'create-order') {
          const { tokenId, side, price, size } = data;
          if (!tokenId || !price || !size) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing tokenId, price, or size' }));
            return;
          }
          const cmd = `polymarket clob create-order --token "${tokenId}" --side ${side || 'buy'} --price ${price} --size ${size}`;
          console.log(`[${new Date().toISOString()}] ORDER: ${side} ${size}x @ ${price} | token: ${tokenId.slice(0, 20)}...`);
          result = runPolymarket(cmd);

        } else if (action === 'cancel') {
          const { orderId } = data;
          if (!orderId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing orderId' }));
            return;
          }
          const cmd = `polymarket clob cancel ${orderId}`;
          console.log(`[${new Date().toISOString()}] CANCEL: ${orderId}`);
          result = runPolymarket(cmd);

        } else if (action === 'balance') {
          const cmd = `polymarket clob balance --asset-type collateral`;
          result = runPolymarket(cmd);

        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ error: `Unknown action: ${action}` }));
          return;
        }

        console.log(`  Result: ${result.success ? 'OK' : 'FAILED'} ${result.output?.slice(0, 100) || result.error?.slice(0, 100)}`);
        res.writeHead(result.success ? 200 : 500);
        res.end(JSON.stringify(result));

      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON: ' + e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found. Use GET /health or POST /execute' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Trade Agent listening on http://127.0.0.1:${PORT}`);
  console.log(`API Key: ${API_KEY}`);
  console.log(`Wallet: ${PRIVATE_KEY.slice(0, 6)}...${PRIVATE_KEY.slice(-4)}`);
  console.log('');
  console.log('Next: Start SSH tunnel in another terminal:');
  console.log(`  ssh -R 4747:localhost:4747 root@5.223.72.173 -N`);
  console.log('');
  console.log('Jarvis will route trades through this agent.');
});
