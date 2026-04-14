@echo off
setlocal

REM Hermes Web UI — Backend Launcher (no console window)

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%..\web-ui\backend"

if not exist "%BACKEND_DIR%\main.py" (
    echo [ERROR] web-ui backend not found at: %BACKEND_DIR%
    pause
    exit /b 1
)

REM Check if backend is already running
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Web UI backend is already running on http://127.0.0.1:8000
    echo  Open your browser at http://localhost:5173
    pause
    exit /b 0
)

REM Detect python from venv
set "PYTHON=%SCRIPT_DIR%venv\Scripts\python.exe"
if not exist "%PYTHON%" set "PYTHON%=python"

REM Launch without opening a new window using pythonw
"%PYTHON%" -m uvicorn main:app --host 127.0.0.1 --port 8000 --log-level warning > nul 2>&1 &

REM Give it a moment to start
timeout /t 2 /nobreak > nul

REM Verify it started
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Web UI backend started on http://127.0.0.1:8000
    echo  Open your browser: http://localhost:5173
    echo.
    echo  Backend runs in background — close this window to continue.
    echo  To stop: portable\webui-stop.bat
) else (
    echo [ERROR] Backend failed to start. Check logs in logs\webui.log
)

pause

