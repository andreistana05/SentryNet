@echo off
REM ── SentryNet Network Monitor ──────────────────────────────────────────────
REM  Edit the values below to match your environment, then set up this file
REM  in Windows Task Scheduler to run at system startup.
REM ───────────────────────────────────────────────────────────────────────────

set BACKEND_URL=http://localhost:8080
set INGEST_API_KEY=sk-infrapulse-7f3Kx9mQpL2wNvR8dYcT4jZbHnUeA6sW
set MONITOR_INTERVAL=30
set OFFLINE_THRESHOLD=3
set NETWORK_RANGE=192.168.1.0/24
set GATEWAY_IP=192.168.1.1
set DISCOVERY_INTERVAL=300

cd /d "%~dp0"

REM If python is not found, set the full path here, e.g.:
REM set PYTHON=C:\Users\Andrei\AppData\Local\Programs\Python\Python311\python.exe
set PYTHON=python

%PYTHON% monitor.py >> "%~dp0monitor.log" 2>&1
