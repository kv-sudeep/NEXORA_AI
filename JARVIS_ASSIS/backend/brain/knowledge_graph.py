"""
knowledge_graph.py — JARVIS Knowledge Graph Subsystem
Manages entities (nodes) and relations (edges) for structured knowledge lookup.
"""
import json
from pathlib import Path
from typing import Dict, List, Any

KG_FILE = Path(__file__).parent.parent / "data" / "knowledge_graph.json"


def _load_kg() -> Dict[str, Any]:
    if KG_FILE.exists():
        try:
            return json.loads(KG_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {
        "nodes": {
            "JARVIS": {"type": "AI Core", "status": "Online"},
            "Tony Stark": {"type": "Creator/Owner", "status": "Active"},
            "Stark Tower": {"type": "Location", "status": "Primary HQ"},
        },
        "edges": [
            {"source": "JARVIS", "relation": "SERVES", "target": "Tony Stark"},
            {"source": "JARVIS", "relation": "LOCATED_AT", "target": "Stark Tower"},
        ],
    }


def _save_kg(data: Dict[str, Any]) -> None:
    KG_FILE.parent.mkdir(parents=True, exist_ok=True)
    KG_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


class KnowledgeGraph:
    def __init__(self):
        self.data = _load_kg()

    def add_node(self, name: str, node_type: str, attributes: Dict[str, Any] = None) -> None:
        self.data["nodes"][name] = {"type": node_type, **(attributes or {})}
        _save_kg(self.data)

    def add_edge(self, source: str, relation: str, target: str) -> None:
        if source not in self.data["nodes"]:
            self.add_node(source, "Entity")
        if target not in self.data["nodes"]:
            self.add_node(target, "Entity")
        self.data["edges"].append({"source": source, "relation": relation, "target": target})
        _save_kg(self.data)

    def get_graph(self) -> Dict[str, Any]:
        return self.data

    def query_entity(self, entity_name: str) -> Dict[str, Any]:
        name_lower = entity_name.lower().strip()
        matched_nodes = {k: v for k, v in self.data["nodes"].items() if name_lower in k.lower()}
        matched_edges = [
            e for e in self.data["edges"]
            if name_lower in e["source"].lower() or name_lower in e["target"].lower()
        ]
        return {"nodes": matched_nodes, "edges": matched_edges}


knowledge_graph = KnowledgeGraph()
