import { useState, useCallback, useEffect } from "react";

const BACKEND = "";

export interface PersonaInfo {
  name: string;
  title: string;
  salutation: string;
  tone: string;
}

export function useJarvisBrain() {
  const [facts, setFacts] = useState<Record<string, string>>({});
  const [activePersona, setActivePersona] = useState<string>("jarvis");
  const [personaInfo, setPersonaInfo] = useState<PersonaInfo | null>(null);
  const [knowledgeGraph, setKnowledgeGraph] = useState<{ nodes: Record<string, any>; edges: any[] }>({ nodes: {}, edges: [] });
  const [wakeWordEnabled, setWakeWordEnabled] = useState<boolean>(true);
  const [currentLanguage, setCurrentLanguage] = useState<string>("en-US");
  const [latestEmotion, setLatestEmotion] = useState<string>("Calm");
  const [activeAgent, setActiveAgent] = useState<string>("ResearchAgent");
  const [reasoningTrace, setReasoningTrace] = useState<string[]>([]);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);

  // Fetch memory facts
  const fetchMemory = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/jarvis/memory`);
      if (res.ok) {
        const data = await res.json();
        setFacts(data.facts || {});
      }
    } catch {
      // Fallback local state if offline
    }
  }, []);

  // Add memory fact
  const addFact = useCallback(async (key: string, value: string) => {
    try {
      const res = await fetch(`${BACKEND}/api/jarvis/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        setFacts((prev) => ({ ...prev, [key]: value }));
      }
    } catch {
      setFacts((prev) => ({ ...prev, [key]: value }));
    }
  }, []);

  // Fetch personality
  const fetchPersonality = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/jarvis/personality`);
      if (res.ok) {
        const data = await res.json();
        setActivePersona(data.active || "jarvis");
        setPersonaInfo(data.persona || null);
      }
    } catch {
      // Fallback
    }
  }, []);

  // Change personality
  const changePersonality = useCallback(async (personaKey: string) => {
    try {
      const res = await fetch(`${BACKEND}/api/jarvis/personality`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: personaKey }),
      });
      if (res.ok) {
        const data = await res.json();
        setActivePersona(personaKey);
        setPersonaInfo(data.persona || null);
      }
    } catch {
      setActivePersona(personaKey);
    }
  }, []);

  // Fetch Knowledge Graph
  const fetchKnowledgeGraph = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/jarvis/knowledge-graph`);
      if (res.ok) {
        const data = await res.json();
        setKnowledgeGraph(data);
      }
    } catch {
      // Fallback
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMemory();
    fetchPersonality();
    fetchKnowledgeGraph();
  }, [fetchMemory, fetchPersonality, fetchKnowledgeGraph]);

  return {
    facts,
    addFact,
    fetchMemory,
    activePersona,
    personaInfo,
    changePersonality,
    knowledgeGraph,
    fetchKnowledgeGraph,
    wakeWordEnabled,
    setWakeWordEnabled,
    currentLanguage,
    setCurrentLanguage,
    latestEmotion,
    setLatestEmotion,
    activeAgent,
    setActiveAgent,
    reasoningTrace,
    setReasoningTrace,
    isMemoryOpen,
    setIsMemoryOpen,
    isPersonaOpen,
    setIsPersonaOpen,
  };
}
