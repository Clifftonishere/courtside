#!/bin/bash
# Edge Protocol — Trade Agent Launcher
#
# Starts the trade agent + auto-reconnecting SSH tunnel.
# Run this once and leave it running. It survives WiFi drops.
#
# Usage: ./start-trade-agent.sh

EDGE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export POLYMARKET_PRIVATE_KEY="54d359a6b3c55129e6952487b5e35af06ebdf5aace9344d93317b403595b4056"

echo "=== Edge Trade Agent ==="
echo "Starting agent + auto-reconnecting tunnel..."
echo ""

# Kill any existing instances
pkill -f "trade-agent.cjs" 2>/dev/null
pkill -f "autossh.*4747" 2>/dev/null
sleep 1

# Start the trade agent in background
cd "$EDGE_DIR"
node trade-agent.cjs &
AGENT_PID=$!
echo "Agent started (PID: $AGENT_PID)"

# Wait for agent to be ready
sleep 2

# Start auto-reconnecting tunnel
# AUTOSSH_POLL=30 checks every 30s if tunnel is alive
# -M 0 disables autossh's monitoring port (uses ServerAlive instead)
export AUTOSSH_POLL=30
/opt/homebrew/bin/autossh -M 0 -N \
  -R 4747:localhost:4747 \
  -o "ServerAliveInterval=15" \
  -o "ServerAliveCountMax=3" \
  -o "ExitOnForwardFailure=yes" \
  -o "ConnectTimeout=10" \
  root@5.223.72.173 &
TUNNEL_PID=$!
echo "Tunnel started (PID: $TUNNEL_PID)"
echo ""
echo "Both running. Press Ctrl+C to stop."
echo ""

# Trap Ctrl+C to clean up both
cleanup() {
  echo ""
  echo "Shutting down..."
  kill $AGENT_PID 2>/dev/null
  kill $TUNNEL_PID 2>/dev/null
  pkill -f "autossh.*4747" 2>/dev/null
  echo "Done."
  exit 0
}
trap cleanup INT TERM

# Keep script alive and show agent logs
wait $AGENT_PID
