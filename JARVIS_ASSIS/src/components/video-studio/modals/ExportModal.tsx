import React, { useState } from "react";
import { Download, X, Cpu, Film, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { VideoProject } from "../types";
import { startRenderJob } from "../api";

interface ExportModalProps {
  project: VideoProject;
  isOpen: boolean;
  onClose: () => void;
  onJobStarted: (jobId: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  isOpen,
  onClose,
  onJobStarted,
}) => {
  const [format, setFormat] = useState("mp4");
  const [resolution, setResolution] = useState("1080p");
  const [codec, setCodec] = useState("h264");
  const [quality, setQuality] = useState("high");
  const [hwAccel, setHwAccel] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    try {
      const res = await startRenderJob(project, {
        format,
        resolution,
        codec,
        quality,
        hwAccel,
      });

      if (res.success && res.job_id) {
        onJobStarted(res.job_id);
        onClose();
      } else {
        setErrorMsg(res.error || "Failed to start export job.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to queue export.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-950 border border-cyan-500/30 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.2)] overflow-hidden select-none">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-100">Export Video Project</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 text-xs text-slate-300">
          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Project Summary */}
          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Project:</span>
              <span className="font-semibold text-slate-200">{project.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Aspect Ratio:</span>
              <span className="font-mono text-cyan-400">{project?.settings?.aspectRatio || "16:9"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Canvas Native:</span>
              <span className="font-mono text-slate-300">
                {project?.settings?.width ?? 1920}x{project?.settings?.height ?? 1080} @ {project?.settings?.fps ?? 30}fps
              </span>
            </div>
          </div>

          {/* Format selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Container Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="mp4">MP4 (Universal)</option>
                <option value="mkv">MKV (Matroska)</option>
                <option value="mov">MOV (QuickTime)</option>
                <option value="webm">WebM (Web Optimized)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Target Resolution</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="720p">720p HD</option>
                <option value="1080p">1080p Full HD</option>
                <option value="1440p">1440p 2K</option>
                <option value="4k">4K Ultra HD</option>
              </select>
            </div>
          </div>

          {/* Video Codec */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Video Codec</label>
            <select
              value={codec}
              onChange={(e) => setCodec(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="h264">H.264 / AVC (Highest Compatibility)</option>
              <option value="hevc">H.265 / HEVC (High Efficiency)</option>
              <option value="av1">AV1 (Next-Gen Open Standard)</option>
              <option value="vp9">VP9 (Web Open Codec)</option>
            </select>
          </div>

          {/* Hardware Acceleration Checkbox */}
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="font-semibold text-slate-200 block text-[11px]">Hardware Acceleration</span>
                <span className="text-[10px] text-slate-500">Uses NVIDIA NVENC / MediaFoundation GPU encoder</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={hwAccel}
              onChange={(e) => setHwAccel(e.target.checked)}
              className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-900 bg-slate-950/80 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded border border-slate-800 hover:bg-slate-900 text-slate-300 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleStartExport}
            disabled={isExporting}
            className="px-4 py-1.5 rounded bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
          >
            <Film className="w-3.5 h-3.5" />
            <span>{isExporting ? "Queuing..." : "Start Export"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

