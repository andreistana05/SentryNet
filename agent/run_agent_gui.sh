#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PYTHON="${PYTHON:-python3}"

if ! "$PYTHON" -c "import psutil, requests" >/dev/null 2>&1; then
    "$PYTHON" -m pip install -r "$SCRIPT_DIR/requirements.txt" --quiet
fi

# The GUI is just a control panel. Saving settings writes config.json, and the
# Start Agent action inside the app launches the detached background collector.
exec "$PYTHON" "$SCRIPT_DIR/agent_gui.py"
