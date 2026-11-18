import React, { useState } from "react";
import { Sparkles, X, Brain, Film, VolumeX, FileText, CheckCircle, Loader2 } from "lucide-react";
import { generateAIPlan, detectScenes, detectSilence, generateSubtitles } from "../api";
import { VideoProject } from "../types";

interface AIAssistantModalProps {
  project: VideoProject;
  isOpen: boolean;
  onClose: () => void;
  onApplyPlan: (plan: string) => void;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  project,
  isOpen,
  onClose,
  onApplyPlan,
}) => {
  const [prompt, setPrompt] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const firstClip = (project.tracks ?? []).flatMap((t) => t.clips ?? []).find((c) => c.sourcePath);

  const handleRunSceneDetection = async () => {
    if (!firstClip?.sourcePath) {
      alert("Please place at least one clip on the timeline first.");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await detectScenes(firstClip.sourcePath);
      setAnalysisResult({ type: "scenes", data: res });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunSilenceDetection = async () => {
    if (!firstClip?.sourcePath) {
      alert("Please place at least one clip on the timeline first.");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await detectSilence(firstClip.sourcePath);
      setAnalysisResult({ type: "silence", data: res });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!prompt.trim()) return;
    setIsProcessing(true);
    try {
      const res = await generateAIPlan(prompt, project.id);
      if (res.success) {
        setAnalysisResult({ type: "plan", text: res.plan });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-950 border border-cyan-500/40 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.25)] overflow-hidden select-none text-xs text-slate-300">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-100">NEXORA Video Intelligence Assistant</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Natural Language Video Directive</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. 'Analyze my video, remove all silent pauses, format into a 9:16 vertical Short, and generate subtitles in English.'..."
              rows={3}
              className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleGeneratePlan}
              disabled={isProcessing || !prompt.trim()}
              className="flex-1 py-2 rounded bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
              <span>Synthesize Editing Plan</span>
            </button>
          </div>

          {/* Quick Analysis Automations */}
          <div className="pt-2 border-t border-slate-900">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Automated Video Analysis</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleRunSceneDetection}
                disabled={isProcessing}
                className="p-2 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-left flex items-center gap-2"
              >
                <Film className="w-4 h-4 text-cyan-400" />
                <div>
                  <span className="font-semibold text-slate-200 block text-[11px]">Detect Scenes</span>
                  <span className="text-[9px] text-slate-500">Shot boundary detection</span>
                </div>
              </button>

              <button
                onClick={handleRunSilenceDetection}
                disabled={isProcessing}
                className="p-2 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-left flex items-center gap-2"
              >
                <VolumeX className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="font-semibold text-slate-200 block text-[11px]">Detect Silence</span>
                  <span className="text-[9px] text-slate-500">Auto pause detection</span>
                </div>
              </button>
            </div>
          </div>

          {/* Output view */}
          {analysisResult && (
            <div className="p-3 rounded bg-slate-900/80 border border-cyan-500/30 max-h-48 overflow-y-auto space-y-1.5">
              <span className="text-cyan-400 font-bold block text-[10px] uppercase">
                {analysisResult.type === "plan" ? "Editing Workflow Plan" : (
                  analysisResult.type === "scenes" ? `Found ${analysisResult.data.scene_count} Scene Boundaries` : `Found ${analysisResult.data.silence_count} Silent Pauses`
                )}
              </span>

              {analysisResult.type === "plan" ? (
                <p className="whitespace-pre-wrap leading-relaxed text-slate-200 text-[11px]">{analysisResult.text}</p>
              ) : (
                <div className="space-y-1 text-[10px] font-mono text-slate-300">
                  <pre className="overflow-x-auto">{JSON.stringify(analysisResult.data, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

