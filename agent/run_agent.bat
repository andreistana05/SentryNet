@echo off
REM ── SentryNet Agent ─────────────────────────────────────────────────────────
REM  Edit BACKEND_URL to point to the machine running the backend, then set up
REM  this file in Windows Task Scheduler to run at system startup.
REM ───────────────────────────────────────────────────────────────────────────

set BACKEND_URL=http://localhost:8080
set INGEST_API_KEY=sk-infrapulse-7f3Kx9mQpL2wNvR8dYcT4jZbHnUeA6sW
set METRICS_INTERVAL=10
set HEARTBEAT_INTERVAL=30

cd /d "%~dp0"
python main.py >> "%~dp0agent.log" 2>&1
