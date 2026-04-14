@echo off
title Stopping Hermes Agent
echo Stopping all Hermes Agent processes...
echo.

REM Kill backend
taskkill /F /IM python.exe /FI "WINDOWTITLE eq HermesBackend*" >nul 2>&1
taskkill /F /IM python.exe /FI "WINDOWTITLE eq HermesFrontend*" >nul 2>&1

REM Kill any uvicorn
for /f "tokens=2" %%a in ('tasklist /FI "WINDOWTITLE eq HermesBackend*" /FO LIST ^| find "PID:"') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM Kill http.server on 5173
for /f "tokens=2" %%a in ('netstat -ano ^| find ":5173" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM Kill gateway (hermes_cli.main)
for /f "tokens=2" %%a in ('wmic process where "CommandLine like '%%hermes_cli.main%%'" get ProcessId 2^>nul ^| findstr /r "[0-9]"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Done. All Hermes processes stopped.
timeout /t 1 /nobreak >nul
