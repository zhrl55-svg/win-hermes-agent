# Hermes Agent for Windows — Portable Edition

A standalone Windows release of [Hermes Agent](https://github.com/zhrl55-svg/win-hermes), no installer needed.

## Requirements

- **Windows 10/11**
- **Python 3.11+** ([download](https://www.python.org/downloads/))
- **Node.js 18+** (optional, only needed for Web UI)

## Quick Start

### 1. First-time setup

```
portable\setup.bat
```

This will:
- Create a local virtual environment (`portable\venv`)
- Install Hermes Agent and core dependencies
- Build the Web UI (if Node.js is installed)

> `setup.bat` only needs to be run once.

### 2. Start chatting

```
portable\hermes.bat
```

### 3. Configure your model

On first run, enter `hermes setup` from the CLI to configure your API key and model.

## Web UI (optional)

The Web UI gives you a browser-based chat interface.

```
portable\webui-install.bat   # Build the frontend (first time only, needs Node.js)
portable\webui-start.bat     # Start the backend server
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

Stop the backend:
```
portable\webui-stop.bat
```

## Files

| File | Description |
|------|-------------|
| `setup.bat` | First-time setup (creates venv, installs deps, builds web UI) |
| `hermes.bat` | Start the Hermes CLI |
| `webui-install.bat` | Install and build the Web UI (requires Node.js) |
| `webui-start.bat` | Start the Web UI backend server |
| `webui-stop.bat` | Stop the Web UI backend server |

## Features

- **Hermes CLI** — Interactive AI chat in your terminal
- **Web UI** — Browser-based chat at `http://localhost:5173`
- **Windows Task Scheduler** — Auto-start gateway at login:
  ```
  hermes gateway install
  ```
- **Shared sessions** — CLI and Web UI share the same conversation history
- **Tool ecosystem** — Code execution, web search, file tools, and more

## Updating

```powershell
cd your-hermes-folder
git pull
portable\setup.bat
```

## Uninstall

Just delete the `portable\` folder. All data (sessions, config) lives in `%USERPROFILE%\.hermes\`.
