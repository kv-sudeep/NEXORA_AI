"""
brain/reminders.py  --  JARVIS 2.0 Smart Reminders Manager
Stores time-based reminders in data/reminders.json.
"""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

_DATA_DIR = Path(__file__).parent.parent / "data"
_DATA_DIR.mkdir(parents=True, exist_ok=True)
_REMINDERS_FILE = _DATA_DIR / "reminders.json"


def _load() -> List[Dict[str, Any]]:
    if _REMINDERS_FILE.exists():
        try:
            return json.loads(_REMINDERS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return []


def _save(reminders: List[Dict[str, Any]]) -> None:
    _REMINDERS_FILE.write_text(json.dumps(reminders, indent=2, ensure_ascii=False), encoding="utf-8")


class RemindersManager:
    """Manage JARVIS smart reminders."""

    def __init__(self) -> None:
        self.reminders: List[Dict[str, Any]] = _load()

    def add(self, message: str, due_iso: str, label: str = "") -> Dict[str, Any]:
        reminder = {
            "id": str(uuid.uuid4())[:8],
            "message": message,
            "due": due_iso,
            "label": label or message[:30],
            "created": datetime.now().isoformat(),
            "triggered": False,
        }
        self.reminders.append(reminder)
        _save(self.reminders)
        return reminder

    def list_all(self) -> List[Dict[str, Any]]:
        self.reminders = _load()
        return self.reminders

    def list_pending(self) -> List[Dict[str, Any]]:
        self.reminders = _load()
        return [r for r in self.reminders if not r.get("triggered")]

    def delete(self, reminder_id: str) -> bool:
        self.reminders = _load()
        before = len(self.reminders)
        self.reminders = [r for r in self.reminders if r["id"] != reminder_id]
        _save(self.reminders)
        return len(self.reminders) < before

    def check_due(self) -> List[Dict[str, Any]]:
        now = datetime.now()
        due: List[Dict[str, Any]] = []
        self.reminders = _load()
        for r in self.reminders:
            if r.get("triggered"):
                continue
            try:
                remind_at = datetime.fromisoformat(r["due"])
                if remind_at <= now + timedelta(seconds=30):
                    due.append(r)
                    r["triggered"] = True
            except Exception:
                pass
        _save(self.reminders)
        return due

    def parse_natural_time(self, time_str: str) -> Optional[str]:
        t = time_str.lower().strip()
        now = datetime.now()

        # "in X minutes/hours"
        m = re.match(r"in\s+(\d+)\s*(minute|min|hour|hr)s?", t)
        if m:
            amount = int(m.group(1))
            unit = m.group(2)
            delta = timedelta(minutes=amount) if unit in ("minute", "min") else timedelta(hours=amount)
            return (now + delta).isoformat()

        # "tomorrow [at] X"
        if "tomorrow" in t:
            base = (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
            t_clean = re.sub(r"tomorrow", "", t).replace("at", "").strip()
            parsed = self._parse_time_of_day(t_clean, base)
            if parsed:
                return parsed.isoformat()

        # "at X PM" / "X PM"
        parsed = self._parse_time_of_day(t.replace("at", "").strip(), now)
        if parsed:
            if parsed < now:
                parsed += timedelta(days=1)
            return parsed.isoformat()

        return None

    def _parse_time_of_day(self, t: str, base: datetime) -> Optional[datetime]:
        t = t.strip()
        m = re.match(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", t, re.IGNORECASE)
        if not m:
            return None
        hour = int(m.group(1))
        minute = int(m.group(2)) if m.group(2) else 0
        ampm = (m.group(3) or "").lower()
        if ampm == "pm" and hour != 12:
            hour += 12
        elif ampm == "am" and hour == 12:
            hour = 0
        try:
            return base.replace(hour=hour, minute=minute, second=0, microsecond=0)
        except Exception:
            return None
