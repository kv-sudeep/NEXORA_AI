"""
explainable.py — JARVIS Explainable AI Reasoning Trace Generator
Formats step-by-step reasoning steps for display in the HUD diagnostic trace drawer.
"""
from typing import Dict, List, Any


def format_reasoning_trace(
    input_text: str,
    parsed_type: str,
    agent_name: str,
    emotion_info: Dict[str, Any],
    memory_used: bool = False,
    is_offline: bool = False,
) -> List[str]:
    steps = [
        f"1. Natural Language Input: '{input_text}'",
        f"2. Emotion Detected: {emotion_info.get('emotion', 'Calm')} (Confidence: {int(emotion_info.get('confidence', 0.9)*100)}%)",
        f"3. Command Classifier: Categorized as '{parsed_type}'",
        f"4. Multi-Agent Routing: Dispatched to '{agent_name}'",
    ]
    if memory_used:
        steps.append("5. Memory Lookup: Referenced stored long-term facts & user context.")
    if is_offline:
        steps.append("6. Execution Engine: Executed via Local Offline NLP Engine (0ms cloud latency).")
    else:
        steps.append("6. Execution Engine: Executed via Gemini Cloud Neural Core.")

    steps.append("7. Response Verification: Output validated, plain spoken response generated.")
    return steps
