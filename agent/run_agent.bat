@echo off
REM ── SentryNet Agent ─────────────────────────────────────────────────────────
REM  Edit config.json or use the GUI to set the backend URL, ingest API key,
REM  and intervals for this machine. config.py only contains the built-in
REM  defaults and the logic that loads config.json/environment overrides.
REM  This launcher runs the headless agent in the current session. Use Windows
REM  Task Scheduler or another service wrapper if you want it to start automatically.
REM ───────────────────────────────────────────────────────────────────────────

cd /d "%~dp0"

set "PYTHON=%~dp0.venv\Scripts\python.exe"
set "TEMP=%~dp0.tmp"
set "TMP=%TEMP%"
if not exist "%TEMP%" mkdir "%TEMP%"

if not exist "%PYTHON%" (
    python -m venv "%~dp0.venv" >> "%~dp0agent.log" 2>&1
)

REM Only install dependencies if they are not already present.
"%PYTHON%" -c "import psutil, requests" >nul 2>&1 || "%PYTHON%" -m pip install -r requirements.txt --quiet >> "%~dp0agent.log" 2>&1

"%PYTHON%" -u main.py >> "%~dp0agent.log" 2>&1
