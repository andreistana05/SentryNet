#!/usr/bin/env bash
set -euo pipefail

# SentryNet Agent
# Edit config.py to set the backend URL, ingest API key, and intervals. Then run
# this script from systemd, cron @reboot, or a terminal session.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PYTHON="${PYTHON:-python3}"
LOG_FILE="${LOG_FILE:-$SCRIPT_DIR/agent.log}"

if ! "$PYTHON" -c "import psutil, requests" >/dev/null 2>&1; then
    "$PYTHON" -m pip install -r "$SCRIPT_DIR/requirements.txt" --quiet >> "$LOG_FILE" 2>&1
fi

exec "$PYTHON" -u "$SCRIPT_DIR/main.py" >> "$LOG_FILE" 2>&1
