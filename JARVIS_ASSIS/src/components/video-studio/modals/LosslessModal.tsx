import React, { useState } from "react";
import { Scissors, X, CheckCircle, AlertCircle, FileText, ArrowRight, Music, Film, Loader2 } from "lucide-react";
import { losslessTrim, losslessMerge, checkCompatibility, inspectMedia } from "../api";

interface LosslessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMediaProduced: (outputPath: string, filename: string, duration?: number) => void;
}

export const LosslessModal: React.FC<LosslessModalProps> = ({
  isOpen,
  onClose,
  onMediaProduced,
}) => {
  const [mode, setMode] = useState<"trim" | "merge">("trim");
  const [filePath, setFilePath] = useState("");
  const [startTime, setStartTime] = useState("0");
  const [endTime, setEndTime] = useState("10");
  const [mergePaths, setMergePaths] = useState<string>("");
  const [compatibility, setCompatibility] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTrim = async () => {
    if (!filePath.trim()) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setResult(null);
    try {
      const res = await losslessTrim(filePath.trim(), Number(startTime), Number(endTime));
      if (res.success) {
        setResult(res);
        onMediaProduced(res.output_path, `trimmed_${Number(startTime)}-${Number(endTime)}s`, res.duration);
      } else {
        setErrorMsg(res.error || "Lossless trim failed.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute trim.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckCompatibility = async () => {
    const paths = mergePaths.split("\n").map(p => p.trim()).filter(Boolean);
    if (paths.length < 2) {
      setErrorMsg("Please enter at least 2 video file paths to merge.");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await checkCompatibility(paths);
      setCompatibility(res);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMerge = async () => {
    const paths = mergePaths.split("\n").map(p => p.trim()).filter(Boolean);
    if (paths.length < 2) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setResult(null);
    try {
      const res = await losslessMerge(paths);
      if (res.success) {
        setResult(res);
        onMediaProduced(res.output_path, "lossless_merged.mp4", res.duration);
      } else {
        setErrorMsg(res.error || res.reason || "Lossless merge failed.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Merge execution error.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-950 border border-emerald-500/30 rounded-lg shadow-[0_0_30px_rgba(16,185,129,0.2)] overflow-hidden select-none text-xs text-slate-300">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100">Lossless Media Processor</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-900 bg-slate-950/60 px-5 pt-2 gap-4">
          <button
            onClick={() => setMode("trim")}
            className={`pb-2 font-medium transition-colors ${
              mode === "trim" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Zero-Reencode Trim (-c copy)
          </button>
          <button
            onClick={() => setMode("merge")}
            className={`pb-2 font-medium transition-colors ${
              mode === "merge" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Stream Concat / Merge
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {result && (
            <div className="p-2.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <CheckCircle className="w-4 h-4" />
                <span>Lossless Operation Successful!</span>
              </div>
              <p className="text-[10px] text-slate-300 font-mono truncate">{result.output_path}</p>
              <p className="text-[10px] text-emerald-400">Duration: {result.duration?.toFixed(2)}s • Zero quality loss</p>
            </div>
          )}

          {mode === "trim" ? (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Source Video Path</label>
                <input
                  type="text"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="e.g. D:\Videos\source.mp4"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Start Time (seconds)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">End Time (seconds)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800/60 text-[10px] text-slate-400 space-y-1">
                <p className="font-semibold text-emerald-400">Lossless Stream Copy Note:</p>
                <p>Cuts are aligned with the nearest I-frame (keyframe) to prevent broken frames or generational video encoding artifacts.</p>
              </div>

              <button
                onClick={handleTrim}
                disabled={isProcessing || !filePath.trim()}
                className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
                <span>{isProcessing ? "Processing Stream Copy..." : "Execute Lossless Cut"}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Enter Video Paths to Merge (One per line)</label>
                <textarea
                  value={mergePaths}
                  onChange={(e) => {
                    setMergePaths(e.target.value);
                    setCompatibility(null);
                  }}
                  rows={4}
                  placeholder="D:\Videos\part1.mp4&#10;D:\Videos\part2.mp4"
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {compatibility && (
                <div className={`p-2.5 rounded border text-[11px] space-y-1 ${
                  compatibility.compatible ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300" : "bg-amber-950/40 border-amber-500/40 text-amber-300"
                }`}>
                  <span className="font-semibold block">
                    {compatibility.compatible ? "Streams Compatible for Lossless Merging" : "Streams Incompatible for Lossless Concatenation"}
                  </span>
                  <p className="text-[10px] text-slate-300">{compatibility.reason}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleCheckCompatibility}
                  disabled={isProcessing}
                  className="flex-1 py-1.5 rounded border border-slate-800 hover:bg-slate-900 text-slate-300 font-medium text-xs"
                >
                  Verify Codec Compatibility
                </button>
                <button
                  onClick={handleMerge}
                  disabled={isProcessing}
                  className="flex-1 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1"
                >
                  <span>{isProcessing ? "Merging..." : "Merge Without Re-encoding"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

