"""
test_brain.py — Unit tests for JARVIS 2.0 Brain & Multi-Agent Subsystems
"""
import pytest
from brain.memory import MemoryManager
from brain.personality import PersonalityEngine
from brain.emotion import analyze_emotion
from brain.intent import IntentPredictor
from brain.knowledge_graph import KnowledgeGraph
from brain.agents import MultiAgentOrchestrator
from brain.explainable import format_reasoning_trace


def test_memory_manager():
    mem = MemoryManager()
    mem.add_fact("favorite hero", "Iron Man")
    assert mem.get_fact("favorite hero") == "Iron Man"
    assert "favorite hero" in mem.list_facts()
    mem.remove_fact("favorite hero")
    assert mem.get_fact("favorite hero") is None


def test_personality_engine():
    p = PersonalityEngine("jarvis")
    persona = p.get_active_persona()
    assert persona["name"] == "JARVIS"
    p.set_persona("friday")
    assert p.get_active_persona()["name"] == "FRIDAY"


def test_emotion_analysis():
    emo_calm = analyze_emotion("Status report please")
    assert emo_calm["emotion"] == "Calm"

    emo_pos = analyze_emotion("Great job, awesome work!")
    assert emo_pos["emotion"] == "Positive"

    emo_urg = analyze_emotion("Emergency! Quick lockdown now!")
    assert emo_urg["emotion"] == "Urgent"


def test_knowledge_graph():
    kg = KnowledgeGraph()
    kg.add_node("Mark 85", "Suit", {"power": "100%"})
    kg.add_edge("Tony Stark", "BUILT", "Mark 85")
    res = kg.query_entity("Mark 85")
    assert "Mark 85" in res["nodes"]


def test_multi_agent_orchestrator():
    orchestrator = MultiAgentOrchestrator()
    agent, res = orchestrator.route_command("app", "open notepad")
    assert agent.name in ["SystemAgent", "ResearchAgent"]
    assert res["status"] == "completed"


def test_explainable_trace():
    trace = format_reasoning_trace("open notepad", "app", "SystemAgent", {"emotion": "Calm", "confidence": 0.95})
    assert len(trace) >= 5
    assert "SystemAgent" in trace[3]
