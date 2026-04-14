#!/usr/bin/env python3
"""Windows compatibility shims for Hermes Agent."""
import os
import sys
import platform
import logging
from pathlib import Path
from typing import Optional, Union

logger = logging.getLogger(__name__)

def is_windows() -> bool:
    return platform.system() == "Windows"

def get_default_shell() -> str:
    if is_windows():
        if Path(os.environ.get("ProgramFiles", "C:\\ProgramFiles"), 
                "PowerShell", "7", "pwsh.exe").exists():
            return "pwsh.exe"
        if Path(os.environ.get("SystemRoot", "C:\\Windows"), 
                "System32", "WindowsPowerShell", "v1.0", "powershell.exe").exists():
            return "powershell.exe"
        return "cmd.exe"
    return os.environ.get("SHELL", "/bin/bash")

def safe_path(path: Union[str, Path]) -> Path:
    p = Path(path).expanduser().resolve()
    if is_windows():
        try:
            str_path = str(p)
            if len(str_path) > 260 and not str_path.startswith("\\\\?\\"):
                return Path(f"\\\\?\\{str_path}")
        except Exception as e:
            logger.debug(f"Long path handling failed: {e}")
    return p

def safe_chmod(path: Path, mode: int) -> bool:
    if not is_windows():
        try:
            os.chmod(path, mode)
            return True
        except OSError as e:
            logger.warning(f"chmod failed on {path}: {e}")
            return False
    return True

def enable_virtual_terminal() -> bool:
    if not is_windows():
        return True
    try:
        import ctypes
        from ctypes import wintypes
        STD_OUTPUT_HANDLE = -11
        ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004
        handle = ctypes.windll.kernel32.GetStdHandle(STD_OUTPUT_HANDLE)
        if handle == -1:
            return False
        mode = wintypes.DWORD()
        if not ctypes.windll.kernel32.GetConsoleMode(handle, ctypes.byref(mode)):
            return False
        mode.value |= ENABLE_VIRTUAL_TERMINAL_PROCESSING
        return bool(ctypes.windll.kernel32.SetConsoleMode(handle, mode))
    except Exception as e:
        logger.debug(f"Virtual terminal enable failed: {e}")
        return False

def get_hermes_home() -> Path:
    env_val = os.environ.get("HERMES_HOME")
    if env_val:
        return safe_path(env_val)
    if is_windows():
        appdata = os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming")
        return safe_path(Path(appdata) / "HermesAgent")
    return safe_path(Path.home() / ".hermes")

_win_stdout_wrapper = None  # held to prevent premature GC
_win_stderr_wrapper = None

def setup_windows_env():
    if not is_windows():
        return
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    os.environ.setdefault("PYTHONUTF8", "1")
    try:
        import subprocess
        subprocess.run(["chcp", "65001"], capture_output=True, check=False)
    except Exception:
        pass
    # Wrap sys.stdout/stderr so Unicode chars print correctly in GBK consoles.
    # Keep module-level references so they are never garbage-collected and
    # close the underlying file descriptors.
    global _win_stdout_wrapper, _win_stderr_wrapper
    try:
        import io
        if sys.stdout is not None and not isinstance(sys.stdout, io.TextIOWrapper):
            _win_stdout_wrapper = io.TextIOWrapper(
                sys.stdout.buffer, encoding="utf-8", errors="replace",
            )
            _win_stdout_wrapper.extra_flags = sys.stdout.extra_flags if hasattr(sys.stdout, "extra_flags") else 0
            sys.stdout = _win_stdout_wrapper
        if sys.stderr is not None and not isinstance(sys.stderr, io.TextIOWrapper):
            _win_stderr_wrapper = io.TextIOWrapper(
                sys.stderr.buffer, encoding="utf-8", errors="replace",
            )
            _win_stderr_wrapper.extra_flags = sys.stderr.extra_flags if hasattr(sys.stderr, "extra_flags") else 0
            sys.stderr = _win_stderr_wrapper
    except Exception:
        pass
    logger.info("Windows environment configured")

def get_pty_backend():
    if is_windows():
        try:
            import winpty
            return "pywinpty"
        except ImportError:
            logger.warning("pywinpty not installed; terminal tool may have limited functionality")
            return "subprocess"
    else:
        try:
            import ptyprocess
            return "ptyprocess"
        except ImportError:
            return "native"