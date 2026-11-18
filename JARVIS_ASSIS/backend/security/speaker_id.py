"""
speaker_id.py — JARVIS Speaker Identification Module
Identifies and verifies speaker identity using audio MFCC embeddings.
"""
import logging
from typing import Dict, Any, Tuple
from security.voice import verify_voice, RECORD_DURATION

logger = logging.getLogger(__name__)


def identify_speaker(reference_mfcc_path: str = "./data/voice_samples/reference_mfcc.npy") -> Dict[str, Any]:
    """
    Perform live speaker identification against recorded owner voice profile.
    """
    is_match, score = verify_voice(reference_mfcc_path)
    return {
        "speaker_identified": "Sir" if is_match else "Unknown Speaker",
        "confidence": score,
        "is_owner": is_match,
        "threshold": 0.95,
    }
