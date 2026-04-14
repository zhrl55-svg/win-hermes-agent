@echo off
setlocal

REM Hermes Web UI — Install and Build

set "SCRIPT_DIR=%~dp0"

echo ================================================
echo  Hermes Web UI — Installation
echo ================================================
echo.

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo.
    echo  Install from: https://nodejs.org/
    echo  Then run this script again.
    pause
    exit /b 1
)

echo  Node: %~dp0..\web-ui\frontend
echo.

REM Activate venv
if exist "%SCRIPT_DIR%venv\Scripts\activate.bat" (
    call "%SCRIPT_DIR%venv\Scripts\activate.bat"
)

REM Install backend deps
echo Installing backend dependencies...
pip install fastapi uvicorn httpx pydantic -q
if %ERRORLEVEL% equ 0 (
    echo  Backend deps installed
) else (
    echo [WARNING] Some backend deps failed to install
)

REM Build frontend
set "FE_DIR=%SCRIPT_DIR%..\web-ui\frontend"
if not exist "%FE_DIR%\package.json" (
    echo [ERROR] frontend not found: %FE_DIR%
    pause
    exit /b 1
)

echo.
echo Building frontend...
cd /d "%FE_DIR%"
if exist "node_modules" (
    echo  (using existing node_modules)
) else (
    echo  Installing npm dependencies...
    call npm install --legacy-peer-deps
)

call npm run build
if %ERRORLEVEL% equ 0 (
    echo.
    echo [OK] Web UI built successfully!
    echo.
    echo  Start the backend: portable\webui-start.bat
    echo  Then open: http://localhost:5173
) else (
    echo.
    echo [ERROR] Build failed. Check the output above.
)

pause
