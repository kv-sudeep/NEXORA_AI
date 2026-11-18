"""
intent.py — JARVIS Intent Prediction & Auto-Learning Engine
Tracks user interactions, predicts next actions based on habits and temporal patterns.
"""
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

INTENT_FILE = Path(__file__).parent.parent / "data" / "intents.json"


def _load_intents() -> Dict[str, Any]:
    if INTENT_FILE.exists():
        try:
            return json.loads(INTENT_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"command_frequencies": {}, "hourly_habits": {}}


def _save_intents(data: Dict[str, Any]) -> None:
    INTENT_FILE.parent.mkdir(parents=True, exist_ok=True)
    INTENT_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


class IntentPredictor:
    def __init__(self):
        self.data = _load_intents()

    def record_intent(self, command_type: str, raw_input: str) -> None:
        """Record an executed command intent for frequency & temporal tracking."""
        hour_str = str(datetime.now().hour)
        
        # Increment frequency
        freq = self.data["command_frequencies"].get(command_type, 0)
        self.data["command_frequencies"][command_type] = freq + 1

        # Track hourly habit
        hourly = self.data["hourly_habits"].get(hour_str, {})
        hourly[command_type] = hourly.get(command_type, 0) + 1
        self.data["hourly_habits"][hour_str] = hourly

        _save_intents(self.data)

    def predict_next_action(self) -> List[Dict[str, Any]]:
        """Predict likely next user requests based on current time of day."""
        current_hour = str(datetime.now().hour)
        hourly_data = self.data["hourly_habits"].get(current_hour, {})
        
        sorted_habits = sorted(hourly_data.items(), key=lambda item: item[1], reverse=True)
        predictions = []
        for cmd, count in sorted_habits[:3]:
            predictions.append({"intent": cmd, "score": min(0.95, count * 0.2)})

        if not predictions:
            predictions = [
                {"intent": "system_status", "score": 0.8},
                {"intent": "weather", "score": 0.75},
            ]
        return predictions


intent_predictor = IntentPredictor()
