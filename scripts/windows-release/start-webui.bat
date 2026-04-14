@echo off
title Hermes Agent - Web UI
cd /d "%~dp0"

echo Starting Hermes Agent Web UI...
echo.

REM Start the backend in background
start /b "HermesBackend" cmd /c "venv\Scripts\python.exe -m uvicorn web-ui.backend.main:app --host 127.0.0.1 --port 8000 > logs\webui.log 2>&1"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Check if backend started
curl -s http://127.0.0.1:8000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Backend may not have started properly. Check logs\webui.log
    echo.
)

REM Start frontend (if dist exists) or just open browser
if exist "web-ui\frontend\dist\index.html" (
    echo Starting frontend server...
    start /b "HermesFrontend" cmd /c "cd web-ui\frontend && venv\Scripts\python.exe -m http.server 5173 > logs\frontend.log 2>&1"
    timeout /t 2 /nobreak >nul
    start http://localhost:5173
) else (
    echo Frontend not built. Opening backend directly...
    start http://127.0.0.1:8000
)

echo.
echo Hermes Agent is running:
echo   Web UI:  http://localhost:5173
echo   API:    http://127.0.0.1:8000
echo.
echo Press Ctrl+C here to stop, or close this window (services keep running).
echo To stop all services: stop.bat
pause
