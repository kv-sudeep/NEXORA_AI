"""
wellbeing.py — JARVIS Digital Wellbeing & App Control
App timers, locking, usage tracking, digital wellbeing reports, notifications
"""
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional

import psutil

USAGE_FILE   = Path(__file__).parent.parent / "data" / "app_usage.json"
TIMERS_FILE  = Path(__file__).parent.parent / "data" / "app_timers.json"
LOCKED_APPS  = set()


# ── App Timers ────────────────────────────────────────────────────────────────
def _load_timers() -> dict:
    if TIMERS_FILE.exists():
        try:
            return json.loads(TIMERS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}

def _save_timers(data: dict) -> None:
    TIMERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    TIMERS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")

def set_app_timer(app_name: str, minutes: int) -> dict:
    """Limit an app to `minutes` of usage per day."""
    timers = _load_timers()
    timers[app_name.lower()] = {
        "app": app_name,
        "limit_minutes": minutes,
        "used_minutes": timers.get(app_name.lower(), {}).get("used_minutes", 0),
        "date": datetime.now().strftime("%Y-%m-%d"),
    }
    _save_timers(timers)
    return {"success": True, "app": app_name, "limit_minutes": minutes}

def get_app_timers() -> dict:
    return {"timers": _load_timers()}

def check_app_timers() -> list:
    """Check which apps have exceeded their time limit. Returns list of violations."""
    timers = _load_timers()
    today = datetime.now().strftime("%Y-%m-%d")
    violations = []
    usage = _load_usage()
    for app_key, t in timers.items():
        if t.get("date") != today:
            # Reset daily
            t["used_minutes"] = 0
            t["date"] = today
        used_sec = usage.get(app_key, 0)
        used_min = used_sec / 60
        if used_min >= t["limit_minutes"]:
            violations.append({
                "app": t["app"],
                "limit_minutes": t["limit_minutes"],
                "used_minutes": round(used_min, 1),
            })
    if violations:
        _save_timers(timers)
    return violations


# ── App Locking ───────────────────────────────────────────────────────────────
def lock_app(app_name: str) -> dict:
    """Add app to locked set and kill if currently running."""
    LOCKED_APPS.add(app_name.lower())
    killed = []
    name_lower = app_name.lower().replace(".exe", "")
    for proc in psutil.process_iter(["pid", "name"]):
        try:
            pname = (proc.info["name"] or "").lower().replace(".exe", "")
            if name_lower in pname:
                proc.terminate()
                killed.append(proc.info["name"])
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return {
        "success": True,
        "locked": app_name,
        "killed": killed,
        "message": f"'{app_name}' is now locked and will be closed if opened.",
    }

def unlock_app(app_name: str) -> dict:
    LOCKED_APPS.discard(app_name.lower())
    return {"success": True, "message": f"'{app_name}' unlocked."}

def get_locked_apps() -> list:
    return list(LOCKED_APPS)

def enforce_app_locks() -> list:
    """Kill any locked apps that managed to start. Call periodically."""
    closed = []
    for app_name in list(LOCKED_APPS):
        for proc in psutil.process_iter(["pid", "name"]):
            try:
                if app_name in (proc.info["name"] or "").lower():
                    proc.terminate()
                    closed.append(proc.info["name"])
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    return closed


# ── Usage Tracking ────────────────────────────────────────────────────────────
def _load_usage() -> dict:
    if USAGE_FILE.exists():
        try:
            return json.loads(USAGE_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}

def get_screen_time(top_n: int = 10) -> dict:
    """Return top apps by usage time (in seconds/minutes)."""
    usage = _load_usage()
    sorted_apps = sorted(usage.items(), key=lambda x: x[1], reverse=True)[:top_n]
    apps = [
        {
            "app": k,
            "seconds": v,
            "minutes": round(v / 60, 1),
            "hours": round(v / 3600, 2),
        }
        for k, v in sorted_apps
    ]
    total_sec = sum(usage.values())
    return {
        "apps": apps,
        "total_seconds": total_sec,
        "total_hours": round(total_sec / 3600, 2),
        "date": datetime.now().strftime("%Y-%m-%d"),
    }


# ── Digital Wellbeing Report ──────────────────────────────────────────────────
def digital_wellbeing_report() -> dict:
    """Generate a daily wellbeing summary."""
    screen_time = get_screen_time(top_n=5)
    timers = _load_timers()
    violations = check_app_timers()
    battery_info = {}
    try:
        import psutil
        b = psutil.sensors_battery()
        if b:
            battery_info = {"percent": round(b.percent), "plugged": b.power_plugged}
    except Exception:
        pass

    total_hrs = screen_time.get("total_hours", 0)
    health_score = max(0, 100 - int(total_hrs * 8))  # Deduct 8 pts per hour

    advice = []
    if total_hrs > 6:
        advice.append("You have been on-screen for over 6 hours. Consider a break.")
    if total_hrs > 3:
        advice.append("Take the 20-20-20 rule: every 20 mins, look 20 feet away for 20 seconds.")
    if violations:
        advice.append(f"{len(violations)} app(s) exceeded their time limits today.")
    if battery_info.get("percent", 100) < 20 and not battery_info.get("plugged"):
        advice.append("Battery below 20%. Please plug in your charger.")
    if not advice:
        advice.append("Great job! Your screen time looks healthy today.")

    return {
        "health_score": health_score,
        "total_screen_hours": total_hrs,
        "top_apps": screen_time.get("apps", []),
        "timer_violations": violations,
        "battery": battery_info,
        "advice": advice,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }


# ── Windows Notifications ─────────────────────────────────────────────────────
def send_notification(title: str, message: str, duration: int = 5) -> dict:
    """Send a Windows toast notification."""
    try:
        from win10toast import ToastNotifier
        toaster = ToastNotifier()
        toaster.show_toast(title, message, duration=duration, threaded=True)
        return {"success": True, "title": title, "message": message}
    except Exception as e:
        # PowerShell fallback
        try:
            script = f"""
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$template.SelectSingleNode('//text[@id=1]').InnerText = '{title[:50]}'
$template.SelectSingleNode('//text[@id=2]').InnerText = '{message[:100]}'
$toast = [Windows.UI.Notifications.ToastNotification]::new($template)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('JARVIS').Show($toast)
"""
            import subprocess
            subprocess.run(["powershell", "-Command", script], capture_output=True, timeout=5)
            return {"success": True, "title": title, "message": message}
        except Exception as e2:
            return {"success": False, "message": f"{e} | {e2}"}


def clear_all_notifications() -> dict:
    try:
        script = """
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.UI.Notifications.ToastNotificationManager]::History.Clear('JARVIS')
"""
        import subprocess
        subprocess.run(["powershell", "-Command", script], capture_output=True, timeout=5)
        return {"success": True, "message": "All JARVIS notifications cleared"}
    except Exception as e:
        return {"success": False, "message": str(e)}
