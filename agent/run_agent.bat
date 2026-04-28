@echo off
REM ── SentryNet Agent ─────────────────────────────────────────────────────────
REM  Edit config.json or use the GUI to set the backend URL, ingest API key,
REM  and intervals for this machine. config.py only contains the built-in
REM  defaults and the logic that loads config.json/environment overrides.
REM  This launcher runs the headless agent in the current session. Use Windows
REM  Task Scheduler or another service wrapper if you want it to start automatically.
REM ───────────────────────────────────────────────────────────────────────────

cd /d "%~dp0"

REM Only install psutil if it is not already present (avoids pip hanging in background)
python -c "import psutil" >nul 2>&1 || python -m pip install psutil --quiet >> "%~dp0agent.log" 2>&1

python -u main.py >> "%~dp0agent.log" 2>&1
