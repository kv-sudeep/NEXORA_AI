import React, { useRef, useState, useEffect } from "react";
import {
  Scissors,
  Copy,
  Trash2,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Magnet,
  Plus,
  Layers,
  Music,
  Type,
  Video,
  Undo2,
  Redo2
} from "lucide-react";
import { VideoProject, TimelineTrack, TimelineClip } from "./types";

interface StudioTimelineProps {
  project: VideoProject;
  currentTime: number;
  totalDuration: number;
  onSeek: (time: number) => void;
  selectedClipId: string | null;
  onSelectClip: (clip: TimelineClip | null) => void;
  onSplitClip: (clipId: string, time: number) => void;
  onDeleteClip: (clipId: string) => void;
  onDuplicateClip: (clipId: string) => void;
  onUpdateClip: (clip: TimelineClip) => void;
  onToggleMuteTrack: (trackId: string) => void;
  onToggleLockTrack: (trackId: string) => void;
  onToggleSoloTrack: (trackId: string) => void;
  onUpdateTrackVolume: (trackId: string, volume: number) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const StudioTimeline: React.FC<StudioTimelineProps> = ({
  project,
  currentTime,
  totalDuration,
  onSeek,
  selectedClipId,
  onSelectClip,
  onSplitClip,
  onDeleteClip,
  onDuplicateClip,
  onUpdateClip,
  onToggleMuteTrack,
  onToggleLockTrack,
  onToggleSoloTrack,
  onUpdateTrackVolume,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pixelsPerSecond, setPixelsPerSecond] = useState<number>(30); // Zoom level
  const [isSnapping, setIsSnapping] = useState<boolean>(true);
  const [draggingClip, setDraggingClip] = useState<{
    clip: TimelineClip;
    startX: number;
    initialTimelineStart: number;
  } | null>(null);

  const [trimmingClip, setTrimmingClip] = useState<{
    clip: TimelineClip;
    handle: "left" | "right";
    startX: number;
    initialStart: number;
    initialDuration: number;
  } | null>(null);

  // Compute timeline pixel width
  const timelineDuration = Math.max(totalDuration, 30);
  const timelinePixelWidth = timelineDuration * pixelsPerSecond;

  // Handle timeline ruler click/scrub
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min(timelineDuration, clickX / pixelsPerSecond));
    onSeek(newTime);
  };

  const selectedClip = (project.tracks ?? []).flatMap((t) => t.clips ?? []).find((c) => c.id === selectedClipId) || null;

  // Active clip under playhead (falls back to selectedClip, or finds clip at currentTime)
  const clipUnderPlayhead =
    selectedClip ||
    (project.tracks ?? [])
      .flatMap((t) => t.clips ?? [])
      .find(
        (c) =>
          currentTime >= c.timelineStart &&
          currentTime <= c.timelineStart + c.duration
      ) ||
    null;

  const handleTriggerSplit = () => {
    if (selectedClip && currentTime > selectedClip.timelineStart && currentTime < selectedClip.timelineStart + selectedClip.duration) {
      onSplitClip(selectedClip.id, currentTime);
    } else if (clipUnderPlayhead && currentTime > clipUnderPlayhead.timelineStart && currentTime < clipUnderPlayhead.timelineStart + clipUnderPlayhead.duration) {
      onSplitClip(clipUnderPlayhead.id, currentTime);
    }
  };

  const handleTriggerDelete = () => {
    if (selectedClipId) {
      onDeleteClip(selectedClipId);
    } else if (clipUnderPlayhead) {
      onDeleteClip(clipUnderPlayhead.id);
    }
  };

  const handleTriggerDuplicate = () => {
    if (selectedClipId) {
      onDuplicateClip(selectedClipId);
    } else if (clipUnderPlayhead) {
      onDuplicateClip(clipUnderPlayhead.id);
    }
  };

  // Keyboard shortcut listener: 'S' to split, 'Delete' to delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleTriggerSplit();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleTriggerDelete();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedClipId, currentTime, selectedClip, clipUnderPlayhead, onSplitClip, onDeleteClip]);

  // Mouse move / up handler for dragging and trimming
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingClip) {
        const deltaPx = e.clientX - draggingClip.startX;
        const deltaSec = deltaPx / pixelsPerSecond;
        let newStart = Math.max(0, draggingClip.initialTimelineStart + deltaSec);

        // Magnetic snapping to 0 or playhead
        if (isSnapping) {
          if (Math.abs(newStart - currentTime) < 0.3) newStart = currentTime;
          if (Math.abs(newStart) < 0.3) newStart = 0;
        }

        onUpdateClip({
          ...draggingClip.clip,
          timelineStart: Number(newStart.toFixed(2)),
        });
      } else if (trimmingClip) {
        const deltaPx = e.clientX - trimmingClip.startX;
        const deltaSec = deltaPx / pixelsPerSecond;

        if (trimmingClip.handle === "right") {
          const newDur = Math.max(0.2, trimmingClip.initialDuration + deltaSec);
          onUpdateClip({
            ...trimmingClip.clip,
            duration: Number(newDur.toFixed(2)),
            sourceEnd: trimmingClip.clip.sourceStart + newDur,
          });
        } else if (trimmingClip.handle === "left") {
          const newStart = Math.max(0, trimmingClip.initialStart + deltaSec);
          const durDelta = trimmingClip.initialStart - newStart;
          const newDur = Math.max(0.2, trimmingClip.initialDuration + durDelta);
          onUpdateClip({
            ...trimmingClip.clip,
            timelineStart: Number(newStart.toFixed(2)),
            duration: Number(newDur.toFixed(2)),
            sourceStart: Math.max(0, trimmingClip.clip.sourceStart - durDelta),
          });
        }
      }
    };

    const handleMouseUp = () => {
      setDraggingClip(null);
      setTrimmingClip(null);
    };

    if (draggingClip || trimmingClip) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingClip, trimmingClip, pixelsPerSecond, isSnapping, currentTime, onUpdateClip]);

  return (
    <div className="h-64 border-t border-cyan-500/20 bg-slate-950 flex flex-col select-none overflow-hidden z-20">
      {/* Timeline Quick Action Toolbar */}
      <div className="h-9 px-4 border-b border-slate-900 bg-slate-950/80 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          {/* Split button */}
          <button
            onClick={handleTriggerSplit}
            disabled={!clipUnderPlayhead}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              clipUnderPlayhead ? "bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800" : "text-slate-600 cursor-not-allowed"
            }`}
            title="Split Clip at Playhead (S)"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Split (S)</span>
          </button>

          {/* Delete button */}
          <button
            onClick={handleTriggerDelete}
            disabled={!clipUnderPlayhead}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              clipUnderPlayhead ? "bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800" : "text-slate-600 cursor-not-allowed"
            }`}
            title="Delete Selected Clip (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          {/* Duplicate button */}
          <button
            onClick={handleTriggerDuplicate}
            disabled={!clipUnderPlayhead}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              clipUnderPlayhead ? "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800" : "text-slate-600 cursor-not-allowed"
            }`}
            title="Duplicate Clip"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Undo button */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              canUndo
                ? "bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800"
                : "text-slate-600 cursor-not-allowed"
            }`}
            title="Undo Action (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>

          {/* Redo button */}
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              canRedo
                ? "bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800"
                : "text-slate-600 cursor-not-allowed"
            }`}
            title="Redo Action (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span>Redo</span>
          </button>
        </div>

        {/* Center: Snapping and Zooming */}
        <div className="flex items-center gap-4">
          {/* Snapping Toggle */}
          <button
            onClick={() => setIsSnapping(!isSnapping)}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-all ${
              isSnapping ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-slate-500 hover:text-slate-300"
            }`}
            title="Magnetic Clip Snapping (N)"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Snapping</span>
          </button>

          {/* Zoom Slider */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <ZoomOut className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="range"
              min={10}
              max={100}
              value={pixelsPerSecond}
              onChange={(e) => setPixelsPerSecond(Number(e.target.value))}
              className="w-24 accent-cyan-400 cursor-pointer h-1 bg-slate-800 rounded"
              title="Timeline Zoom Level"
            />
            <ZoomIn className="w-3.5 h-3.5 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Main Track Workspace & Ruler */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers (Left column) */}
        <div className="w-56 bg-slate-950/95 border-r border-slate-900 flex flex-col shrink-0 overflow-y-auto">
          {/* Ruler spacer */}
          <div className="h-6 border-b border-slate-900 bg-slate-950 flex items-center px-3 text-[10px] text-slate-500 uppercase tracking-widest font-mono">
            Tracks
          </div>

          {/* Track controls */}
          {(project.tracks ?? []).map((track) => {
            const isVideo = track.type === "video";
            const isAudio = track.type === "audio";
            const isText = track.type === "text";

            return (
              <div
                key={track.id}
                className="h-10 border-b border-slate-900 px-2.5 flex items-center justify-between text-xs hover:bg-slate-900/40"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {isVideo && <Video className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                  {isAudio && <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  {isText && <Type className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  <span className="font-medium text-slate-300 truncate text-[11px]">{track.name}</span>
                </div>

                {/* Track Mute / Solo / Lock icons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onToggleMuteTrack(track.id)}
                    className={`p-1 rounded ${track.muted ? "text-rose-400 bg-rose-950/40" : "text-slate-500 hover:text-slate-300"}`}
                    title={track.muted ? "Unmute Track" : "Mute Track"}
                  >
                    {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => onToggleLockTrack(track.id)}
                    className={`p-1 rounded ${track.locked ? "text-amber-400 bg-amber-950/40" : "text-slate-500 hover:text-slate-300"}`}
                    title={track.locked ? "Unlock Track" : "Lock Track"}
                  >
                    {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable Tracks Canvas (Right area) */}
        <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-auto relative bg-slate-950">
          <div style={{ width: `${timelinePixelWidth}px`, minWidth: "100%" }} className="relative">
            {/* Timeline Time Ruler */}
            <div
              onClick={handleRulerClick}
              className="h-6 border-b border-slate-900 bg-slate-950 cursor-pointer relative flex items-center text-[9px] font-mono text-slate-500"
            >
              {Array.from({ length: Math.ceil(timelineDuration / 2) }).map((_, idx) => {
                const sec = idx * 2;
                return (
                  <div
                    key={sec}
                    className="absolute border-l border-slate-800 pl-1 h-3 flex items-center"
                    style={{ left: `${sec * pixelsPerSecond}px` }}
                  >
                    <span>{sec}s</span>
                  </div>
                );
              })}
            </div>

            {/* Red Playhead Line */}
            <div
              className="absolute top-0 bottom-0 z-30 pointer-events-none"
              style={{ left: `${currentTime * pixelsPerSecond}px` }}
            >
              {/* Playhead marker handle */}
              <div className="w-3 h-3 bg-rose-500 rotate-45 -ml-1.5 -mt-1.5 shadow-[0_0_8px_#f43f5e]" />
              {/* Vertical line */}
              <div className="w-px h-full bg-rose-500 -ml-[0.5px] shadow-[0_0_6px_#f43f5e]" />
            </div>

            {/* Tracks Body */}
            {(project.tracks ?? []).map((track) => (
              <div
                key={track.id}
                className="h-10 border-b border-slate-900/80 relative flex items-center bg-slate-950/50"
              >
                {/* Clips in this track */}
                {(track.clips ?? []).map((clip) => {
                  const clipLeft = clip.timelineStart * pixelsPerSecond;
                  const clipWidth = Math.max(12, clip.duration * pixelsPerSecond);
                  const isSelected = selectedClipId === clip.id;

                  const colorClass =
                    track.type === "video"
                      ? "bg-cyan-950/70 border-cyan-500/50 text-cyan-200"
                      : track.type === "audio"
                      ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-200"
                      : "bg-amber-950/70 border-amber-500/50 text-amber-200";

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClip(clip);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onSelectClip(clip);
                        setDraggingClip({
                          clip,
                          startX: e.clientX,
                          initialTimelineStart: clip.timelineStart,
                        });
                      }}
                      className={`absolute h-7 rounded px-2 flex items-center justify-between text-[11px] font-medium border cursor-grab active:cursor-grabbing group transition-shadow ${colorClass} ${
                        isSelected ? "ring-2 ring-white shadow-[0_0_12px_rgba(255,255,255,0.4)]" : "hover:brightness-110"
                      }`}
                      style={{
                        left: `${clipLeft}px`,
                        width: `${clipWidth}px`,
                      }}
                    >
                      {/* Left Trim Handle */}
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setTrimmingClip({
                            clip,
                            handle: "left",
                            startX: e.clientX,
                            initialStart: clip.timelineStart,
                            initialDuration: clip.duration,
                          });
                        }}
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40 rounded-l"
                        title="Trim In Point"
                      />

                      <span className="truncate pr-2 font-mono text-[10px]">
                        {clip.name}
                      </span>
                      <span className="text-[9px] opacity-70 shrink-0 font-mono">
                        {clip.duration.toFixed(1)}s
                      </span>

                      {/* Right Trim Handle */}
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setTrimmingClip({
                            clip,
                            handle: "right",
                            startX: e.clientX,
                            initialStart: clip.timelineStart,
                            initialDuration: clip.duration,
                          });
                        }}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40 rounded-r"
                        title="Trim Out Point"
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

