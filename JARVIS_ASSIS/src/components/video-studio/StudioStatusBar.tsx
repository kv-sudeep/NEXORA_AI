import React, { useState, useEffect } from "react";
import { Cpu, HardDrive, Film, Activity, CheckCircle, AlertTriangle } from "lucide-react";
import { RenderJob } from "./types";

interface StudioStatusBarProps {
  activeJobs: RenderJob[];
  statusMessage?: string;
}

export const StudioStatusBar: React.FC<StudioStatusBarProps> = ({
  activeJobs,
  statusMessage = "Ready",
}) => {
  const [telemetry, setTelemetry] = useState({
    cpu: 18,
    ram: "4.2 GB / 16 GB",
    diskFree: "128.4 GB",
    gpu: "NVIDIA NVENC Ready",
  });

  // Dynamic telemetry jitter to simulate live system monitor
  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry((prev) => ({
        ...prev,
        cpu: Math.floor(12 + Math.random() * 15),
      }));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const currentJob = activeJobs.find((j) => j.status === "rendering");

  return (
    <footer className="h-7 border-t border-slate-900 bg-slate-950 px-4 flex items-center justify-between text-[11px] text-slate-400 select-none z-30 font-mono">
      {/* Left: Active Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-sans">{statusMessage}</span>
        </div>

        {currentJob && (
          <div className="flex items-center gap-2 pl-3 border-l border-slate-800 text-cyan-400">
            <Film className="w-3 h-3 animate-spin" />
            <span>Rendering: {currentJob.progress.toFixed(0)}%</span>
            <span className="text-slate-500">({currentJob.fps} fps • {currentJob.speed})</span>
          </div>
        )}
      </div>

      {/* Right: Hardware & Telemetry */}
      <div className="flex items-center gap-4 text-[10px] text-slate-500">
        <div className="flex items-center gap-1">
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span>CPU: {telemetry.cpu}%</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>{telemetry.gpu}</span>
        </div>
        <div className="flex items-center gap-1">
          <HardDrive className="w-3 h-3 text-amber-400" />
          <span>Storage: {telemetry.diskFree} Free</span>
        </div>
      </div>
    </footer>
  );
};

