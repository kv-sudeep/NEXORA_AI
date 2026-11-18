import React from "react";
import { UserCheck, X, Shield, Sparkles, Cpu } from "lucide-react";

interface PersonalitySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  activePersona: string;
  onChangePersona: (persona: string) => Promise<void>;
}

const PERSONA_OPTIONS = [
  {
    id: "jarvis",
    name: "JARVIS",
    title: "Stark Industries Core AI",
    desc: "Formal, witty, impeccably polite, Iron Man style assistant.",
    icon: Sparkles,
  },
  {
    id: "friday",
    name: "FRIDAY",
    title: "Tactical Operations AI",
    desc: "Direct, calm, practical, and efficiency-focused.",
    icon: Shield,
  },
  {
    id: "kitt",
    name: "KITT",
    title: "Cybernetic Advisor",
    desc: "Protective, logical, and safety-conscious partner.",
    icon: Cpu,
  },
];

export function PersonalitySelector({ isOpen, onClose, activePersona, onChangePersona }: PersonalitySelectorProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-lg border border-hud-cyan/40 bg-background/90 p-6 shadow-[0_0_30px_var(--hud-cyan)] text-hud-cyan font-display">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hud-cyan/20 pb-4">
          <div className="flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-hud-cyan animate-pulse" />
            <div>
              <h2 className="text-base tracking-[0.3em] text-foreground hud-text-glow">PERSONA MATRIX</h2>
              <p className="text-[10px] tracking-[0.2em] text-muted-foreground">SELECT JARVIS BEHAVIORAL CORE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded border border-hud-cyan/30 p-1.5 text-hud-cyan/60 hover:border-hud-cyan hover:text-hud-cyan transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Personas List */}
        <div className="mt-4 space-y-3">
          {PERSONA_OPTIONS.map((p) => {
            const Icon = p.icon;
            const isSelected = activePersona === p.id;
            return (
              <button
                key={p.id}
                onClick={async () => {
                  await onChangePersona(p.id);
                  onClose();
                }}
                className={`w-full text-left rounded-lg border p-4 transition-all flex items-start gap-4 ${
                  isSelected
                    ? "border-hud-cyan bg-hud-cyan/15 shadow-[0_0_15px_var(--hud-cyan)] text-foreground"
                    : "border-hud-cyan/20 bg-hud-cyan/5 hover:border-hud-cyan/50 hover:bg-hud-cyan/10 text-muted-foreground"
                }`}
              >
                <div
                  className={`p-2.5 rounded border ${
                    isSelected ? "border-hud-cyan bg-hud-cyan/20 text-hud-cyan" : "border-hud-cyan/30 text-hud-cyan/60"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm tracking-widest text-hud-cyan">{p.name}</span>
                    {isSelected && (
                      <span className="text-[9px] tracking-[0.2em] bg-hud-cyan/20 border border-hud-cyan px-2 py-0.5 rounded text-hud-cyan">
                        ACTIVE CORE
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] tracking-wider text-muted-foreground mt-0.5">{p.title}</div>
                  <p className="text-xs tracking-wide text-foreground/80 mt-1.5">{p.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
