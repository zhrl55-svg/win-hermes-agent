"""
Web UI management for Hermes.

Handles: hermes webui [install|build|serve|start|stop|status]
"""

import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
WEB_UI_ROOT = PROJECT_ROOT / "web-ui"
FRONTEND_DIR = WEB_UI_ROOT / "frontend"
BACKEND_DIR = WEB_UI_ROOT / "backend"
BACKEND_PY = BACKEND_DIR / "main.py"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _find_node_executables() -> tuple[str | None, str | None]:
    """Return (node_path, npm_path) or (None, None) if not found."""
    node = shutil.which("node")
    npm = shutil.which("npm")
    return node, npm


def _node_ok() -> bool:
    node, _ = _find_node_executables()
    return node is not None


def _backend_running() -> bool:
    """Return True if a web-ui backend process is already running."""
    patterns = [
        "uvicorn",
        "hermes_agent",
        "web-ui",
        "backend/main.py",
    ]
    try:
        if sys.platform == "win32":
            # Try wmic first; fall back to netstat for port check
            try:
                result = subprocess.run(
                    ["wmic", "process", "get", "ProcessId,CommandLine", "/FORMAT:LIST"],
                    capture_output=True, text=True, timeout=10,
                )
                for line in result.stdout.split("\n"):
                    line = line.strip()
                    if line.startswith("CommandLine="):
                        cmd = line[len("CommandLine="):]
                        if any(p in cmd for p in patterns):
                            return True
            except (OSError, FileNotFoundError):
                # wmic not available -- check if port 8000 is listening
                result = subprocess.run(
                    ["powershell", "-Command",
                     "Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -InformationLevel Quiet"],
                    capture_output=True, text=True, timeout=10,
                )
                if result.stdout.strip().lower() in ("true", "true\r"):
                    return True
        else:
            result = subprocess.run(
                ["ps", "eww", "-ax", "-o", "command="],
                capture_output=True, text=True, timeout=10,
            )
            for line in result.stdout.splitlines():
                if any(p in line for p in patterns):
                    return True
    except (OSError, subprocess.TimeoutExpired):
        pass
    return False


def _get_backend_pids() -> list[int]:
    """Return PIDs of processes listening on port 8000 (Windows fallback)."""
    pids = []
    patterns = [
        "uvicorn",
        "hermes_agent",
        "web-ui/backend/main.py",
    ]
    try:
        if sys.platform == "win32":
            # Fallback: use netstat to find PID on port 8000
            result = subprocess.run(
                ["netstat", "-ano"],
                capture_output=True, text=True, timeout=10,
            )
            for line in result.stdout.splitlines():
                if ":8000" in line and "LISTENING" in line:
                    parts = line.split()
                    if parts and parts[-1].isdigit():
                        pids.append(int(parts[-1]))
        else:
            result = subprocess.run(
                ["ps", "eww", "-ax", "-o", "pid,command="],
                capture_output=True, text=True, timeout=10,
            )
            for line in result.stdout.splitlines():
                if not line.strip() or "grep" in line:
                    continue
                parts = line.split(None, 1)
                if len(parts) != 2:
                    continue
                pid_str, cmd = parts
                if any(p in cmd for p in patterns):
                    try:
                        pids.append(int(pid_str))
                    except ValueError:
                        pass
    except (OSError, subprocess.TimeoutExpired):
        pass
    return pids


def _kill_backend() -> int:
    """Kill all web-ui backend processes. Returns count killed."""
    killed = 0
    for pid in _get_backend_pids():
        try:
            if sys.platform == "win32":
                subprocess.run(["taskkill", "/PID", str(pid), "/F"],
                               capture_output=True, timeout=10)
            else:
                os.kill(pid, 9)
            killed += 1
        except (ProcessLookupError, PermissionError, subprocess.CalledProcessError, OSError):
            pass
    return killed


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def webui_install() -> None:
    """Install frontend dependencies and build the production bundle."""
    if not _node_ok():
        print("[x] Node.js is not installed.")
        print()
        print("  Install Node.js from: https://nodejs.org/")
        print("  Then run: hermes webui install")
        return

    if not FRONTEND_DIR.exists():
        print(f"[x] Frontend directory not found: {FRONTEND_DIR}")
        return

    node_path, npm_path = _find_node_executables()
    print(f"Node: {node_path}")
    print(f"NPM:  {npm_path}")
    print()

    # Check if node_modules already exists
    node_modules = FRONTEND_DIR / "node_modules"
    if node_modules.exists():
        print("[ok] node_modules already present -- skipping npm install")
    else:
        print("Installing frontend dependencies...")
        result = subprocess.run(
            [npm_path, "install", "--legacy-peer-deps"],
            cwd=str(FRONTEND_DIR),
            timeout=300,
        )
        if result.returncode != 0:
            print(f"[x] npm install failed (exit {result.returncode})")
            return
        print("[ok] Dependencies installed")

    print()
    print("Building production bundle...")
    result = subprocess.run(
        [npm_path, "run", "build"],
        cwd=str(FRONTEND_DIR),
        timeout=180,
    )
    if result.returncode != 0:
        print(f"[x] npm run build failed (exit {result.returncode})")
        return

    dist_dir = FRONTEND_DIR / "dist"
    if dist_dir.exists():
        print(f"[ok] Production bundle built: {dist_dir}")
    else:
        print(f"[x] Build completed but dist folder not found at {dist_dir}")


