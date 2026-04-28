@echo off
REM ── SentryNet Agent Control Panel ──────────────────────────────────────────
REM  The GUI saves machine-specific settings to config.json.
REM  Starting the agent from inside the app launches the background collector.

cd /d "%~dp0"

python -c "import psutil, requests" >nul 2>&1 || python -m pip install -r requirements.txt --quiet
python agent_gui.py
