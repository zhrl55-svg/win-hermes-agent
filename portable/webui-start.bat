@echo off
setlocal

REM Hermes Web UI — Backend Launcher

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%..\web-ui\backend"

if not exist "%BACKEND_DIR%\main.py" (
    echo [ERROR] web-ui backend not found at: %BACKEND_DIR%
    echo.
    echo  Run 'hermes webui install' to build the web UI first.
    pause
    exit /b 1
)

REM Activate venv
if exist "%SCRIPT_DIR%venv\Scripts\activate.bat" (
    call "%SCRIPT_DIR%venv\Scripts\activate.bat"
)

REM Check if backend is already running
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Web UI backend is already running on http://127.0.0.1:8000
    echo  Open your browser at http://localhost:5173
    echo.
    echo  To stop: portable\webui-stop.bat
    pause
    exit /b 0
)

echo Starting Hermes Web UI backend on http://127.0.0.1:8000
echo Press Ctrl+C to stop.
echo.

cd /d "%BACKEND_DIR%"
python -m uvicorn main:app --host 127.0.0.1 --port 8000
