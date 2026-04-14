@echo off
setlocal

REM Hermes Web UI — Stop Backend

echo Stopping Hermes Web UI backend...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Killing process %%a on port 8000...
    taskkill /PID %%a /F >nul 2>&1
)

echo Done.
