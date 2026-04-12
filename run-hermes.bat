@echo off
chcp 65001 >nul 2>&1

REM ============================================================================
REM Hermes Agent - Windows Launcher
REM ============================================================================
REM
REM Requirements:
REM   - Python 3.11+ installed
REM   - Git for Windows (Git Bash) installed
REM   - hermes-agent installed: pip install -e .
REM
REM Usage:
REM   Double-click to launch interactive chat
REM   Or: run-hermes.bat [hermes args]
REM
REM Environment variables (optional):
REM   HERMES_GIT_BASH_PATH  - Path to bash.exe (auto-detected if omitted)
REM   HERMES_HOME           - Hermes config dir (default: %USERPROFILE%\.hermes)
REM   PYTHON_EXE            - Path to python.exe (auto-detected if omitted)
REM
REM ============================================================================

setlocal EnableDelayedExpansion

REM --- Detect Python ---
set "PYTHON_EXE="

REM Check HERMES_PYTHON override first
if defined PYTHON_EXE (
    if exist "!PYTHON_EXE!" (
        goto :python_found
    )
)

REM Try Python 3.11 from known install paths FIRST
if exist "C:\Users\zhrl5\AppData\Local\Programs\Python\Python311\python.exe" (
    set "PYTHON_EXE=C:\Users\zhrl5\AppData\Local\Programs\Python\Python311\python.exe"
    goto :python_found
)

REM Try Python from PATH (skip LobsterAI runtime)
where python >nul 2>&1
if !ERRORLEVEL!==0 (
    for /f "tokens=*" %%p in ('python -c "import sys; v=sys.version_info; print((v[0]*100+v[1])>=311)" 2^>nul') do (
        if "%%p"=="True" set "PYTHON_EXE=python"
    )
    if defined PYTHON_EXE goto :python_found
)

echo [ERROR] Python 3.11+ not found.
echo Please install from: https://www.python.org/downloads/
pause
exit /b 1

:python_found

REM --- Detect Git Bash ---
if not defined HERMES_GIT_BASH_PATH (
    if exist "D:\Program Files\Git\usr\bin\bash.exe" (
        set "HERMES_GIT_BASH_PATH=D:\Program Files\Git\usr\bin\bash.exe"
    ) else if exist "D:\Program Files\Git\bin\bash.exe" (
        set "HERMES_GIT_BASH_PATH=D:\Program Files\Git\bin\bash.exe"
    ) else if exist "C:\Program Files\Git\usr\bin\bash.exe" (
        set "HERMES_GIT_BASH_PATH=C:\Program Files\Git\usr\bin\bash.exe"
    ) else if exist "C:\Program Files\Git\bin\bash.exe" (
        set "HERMES_GIT_BASH_PATH=C:\Program Files\Git\bin\bash.exe"
    )
)

REM --- Set Hermes home ---
if not defined HERMES_HOME (
    set "HERMES_HOME=%USERPROFILE%\.hermes"
)

REM Change to script directory
cd /d "%~dp0"

echo.
echo ============================================================================
echo   Hermes Agent
echo ============================================================================
echo   Python:   !PYTHON_EXE!
echo   Git Bash: !HERMES_GIT_BASH_PATH!
echo   Home:    !HERMES_HOME!
echo ============================================================================
echo.

REM Launch Hermes
if "%~1"=="" (
    "!PYTHON_EXE!" -m hermes_cli.main chat
) else (
    "!PYTHON_EXE!" -m hermes_cli.main %*
)

endlocal
