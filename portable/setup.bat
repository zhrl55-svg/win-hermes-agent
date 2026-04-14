@echo off
setlocal EnableDelayedExpansion

REM Hermes Agent for Windows — Setup
REM Usage:
REM   setup.bat              Install from PyPI (requires hermes-agent published)
REM   setup.bat --source     Install from local source (for portable release)

set "INSTALL_MODE=pypi"
if "%~1"=="--source" set "INSTALL_MODE=source"
if "%~1"=="--src"    set "INSTALL_MODE=source"

echo ================================================
echo  Hermes Agent for Windows — Setup
echo  Mode: %INSTALL_MODE%
echo ================================================
echo.

REM Detect Python
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed.
    echo.
    echo  Please install Python 3.11 or later from:
    echo    https://www.python.org/downloads/
    echo.
    echo  Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo  Python version: %PYVER%

REM Create virtual environment
echo.
echo [1/3] Creating virtual environment...
if exist "venv" (
    echo  venv already exists — skipping
) else (
    python -m venv venv
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo  Done
)

REM Upgrade pip
echo.
echo [2/3] Installing Hermes Agent...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip -q
if %ERRORLEVEL% neq 0 (
    echo [ERROR] pip upgrade failed.
    pause
    exit /b 1
)

if "%INSTALL_MODE%"=="source" (
    REM Install from local source (for portable release / development)
    if exist "pyproject.toml" (
        echo  Installing from local source...
        pip install -e ".[cron,cli,pty,mcp]" -q
    ) else (
        echo [ERROR] pyproject.toml not found. Run this script from the repo root.
        pause
        exit /b 1
    )
) else (
    REM Install from PyPI
    pip install hermes-agent[cron,cli,pty,mcp] -q
)
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install hermes-agent.
    echo.
    echo  If you see a compilation error, try installing the Microsoft Visual C++ Build Tools:
    echo    https://visualstudio.microsoft.com/visual-cpp-build-tools/
    pause
    exit /b 1
)

REM Install webui backend
pip install fastapi uvicorn httpx pydantic -q

REM Build web-ui frontend
echo.
echo [3/3] Building Web UI...
cd web-ui\frontend 2>nul
if exist "package.json" (
    call npm install --legacy-peer-deps -q 2>nul
    call npm run build -q 2>nul
    if %ERRORLEVEL% equ 0 (
        echo  Web UI built successfully
    ) else (
        echo [WARNING] Web UI build failed. Run 'portable\webui-install.bat' manually.
    )
) else (
    echo [WARNING] web-ui\frontend not found — skipping Web UI build.
)
cd ..\.. 2>nul

echo.
echo ================================================
echo  Setup complete!
echo ================================================
echo.
echo  Next steps:
echo.
echo   hermes setup          Configure API keys and model
echo   hermmes              Start interactive chat
echo   hermes webui install  Build web UI (requires Node.js)
echo   hermes webui start   Start web UI backend
echo.
echo  Or run portable\hermes.bat and portable\webui-start.bat
echo.
pause
