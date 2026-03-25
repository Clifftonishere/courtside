#!/bin/bash
# run.sh — Environment wrapper for cron jobs
# Sources .env before executing any command, so API key rotation
# only requires updating one file instead of editing crontab.
#
# Usage: ./run.sh node batch-price.js
#        ./run.sh python3 nba_context.py

set -a
source "$(dirname "$0")/.env"
set +a
exec "$@"
