"""
memory.py — JARVIS Long-Term & Short-Term Memory Manager
Handles persistent fact storage, user preferences, and rolling conversation history.
"""
import json
import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

MEMORY_FILE = Path(__file__).parent.parent / "data" / "memory.json"
MAX_SHORT_TERM_TURNS = 10


def _load_memory_data() -> Dict[str, Any]:
    if MEMORY_FILE.exists():
        try:
            return json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
        except Exception as e:
            logger.warning("Failed to load memory file: %s", e)
    return {
        "user_facts": {},
        "preferences": {
            "owner_name": "Sir",
            "language": "en-US",
            "personality": "jarvis",
            "privacy_mode": False,
        },
        "history": [],
        "learned_patterns": [],
    }


def _save_memory_data(data: Dict[str, Any]) -> None:
    MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    MEMORY_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


class MemoryManager:
    def __init__(self):
        self.data = _load_memory_data()

    def add_fact(self, key: str, value: str) -> None:
        """Store a long-term fact about the user or system."""
        self.data["user_facts"][key.lower().strip()] = {
            "value": value,
            "updated_at": time.time(),
        }
        _save_memory_data(self.data)
        logger.info("Memory added fact: %s -> %s", key, value)

    def get_fact(self, key: str) -> Optional[str]:
        """Retrieve a specific long-term fact."""
        item = self.data["user_facts"].get(key.lower().strip())
        return item["value"] if item else None

    def list_facts(self) -> Dict[str, str]:
        """List all stored long-term facts."""
        return {k: v["value"] for k, v in self.data["user_facts"].items()}

    def remove_fact(self, key: str) -> bool:
        """Remove a stored fact."""
        k = key.lower().strip()
        if k in self.data["user_facts"]:
            del self.data["user_facts"][k]
            _save_memory_data(self.data)
            return True
        return False

    def add_conversation_turn(self, role: str, text: str, meta: Optional[Dict] = None) -> None:
        """Add a role turn (user/jarvis) to short-term history."""
        turn = {
            "role": role,
            "text": text,
            "timestamp": time.time(),
            "meta": meta or {},
        }
        self.data["history"].append(turn)
        # Retain last 50 turns in log, prune to short-term context
        if len(self.data["history"]) > 50:
            self.data["history"] = self.data["history"][-50:]
        _save_memory_data(self.data)

    def get_short_term_context(self, limit: int = MAX_SHORT_TERM_TURNS) -> List[Dict[str, Any]]:
        """Get recent turns for short-term LLM context."""
        return self.data["history"][-limit:]

    def get_preference(self, key: str, default: Any = None) -> Any:
        return self.data["preferences"].get(key, default)

    def set_preference(self, key: str, value: Any) -> None:
        self.data["preferences"][key] = value
        _save_memory_data(self.data)

    def get_memory_summary(self) -> str:
        """Format a summary string of memory for LLM system context."""
        facts = [f"- {k.title()}: {v['value']}" for k, v in self.data["user_facts"].items()]
        facts_str = "\n".join(facts) if facts else "No specific facts recorded yet."
        return f"Stored User Knowledge:\n{facts_str}"


# Global instance
memory_manager = MemoryManager()

# Public alias for external callers (e.g. history clear route)
_save_memory = _save_memory_data
