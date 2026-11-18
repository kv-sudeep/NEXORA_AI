"""
automation.py — JARVIS Automation Engine
Routines, Gestures, Auto-Reply, Spam Detection, Emergency SOS, Location Sharing
"""
import json
import os
import subprocess
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

ROUTINES_FILE = Path(__file__).parent.parent / "data" / "routines.json"
AUTO_REPLY_FILE = Path(__file__).parent.parent / "data" / "auto_replies.json"

# ── Spam Detection ─────────────────────────────────────────────────────────────
SPAM_KEYWORDS = [
    "win a prize", "you have won", "click here now", "limited time offer",
    "act now", "free money", "earn $$", "guaranteed income", "no risk",
    "congratulations you", "claim your reward", "ur account has been",
    "verify your account", "confirm your details", "account suspended",
    "bitcoin investment", "crypto profit", "100% guaranteed",
]

def check_spam(text: str) -> dict:
    text_lower = text.lower()
    hits = [kw for kw in SPAM_KEYWORDS if kw in text_lower]
    score = min(1.0, len(hits) / 3.0)
    return {
        "is_spam": score > 0.3,
        "confidence": round(score, 2),
        "triggers": hits,
        "verdict": "SPAM" if score > 0.3 else ("SUSPICIOUS" if score > 0 else "CLEAN"),
    }


