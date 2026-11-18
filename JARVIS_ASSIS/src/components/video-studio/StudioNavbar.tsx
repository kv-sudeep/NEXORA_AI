import React, { useState } from "react";
import {
  Sparkles,
  Scissors,
  Download,
  FolderOpen,
  Undo2,
  Redo2,
  CheckCircle2,
  Tv,
  Smartphone,
  Square,
  Film,
  Video,
  Layers,
  ChevronDown,
  Loader2
} from "lucide-react";
import { AspectRatio, VideoProject, RenderJob } from "./types";

interface StudioNavbarProps {
  project: VideoProject;
  onUpdateProjectName: (name: string) => void;
  onUpdateAspectRatio: (ratio: AspectRatio) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  onOpenMediaPicker: () => void;
  onOpenLosslessModal: () => void;
  onOpenAIAssistant: () => void;
  onOpenExportModal: () => void;
  activeJobs: RenderJob[];
}

export const StudioNavbar: React.FC<StudioNavbarProps> = ({
  project,
  onUpdateProjectName,
  onUpdateAspectRatio,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isSaving,
  lastSavedAt,
  onOpenMediaPicker,
  onOpenLosslessModal,
  onOpenAIAssistant,
  onOpenExportModal,
  activeJobs,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(project.name);

  const handleNameBlur = () => {
    setIsEditingName(false);
    if (nameInput.trim()) {
      onUpdateProjectName(nameInput.trim());
    } else {
      setNameInput(project.name);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleNameBlur();
    if (e.key === "Escape") {
      setNameInput(project.name);
      setIsEditingName(false);
    }
  };

  const currentRatio = (project?.settings?.aspectRatio || "16:9") as AspectRatio;

  const ratios: { id: AspectRatio; label: string; icon: any }[] = [
    { id: "16:9", label: "16:9 Landscape", icon: Tv },
    { id: "9:16", label: "9:16 Shorts/Reels", icon: Smartphone },
    { id: "1:1", label: "1:1 Square", icon: Square },
    { id: "4:5", label: "4:5 Portrait", icon: Layers },
    { id: "21:9", label: "21:9 Cinematic", icon: Film },
  ];

  const renderingJobs = activeJobs.filter(j => j.status === "rendering" || j.status === "queued");

  return (
    <header className="h-14 border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between select-none z-30">
      {/* Brand & Project Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
          <div className="w-8 h-8 rounded bg-cyan-950/60 border border-cyan-500/50 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <Video className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest text-cyan-400">NEXORA</span>
            <span className="text-[9px] font-medium tracking-wider text-slate-400 -mt-1">VIDEO STUDIO</span>
          </div>
        </div>

        {/* Project Name Editor */}
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              autoFocus
              className="bg-slate-900 border border-cyan-500/50 rounded px-2 py-0.5 text-xs text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-cyan-400"
            />
          ) : (
            <button
              onClick={() => {
                setNameInput(project.name);
                setIsEditingName(true);
              }}
              className="text-xs font-semibold text-slate-200 hover:text-cyan-300 transition-colors px-1 py-0.5 rounded hover:bg-slate-900/60"
              title="Click to rename project"
            >
              {project.name}
            </button>
          )}

          {/* Autosave status */}
          <div className="flex items-center gap-1 text-[10px] text-slate-500 pl-2">
            {isSaving ? (
              <>
                <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                <span>Autosaving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-500/80" />
                <span>Saved</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Center Controls: Undo/Redo & Aspect Ratio */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-900/80 rounded border border-slate-800 p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded transition-colors ${
              canUndo ? "text-slate-300 hover:text-cyan-400 hover:bg-slate-800" : "text-slate-600 cursor-not-allowed"
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded transition-colors ${
              canRedo ? "text-slate-300 hover:text-cyan-400 hover:bg-slate-800" : "text-slate-600 cursor-not-allowed"
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Aspect Ratio Switcher */}
        <div className="flex items-center bg-slate-900/80 rounded border border-slate-800 p-0.5 text-xs">
          {ratios.map((r) => {
            const Icon = r.icon;
            const active = currentRatio === r.id;
            return (
              <button
                key={r.id}
                onClick={() => onUpdateAspectRatio(r.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all text-[11px] font-medium ${
                  active
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.25)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                }`}
                title={r.label}
              >
                <Icon className="w-3 h-3" />
                <span>{r.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Action Tools */}
      <div className="flex items-center gap-2">
        {/* Active render status badge */}
        {renderingJobs.length > 0 && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            <span className="font-mono text-[11px]">{renderingJobs[0].progress.toFixed(0)}%</span>
            <span className="text-[10px] text-amber-400/80">Rendering</span>
          </div>
        )}

        {/* Import Media */}
        <button
          onClick={onOpenMediaPicker}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Import</span>
        </button>

        {/* Lossless Fast Cut Mode */}
        <button
          onClick={onOpenLosslessModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-900/40 text-emerald-300 text-xs font-medium transition-colors shadow-[0_0_10px_rgba(16,185,129,0.15)]"
          title="Fast stream-copy cuts without re-encoding (LosslessCut)"
        >
          <Scissors className="w-3.5 h-3.5 text-emerald-400" />
          <span>Lossless Cut</span>
        </button>

        {/* AI Assistant */}
        <button
          onClick={onOpenAIAssistant}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-950/50 border border-cyan-500/50 hover:bg-cyan-900/50 text-cyan-300 text-xs font-medium transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)]"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>AI Assistant</span>
        </button>

        {/* Export Video */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};

