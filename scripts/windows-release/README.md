# Hermes Agent for Windows

A Windows-native release of Hermes Agent with Task Scheduler auto-start and zero-dependency installer.

## Requirements

- Windows 10/11 (64-bit)
- Internet connection (first run only, to install Python/Node if missing)

## Quick Install

1. Download and extract the ZIP release to any folder, e.g. `C:\Program Files\HermesAgent`
2. Right-click `setup.ps1` → **Run with PowerShell** (or open PowerShell in this folder and run):
   ```powershell
   .\setup.ps1
   ```
3. The installer will:
   - Install Python 3.11 and Node.js 18 LTS via winget (if not present)
   - Create a Python virtual environment
   - Install all dependencies
   - Build the web UI
   - Create Start Menu and Desktop shortcuts
   - Optionally register auto-start at Windows login

## Usage

After installation, launch from:

| Shortcut | What it does |
|----------|-------------|
| **Hermes Agent (Web UI)** | Opens browser-based chat UI at `http://localhost:5173` |
| **Hermes Agent (CLI)** | Opens interactive terminal chat |
| **Hermes Agent (Gateway)** | Starts the messaging gateway in background |
| **Hermes Agent (Stop)** | Stops all running Hermes processes |

Or run directly from the install folder:
```cmd
start-webui.bat    # Web UI (frontend + backend)
start-gateway.bat  # Gateway service
stop.bat           # Stop all services
```

## Auto-start at Login

During installation, add `-AutoStart` to register a Task Scheduler task:
```powershell
.\setup.ps1 -AutoStart
```

Or register manually after install:
```powershell
schtasks /create /tn "HermesAgent" /tr "C:\Program Files\HermesAgent\start-gateway.bat" /sc ONLOGON /f
```

To remove:
```powershell
schtasks /delete /tn "HermesAgent" /f
```

## Configuration

Config files are stored in `%USERPROFILE%\.hermes\`:
- `config.yaml` — model, toolsets, providers
- `.env` — API keys

## Custom Install Location

```powershell
.\setup.ps1 -InstallDir "D:\Apps\HermesAgent" -HermesHome "D:\Apps\HermesAgent\config"
```

## Skip Steps

```powershell
.\setup.ps1 -SkipNode       # Node.js already installed
.\setup.ps1 -SkipPython     # Python already installed
.\setup.ps1 -SkipFrontendBuild  # Frontend already built
```

## Uninstall

1. Stop all services: `stop.bat`
2. Delete the install folder
3. Remove shortcuts from Start Menu and Desktop
4. (Optional) Remove Task Scheduler task: `schtasks /delete /tn "HermesAgent" /f`
5. (Optional) Remove config: `Remove-Item -Recurse "$env:USERPROFILE\.hermes"`

## Ports Used

| Port | Service |
|------|---------|
| 8000 | Backend API (FastAPI) |
| 5173 | Frontend dev server |

## Build from Source

If you have Python + Node.js installed already:

```cmd
:: Python setup
python -m venv venv
venv\Scripts\pip install -r requirements.txt
venv\Scripts\pip install fastapi uvicorn httpx websockets pyyaml python-dotenv

:: Frontend
cd web-ui\frontend
npm install --legacy-peer-deps
npm run build

:: Run
venv\Scripts\python -m hermes_cli.main gateway run
```
