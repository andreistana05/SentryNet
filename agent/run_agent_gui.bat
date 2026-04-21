@echo off
REM ── SentryNet Agent Control Panel ──────────────────────────────────────────

cd /d "%~dp0"

python -c "import psutil, requests" >nul 2>&1 || python -m pip install -r requirements.txt --quiet
python agent_gui.py
