import React, { useState } from "react";
import { Database, Network, Plus, X, Brain } from "lucide-react";

interface MemoryViewerProps {
  isOpen: boolean;
  onClose: () => void;
  facts: Record<string, string>;
  onAddFact: (key: string, value: string) => Promise<void>;
  knowledgeGraph: { nodes: Record<string, any>; edges: any[] };
}

export function MemoryViewer({ isOpen, onClose, facts, onAddFact, knowledgeGraph }: MemoryViewerProps) {
  const [activeTab, setActiveTab] = useState<"facts" | "graph">("facts");
  const [keyInput, setKeyInput] = useState("");
  const [valInput, setValInput] = useState("");

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim() || !valInput.trim()) return;
    await onAddFact(keyInput.trim(), valInput.trim());
    setKeyInput("");
    setValInput("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-lg border border-hud-cyan/40 bg-background/90 p-6 shadow-[0_0_30px_var(--hud-cyan)] text-hud-cyan font-display">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hud-cyan/20 pb-4">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-hud-cyan animate-pulse" />
            <div>
              <h2 className="text-base tracking-[0.3em] text-foreground hud-text-glow">MEMORY & KNOWLEDGE CORE</h2>
              <p className="text-[10px] tracking-[0.2em] text-muted-foreground">LONG-TERM PERSISTENT FACT STORAGE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded border border-hud-cyan/30 p-1.5 text-hud-cyan/60 hover:border-hud-cyan hover:text-hud-cyan transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="mt-4 flex gap-2 border-b border-hud-cyan/20 pb-2">
          <button
            onClick={() => setActiveTab("facts")}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs tracking-widest rounded border transition-colors ${
              activeTab === "facts"
                ? "border-hud-cyan bg-hud-cyan/20 text-hud-cyan shadow-[0_0_10px_var(--hud-cyan)]"
                : "border-hud-cyan/20 text-muted-foreground hover:border-hud-cyan/40 hover:text-foreground"
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            FACTS & PREFERENCES
          </button>
          <button
            onClick={() => setActiveTab("graph")}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs tracking-widest rounded border transition-colors ${
              activeTab === "graph"
                ? "border-hud-cyan bg-hud-cyan/20 text-hud-cyan shadow-[0_0_10px_var(--hud-cyan)]"
                : "border-hud-cyan/20 text-muted-foreground hover:border-hud-cyan/40 hover:text-foreground"
            }`}
          >
            <Network className="h-3.5 w-3.5" />
            KNOWLEDGE GRAPH
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4 max-h-[320px] overflow-y-auto pr-2 hud-scrollbar">
          {activeTab === "facts" ? (
            <div className="space-y-4">
              {/* Add Fact Form */}
              <form onSubmit={handleAdd} className="flex gap-2">
                <input
                  type="text"
                  placeholder="FACT KEY (e.g. Favorite Coffee)"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="flex-1 rounded border border-hud-cyan/40 bg-transparent px-3 py-1.5 text-xs text-hud-cyan placeholder:text-hud-cyan/30 focus:border-hud-cyan focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="VALUE (e.g. Espresso)"
                  value={valInput}
                  onChange={(e) => setValInput(e.target.value)}
                  className="flex-1 rounded border border-hud-cyan/40 bg-transparent px-3 py-1.5 text-xs text-hud-cyan placeholder:text-hud-cyan/30 focus:border-hud-cyan focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!keyInput.trim() || !valInput.trim()}
                  className="flex items-center gap-1 rounded border border-hud-cyan px-3 py-1.5 text-xs transition-colors hover:bg-hud-cyan/20 disabled:opacity-30"
                >
                  <Plus className="h-3.5 w-3.5" /> ADD
                </button>
              </form>

              {/* Stored Facts List */}
              <div className="space-y-2">
                {Object.keys(facts).length === 0 ? (
                  <div className="py-8 text-center text-xs tracking-widest text-muted-foreground">
                    NO USER FACTS RECORDED YET. TRY SAYING "REMEMBER THAT FAVORITE COLOR IS BLUE".
                  </div>
                ) : (
                  Object.entries(facts).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between rounded border border-hud-cyan/20 bg-hud-cyan/5 p-2.5 text-xs tracking-wider"
                    >
                      <span className="font-semibold text-hud-cyan">{k.toUpperCase()}</span>
                      <span className="text-foreground">{v}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-[10px] tracking-[0.2em] text-muted-foreground mb-2">ENTITIES & GRAPH EDGES</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded border border-hud-cyan/20 bg-hud-cyan/5 p-3">
                  <div className="text-xs text-hud-cyan tracking-widest mb-2 border-b border-hud-cyan/20 pb-1">NODES</div>
                  {Object.entries(knowledgeGraph.nodes || {}).map(([name, data]) => (
                    <div key={name} className="flex justify-between text-[11px] py-1">
                      <span className="text-foreground">{name}</span>
                      <span className="text-muted-foreground">{data.type}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded border border-hud-cyan/20 bg-hud-cyan/5 p-3">
                  <div className="text-xs text-hud-cyan tracking-widest mb-2 border-b border-hud-cyan/20 pb-1">RELATIONS</div>
                  {(knowledgeGraph.edges || []).map((e, idx) => (
                    <div key={idx} className="text-[11px] py-1 text-foreground">
                      <span className="text-hud-cyan">{e.source}</span> --[{e.relation}]--&gt; <span>{e.target}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
