"""
app_manager.py — JARVIS App Management System
Open, Close, Install, Uninstall, Update apps + usage tracking
"""
import os
import subprocess
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import psutil

# ── App Usage Tracker ────────────────────────────────────────────────────────
_app_usage: Dict[str, float] = {}   # {proc_name: total_seconds}
_app_timers: Dict[str, float] = {}  # {proc_name: allowed_seconds}
_usage_start: Dict[str, float] = {} # {proc_name: start_epoch}
_USAGE_FILE = Path(__file__).parent.parent / "data" / "app_usage.json"


def list_running_apps() -> List[dict]:
    """Return list of running user-visible apps with PID and memory."""
    seen = set()
    apps = []
    for proc in psutil.process_iter(["pid", "name", "memory_info", "cpu_percent", "status"]):
        try:
            name = proc.info["name"]
            if name and name.lower() not in seen and name.endswith(".exe"):
                seen.add(name.lower())
                apps.append({
                    "name": name,
                    "pid": proc.info["pid"],
                    "memory_mb": round((proc.info["memory_info"].rss if proc.info["memory_info"] else 0) / 1024 / 1024, 1),
                    "cpu_percent": proc.info["cpu_percent"] or 0.0,
                    "status": proc.info["status"],
                })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return sorted(apps, key=lambda x: x["memory_mb"], reverse=True)[:40]


def close_app(name: str) -> dict:
    """Kill all processes matching the app name (case-insensitive)."""
    name_lower = name.lower().replace(".exe", "")
    killed = []
    for proc in psutil.process_iter(["pid", "name"]):
        try:
            pname = (proc.info["name"] or "").lower().replace(".exe", "")
            if name_lower in pname:
                proc.terminate()
                killed.append(proc.info["name"])
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    if killed:
        return {"success": True, "killed": killed, "message": f"Closed: {', '.join(set(killed))}"}
    return {"success": False, "message": f"No running process found matching '{name}'"}


def install_app(name: str) -> dict:
    """Install an application using winget."""
    try:
        result = subprocess.run(
            ["winget", "install", "--id", name, "-e", "--accept-package-agreements",
             "--accept-source-agreements", "--silent"],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            return {"success": True, "message": f"Successfully installed: {name}"}
        return {"success": False, "message": result.stdout + result.stderr}
    except FileNotFoundError:
        return {"success": False, "message": "winget not found. Install Windows Package Manager."}
    except subprocess.TimeoutExpired:
        return {"success": False, "message": "Installation timed out. It may still be running."}
    except Exception as e:
        return {"success": False, "message": str(e)}


def uninstall_app(name: str) -> dict:
    """Uninstall an application using winget."""
    try:
        result = subprocess.run(
            ["winget", "uninstall", "--name", name, "-e", "--silent"],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            return {"success": True, "message": f"Successfully uninstalled: {name}"}
        return {"success": False, "message": result.stdout + result.stderr}
    except FileNotFoundError:
        return {"success": False, "message": "winget not found."}
    except Exception as e:
        return {"success": False, "message": str(e)}


def update_apps(app_name: Optional[str] = None) -> dict:
    """Update all apps or a specific one via winget."""
    try:
        cmd = ["winget", "upgrade", "--silent", "--accept-package-agreements",
               "--accept-source-agreements"]
        if app_name:
            cmd += ["--name", app_name]
        else:
            cmd.append("--all")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        return {
            "success": result.returncode == 0,
            "message": result.stdout[:500] if result.stdout else "Update process initiated.",
        }
    except FileNotFoundError:
        return {"success": False, "message": "winget not found."}
    except Exception as e:
        return {"success": False, "message": str(e)}


def search_winget(query: str) -> list:
    """Search available apps via winget."""
    try:
        result = subprocess.run(
            ["winget", "search", query, "--accept-source-agreements"],
            capture_output=True, text=True, timeout=30
        )
        lines = result.stdout.strip().splitlines()
        return [l for l in lines if l.strip() and not l.startswith("-")][:15]
    except Exception as e:
        return [f"Error: {str(e)}"]


def get_app_usage_report() -> dict:
    """Return usage report grouped by app."""
    import json
    try:
        if _USAGE_FILE.exists():
            data = json.loads(_USAGE_FILE.read_text(encoding="utf-8"))
        else:
            data = {}
        return {"usage": data, "count": len(data)}
    except Exception:
        return {"usage": {}, "count": 0}


def record_app_usage_tick() -> None:
    """Tick function — call periodically to record which apps are open."""
    import json
    current_names = set()
    for proc in psutil.process_iter(["name"]):
        try:
            if proc.info["name"] and proc.info["name"].endswith(".exe"):
                current_names.add(proc.info["name"].lower())
        except Exception:
            continue

    now = time.time()
    try:
        if _USAGE_FILE.exists():
            saved = json.loads(_USAGE_FILE.read_text(encoding="utf-8"))
        else:
            saved = {}
        for name in current_names:
            saved[name] = saved.get(name, 0) + 60  # Add 60s per tick
        _USAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
        _USAGE_FILE.write_text(json.dumps(saved, indent=2), encoding="utf-8")
    except Exception:
        pass