# ── Auto Reply ────────────────────────────────────────────────────────────────
def _load_auto_replies() -> dict:
    if AUTO_REPLY_FILE.exists():
        try:
            return json.loads(AUTO_REPLY_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {
        "busy": "I am currently busy. JARVIS will respond on my behalf shortly.",
        "away": "I am away right now. I will get back to you soon.",
        "default": "Thank you for your message. I will respond shortly.",
    }

def _save_auto_replies(replies: dict) -> None:
    AUTO_REPLY_FILE.parent.mkdir(parents=True, exist_ok=True)
    AUTO_REPLY_FILE.write_text(json.dumps(replies, indent=2), encoding="utf-8")

def get_auto_replies() -> dict:
    return _load_auto_replies()

def set_auto_reply(key: str, message: str) -> dict:
    replies = _load_auto_replies()
    replies[key] = message
    _save_auto_replies(replies)
    return {"success": True, "key": key, "message": message}

def get_auto_reply(key: str = "default") -> str:
    return _load_auto_replies().get(key, _load_auto_replies().get("default", ""))


# ── Automation Routines ────────────────────────────────────────────────────────
@dataclass
class RoutineStep:
    action: str          # open_app, close_app, set_volume, wait, type_text, run_command, open_url
    params: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Routine:
    name: str
    steps: List[RoutineStep]
    trigger: str = ""    # optional wake phrase
    created: str = field(default_factory=lambda: datetime.now().isoformat())
    last_run: str = ""

def _load_routines() -> Dict[str, dict]:
    if ROUTINES_FILE.exists():
        try:
            return json.loads(ROUTINES_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}

def _save_routines(data: dict) -> None:
    ROUTINES_FILE.parent.mkdir(parents=True, exist_ok=True)
    ROUTINES_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")

def add_routine(name: str, steps: List[dict], trigger: str = "") -> dict:
    routines = _load_routines()
    routines[name.lower()] = {
        "name": name,
        "steps": steps,
        "trigger": trigger,
        "created": datetime.now().isoformat(),
        "last_run": "",
    }
    _save_routines(routines)
    return {"success": True, "name": name, "steps_count": len(steps)}

def list_routines() -> list:
    return list(_load_routines().values())

def delete_routine(name: str) -> dict:
    routines = _load_routines()
    key = name.lower()
    if key in routines:
        del routines[key]
        _save_routines(routines)
        return {"success": True, "message": f"Deleted routine '{name}'"}
    return {"success": False, "message": f"Routine '{name}' not found"}

def run_routine(name: str) -> dict:
    """Execute a named automation routine step-by-step."""
    from system.hardware_controls import set_volume, set_brightness
    from system.app_manager import close_app
    import webbrowser, pyautogui

    routines = _load_routines()
    key = name.lower()
    routine = routines.get(key)
    if not routine:
        return {"success": False, "message": f"Routine '{name}' not found"}

    results = []
    for i, step in enumerate(routine.get("steps", [])):
        action = step.get("action", "")
        params = step.get("params", {})
        try:
            if action == "open_app":
                subprocess.Popen(params.get("app", "notepad"))
                results.append(f"Step {i+1}: Opened {params.get('app')}")
            elif action == "close_app":
                close_app(params.get("app", ""))
                results.append(f"Step {i+1}: Closed {params.get('app')}")
            elif action == "set_volume":
                set_volume(int(params.get("level", 50)))
                results.append(f"Step {i+1}: Volume → {params.get('level')}%")
            elif action == "set_brightness":
                set_brightness(int(params.get("level", 70)))
                results.append(f"Step {i+1}: Brightness → {params.get('level')}%")
            elif action == "wait":
                time.sleep(float(params.get("seconds", 1)))
                results.append(f"Step {i+1}: Waited {params.get('seconds')}s")
            elif action == "type_text":
                pyautogui.write(params.get("text", ""), interval=0.05)
                results.append(f"Step {i+1}: Typed text")
            elif action == "open_url":
                webbrowser.open(params.get("url", ""))
                results.append(f"Step {i+1}: Opened URL")
            elif action == "run_command":
                subprocess.Popen(params.get("command", ""), shell=True)
                results.append(f"Step {i+1}: Ran command")
            elif action == "screenshot":
                from system.screen_tools import take_screenshot
                take_screenshot()
                results.append(f"Step {i+1}: Screenshot taken")
            else:
                results.append(f"Step {i+1}: Unknown action '{action}' — skipped")
        except Exception as e:
            results.append(f"Step {i+1} ERROR: {str(e)}")

    routines[key]["last_run"] = datetime.now().isoformat()
    _save_routines(routines)
    return {"success": True, "routine": name, "steps_executed": len(results), "log": results}


# ── Emergency SOS ──────────────────────────────────────────────────────────────
def emergency_sos(phone: str = "", message: str = "") -> dict:
    """
    Lock the workstation, optionally send SMS via Twilio.
    """
    results = {}

    # 1. Lock workstation immediately
    try:
        subprocess.run(["rundll32.exe", "user32.dll,LockWorkStation"])
        results["lock"] = "Workstation locked"
    except Exception as e:
        results["lock"] = f"Lock failed: {e}"

    # 2. Send SMS if Twilio configured
    if phone:
        try:
            from twilio.rest import Client
            account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
            auth_token  = os.getenv("TWILIO_AUTH_TOKEN", "")
            from_number = os.getenv("TWILIO_FROM", "")
            if account_sid and auth_token and from_number:
                sos_msg = message or "EMERGENCY SOS — JARVIS has been activated. This device has been locked."
                client = Client(account_sid, auth_token)
                client.messages.create(body=sos_msg, from_=from_number, to=phone)
                results["sms"] = f"SOS SMS sent to {phone}"
            else:
                results["sms"] = "Twilio not configured — SMS not sent"
        except Exception as e:
            results["sms"] = f"SMS failed: {e}"
    else:
        results["sms"] = "No emergency contact specified"

    return {"success": True, "actions": results,
            "message": "Emergency SOS activated. Workstation secured."}


# ── Location Sharing ──────────────────────────────────────────────────────────
def share_location() -> dict:
    from system.hardware_controls import get_location_ip
    loc = get_location_ip()
    if loc.get("available"):
        url = loc.get("share_url", "")
        return {
            "success": True,
            "location": loc,
            "share_url": url,
            "message": f"Location: {loc.get('city')}, {loc.get('region')}, {loc.get('country')}. Map: {url}",
        }
    return {"success": False, "message": loc.get("message", "Location unavailable")}


# ── Gesture Shortcuts ─────────────────────────────────────────────────────────
# Gesture → command mapping (stored in memory)
_gesture_map: dict = {}

def set_gesture(gesture_name: str, command: str) -> dict:
    """Map a gesture name to a JARVIS command string."""
    _gesture_map[gesture_name.lower()] = command
    return {"success": True, "gesture": gesture_name, "command": command}

def get_gestures() -> dict:
    return {"gestures": _gesture_map}

def trigger_gesture(gesture_name: str) -> Optional[str]:
    return _gesture_map.get(gesture_name.lower())