def webui_serve() -> None:
    """Start the web-ui backend server (port 8000) in foreground."""
    if _backend_running():
        print("[x] A web-ui backend is already running.")
        print("  Stop it first: hermes webui stop")
        return

    if not BACKEND_PY.exists():
        print(f"[x] Backend entry point not found: {BACKEND_PY}")
        return

    # Detect python (prefer venv)
    detected = None
    for candidate in (
        PROJECT_ROOT / "venv" / "Scripts" / "python.exe",
        Path(sys.prefix) / "Scripts" / "python.exe",
    ):
        if candidate.exists():
            detected = str(candidate)
            break
    if not detected:
        detected = sys.executable

    print("Starting web-ui backend on http://127.0.0.1:8000")
    print("Press Ctrl+C to stop.")
    print()
    try:
        subprocess.run(
            [detected, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
            cwd=str(BACKEND_DIR),
        )
    except KeyboardInterrupt:
        print("\n[ok] Server stopped")


def webui_start() -> None:
    """Start the web-ui backend as a detached background process."""
    if _backend_running():
        print("[x] A web-ui backend is already running.")
        return

    if not BACKEND_PY.exists():
        print(f"[x] Backend entry point not found: {BACKEND_PY}")
        return

    # Detect python (prefer venv)
    detected = None
    for candidate in (
        PROJECT_ROOT / "venv" / "Scripts" / "python.exe",
        Path(sys.prefix) / "Scripts" / "python.exe",
    ):
        if candidate.exists():
            detected = str(candidate)
            break
    if not detected:
        detected = sys.executable

    import os as _os
    log_dir = PROJECT_ROOT / "logs"
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / "webui.log"

    try:
        if sys.platform == "win32":
            CREATE_NEW_PROCESS_GROUP = 0x0020
            DETACHED_PROCESS = 0x00000008
            subprocess.Popen(
                [detected, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
                cwd=str(BACKEND_DIR),
                stdout=open(log_file, "a"),
                stderr=subprocess.STDOUT,
                creationflags=DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP,
                env=_os.environ.copy(),
            )
        else:
            subprocess.Popen(
                [detected, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
                cwd=str(BACKEND_DIR),
                stdout=open(log_file, "a"),
                stderr=subprocess.STDOUT,
                start_new_session=True,
                env=_os.environ.copy(),
            )
        time.sleep(2)
        if _backend_running():
            print(f"[ok] Web-ui backend started on http://127.0.0.1:8000")
            print(f"  Logs: {log_file}")
        else:
            print("[x] Backend failed to start. Check logs:")
            print(f"  {log_file}")
    except Exception as e:
        print(f"[x] Failed to start backend: {e}")


def webui_stop() -> None:
    """Stop the running web-ui backend."""
    pids = _get_backend_pids()
    if not pids:
        print("No web-ui backend process found.")
        return
    killed = _kill_backend()
    if killed:
        print(f"[ok] Stopped {killed} web-ui backend process(es)")
    else:
        print("[x] Could not stop the backend process.")


def webui_status() -> None:
    """Show web-ui backend status."""
    if _backend_running():
        print("[ok] Web-ui backend is running on http://127.0.0.1:8000")
    else:
        print("[x] Web-ui backend is not running")
        print("  Start with: hermes webui start")


# ---------------------------------------------------------------------------
# CLI dispatch
# ---------------------------------------------------------------------------

def webui_command(args) -> None:
    """Dispatch webui subcommands."""
    subcmd = getattr(args, "webui_command", None)

    if subcmd == "install":
        webui_install()
    elif subcmd == "build":
        webui_install()
    elif subcmd == "serve":
        webui_serve()
    elif subcmd == "start":
        webui_start()
    elif subcmd == "stop":
        webui_stop()
    elif subcmd == "status":
        webui_status()
    else:
        # Default: status
        webui_status()
