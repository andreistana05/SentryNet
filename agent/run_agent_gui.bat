@echo off
REM ── SentryNet Agent Control Panel ──────────────────────────────────────────
REM  The GUI saves machine-specific settings to config.json.
REM  Starting the agent from inside the app launches the background collector.

cd /d "%~dp0"

set "PYTHON=%~dp0.venv\Scripts\python.exe"
set "PYTHONW=%~dp0.venv\Scripts\pythonw.exe"
set "TEMP=%~dp0.tmp"
set "TMP=%TEMP%"
if not exist "%TEMP%" mkdir "%TEMP%"

if not exist "%PYTHON%" (
    python -m venv "%~dp0.venv"
)

"%PYTHON%" -c "import psutil, requests" >nul 2>&1 || "%PYTHON%" -m pip install -r requirements.txt --quiet
if exist "%PYTHONW%" (
    "%PYTHONW%" agent_gui.py
) else (
    "%PYTHON%" agent_gui.py
)
