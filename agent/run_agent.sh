#!/usr/bin/env bash
set -euo pipefail

# SentryNet Agent
# Edit config.json or use the GUI to set the backend URL, ingest API key, and
# intervals for this machine. config.py only contains the built-in defaults and
# the logic that loads config.json/environment overrides.
# This launcher runs the headless agent in the current session; use systemd,
# cron @reboot, or another service manager if you want it to start automatically.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PYTHON="${PYTHON:-python3}"
LOG_FILE="${LOG_FILE:-$SCRIPT_DIR/agent.log}"

if ! "$PYTHON" -c "import psutil, requests" >/dev/null 2>&1; then
    "$PYTHON" -m pip install -r "$SCRIPT_DIR/requirements.txt" --quiet >> "$LOG_FILE" 2>&1
fi

# -u keeps stdout/stderr unbuffered so log entries appear in agent.log as the
# agent writes them instead of being delayed in large chunks.
exec "$PYTHON" -u "$SCRIPT_DIR/main.py" >> "$LOG_FILE" 2>&1
