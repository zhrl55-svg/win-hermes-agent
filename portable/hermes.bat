@echo off
setlocal

REM Hermes Agent for Windows — CLI Launcher

set "SCRIPT_DIR=%~dp0"

REM Activate venv if it exists
if exist "%SCRIPT_DIR%venv\Scripts\activate.bat" (
    call "%SCRIPT_DIR%venv\Scripts\activate.bat"
) else (
    echo [WARNING] Virtual environment not found.
    echo  Run setup.bat first: portable\setup.bat
    echo.
)

REM Run hermes
python -m hermes_cli.main %*
