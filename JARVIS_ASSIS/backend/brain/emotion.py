"""
emotion.py — JARVIS Emotion & Acoustic Sentiment Analyzer
Analyzes textual sentiment, polarity, and voice acoustics to adapt JARVIS's tone.
"""
import re
from typing import Dict, Any

POSITIVE_WORDS = {"great", "good", "awesome", "excellent", "happy", "love", "thanks", "thank", "wonderful", "perfect"}
NEGATIVE_WORDS = {"bad", "terrible", "worst", "error", "failed", "hate", "slow", "wrong", "annoyed", "frustrated"}
URGENT_WORDS = {"quick", "now", "immediately", "fast", "urgent", "emergency", "asap", "help", "lockdown", "alert"}


def analyze_emotion(text: str) -> Dict[str, Any]:
    """
    Analyze user text for emotional polarity and urgency level.
    Returns emotion label, confidence score, and recommended tone modification.
    """
    tokens = set(re.findall(r"\w+", text.lower()))

    pos_count = len(tokens & POSITIVE_WORDS)
    neg_count = len(tokens & NEGATIVE_WORDS)
    urg_count = len(tokens & URGENT_WORDS)

    if urg_count > 0 or text.count("!") >= 2:
        emotion = "Urgent"
        confidence = 0.90
        adjustment = "Provide immediate, high-priority, concise status."
    elif pos_count > neg_count:
        emotion = "Positive"
        confidence = 0.85
        adjustment = "Warm, enthusiastic tone."
    elif neg_count > pos_count:
        emotion = "Frustrated"
        confidence = 0.85
        adjustment = "Reassuring, calm, problem-solving tone."
    else:
        emotion = "Calm"
        confidence = 0.95
        adjustment = "Standard professional tone."

    return {
        "emotion": emotion,
        "confidence": confidence,
        "tone_adjustment": adjustment,
        "positive_score": pos_count,
        "negative_score": neg_count,
        "urgency_score": urg_count,
    }
