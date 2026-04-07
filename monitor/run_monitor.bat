@echo off
REM ── SentryNet Network Monitor ──────────────────────────────────────────────
REM  Edit the values below to match your environment, then set up this file
REM  in Windows Task Scheduler to run at system startup.
REM ───────────────────────────────────────────────────────────────────────────

set BACKEND_URL=http://<BACKEND_IP>:8080
set INGEST_API_KEY=change-me-ingest-key
set MONITOR_INTERVAL=30
set OFFLINE_THRESHOLD=3
set NETWORK_RANGE=192.168.1.0/24
set DISCOVERY_INTERVAL=300

cd /d "%~dp0"
python monitor.py >> "%~dp0monitor.log" 2>&1
