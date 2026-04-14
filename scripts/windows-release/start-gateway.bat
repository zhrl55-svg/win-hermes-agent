@echo off
title Hermes Agent - Gateway
cd /d "%~dp0"

echo Starting Hermes Gateway...
echo.

REM Create logs dir
if not exist "logs" mkdir logs

REM Start gateway in background (logs to file)
start /b "" cmd /c "venv\Scripts\python.exe -m hermes_cli.main gateway run > logs\gateway.log 2>&1"

timeout /t 3 /nobreak >nul

echo Gateway starting in background.
echo Logs: %~dp0logs\gateway.log
echo.
echo To stop: stop.bat
pause
