@echo off
REM ── SentryNet Agent ─────────────────────────────────────────────────────────
REM  Edit config.py to set the backend URL, ingest API key, and intervals.
REM  Set up this file in Windows Task Scheduler to run at system startup.
REM ───────────────────────────────────────────────────────────────────────────

cd /d "%~dp0"

REM Only install psutil if it is not already present (avoids pip hanging in background)
python -c "import psutil" >nul 2>&1 || python -m pip install psutil --quiet >> "%~dp0agent.log" 2>&1

python -u main.py >> "%~dp0agent.log" 2>&1
