import React, { useState, useEffect, useRef, useCallback } from "react";
import { StudioNavbar } from "./StudioNavbar";
import { StudioSidebar } from "./StudioSidebar";
import { StudioPreview } from "./StudioPreview";
import { StudioTimeline } from "./StudioTimeline";
import { StudioInspector } from "./StudioInspector";
import { StudioStatusBar } from "./StudioStatusBar";
import { ExportModal } from "./modals/ExportModal";
import { LosslessModal } from "./modals/LosslessModal";
import { AIAssistantModal } from "./modals/AIAssistantModal";
import { MediaPickerModal } from "./modals/MediaPickerModal";
import { AIStudioBot } from "./AIStudioBot";
import { VideoProject, TimelineClip, SidebarTab, AspectRatio, RenderJob, MediaAsset } from "./types";
import { fetchProjects, fetchProject, createProject, saveProject, fetchRenderJobs } from "./api";

const DEFAULT_SETTINGS = {
  width: 1920,
  height: 1080,
  fps: 30,
  aspectRatio: "16:9" as AspectRatio,
  sampleRate: 48000,
};

const DEFAULT_PROJECT: VideoProject = {
  id: "default-project",
  name: "NEXORA AI Master Cut",
  version: "1.0.0",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  settings: DEFAULT_SETTINGS,
  tracks: [
    { id: "track-v3", type: "video", name: "Video 3 (Overlay / PiP)", order: 0, muted: false, locked: false, solo: false, volume: 1.0, clips: [] },
    { id: "track-v2", type: "video", name: "Video 2 (B-Roll / Cutaways)", order: 1, muted: false, locked: false, solo: false, volume: 1.0, clips: [] },
    { id: "track-v1", type: "video", name: "Video 1 (Primary Footage)", order: 2, muted: false, locked: false, solo: false, volume: 1.0, clips: [] },
    { id: "track-t1", type: "text", name: "Text & Subtitles", order: 3, muted: false, locked: false, solo: false, volume: 1.0, clips: [] },
    { id: "track-a1", type: "audio", name: "Audio 1 (Dialogue / Mic)", order: 4, muted: false, locked: false, solo: false, volume: 1.0, clips: [] },
    { id: "track-a2", type: "audio", name: "Audio 2 (Sound Effects)", order: 5, muted: false, locked: false, solo: false, volume: 1.0, clips: [] },
    { id: "track-a3", type: "audio", name: "Audio 3 (Background Music)", order: 6, muted: false, locked: false, solo: false, volume: 0.8, clips: [] },
  ],
  assets: [],
};

function normalizeProject(raw: any): VideoProject {
  if (!raw) return DEFAULT_PROJECT;
  const rawSettings = raw.settings || {};
  const settings = {
    width: Number(rawSettings.width || 1920),
    height: Number(rawSettings.height || 1080),
    fps: Number(rawSettings.fps || raw.fps || 30),
    aspectRatio: (rawSettings.aspectRatio || raw.aspectRatio || "16:9") as AspectRatio,
    sampleRate: Number(rawSettings.sampleRate || 48000),
  };

  return {
    ...DEFAULT_PROJECT,
    ...raw,
    settings,
    tracks: Array.isArray(raw.tracks) && raw.tracks.length > 0
      ? raw.tracks.map((t: any) => ({
          ...t,
          clips: Array.isArray(t.clips) ? t.clips : []
        }))
      : DEFAULT_PROJECT.tracks,
    assets: Array.isArray(raw.assets) ? raw.assets : [],
  };
}

export const VideoStudioWorkspace: React.FC = () => {
  const [project, setProject] = useState<VideoProject>(DEFAULT_PROJECT);
  const [history, setHistory] = useState<VideoProject[]>([DEFAULT_PROJECT]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const [activeTab, setActiveTab] = useState<SidebarTab>("media");
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // Playback state
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Autosave & Telemetry state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [renderJobs, setRenderJobs] = useState<RenderJob[]>([]);

  // Modals state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isLosslessOpen, setIsLosslessOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isAIBotOpen, setIsAIBotOpen] = useState(true);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  // Calculate total duration from furthest clip (guard: tracks may be undefined during load)
  const totalDuration = Math.max(
    10,
    ...(project.tracks ?? []).flatMap((t) => (t.clips ?? []).map((c) => c.timelineStart + c.duration))
  );

  // Push new state onto history stack
  const pushState = useCallback((newProj: VideoProject) => {
    const norm = normalizeProject(newProj);
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, norm];
    });
    setHistoryIndex((prev) => prev + 1);
    setProject(norm);
  }, [historyIndex]);

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setProject(history[prevIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setProject(history[nextIdx]);
    }
  };

  // Keyboard shortcut for Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history]);

  // Playback timer loop
  useEffect(() => {
    let animFrame: number;
    let lastStamp: number | null = null;

    const tick = (stamp: number) => {
      if (lastStamp !== null) {
        const delta = (stamp - lastStamp) / 1000;
        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }
      lastStamp = stamp;
      if (isPlaying) {
        animFrame = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      animFrame = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, totalDuration]);

  // Load existing projects & poll render queue
  useEffect(() => {
    fetchProjects().then(async (projs) => {
      if (projs && projs.length > 0) {
        const fullProj = await fetchProject(projs[0].id);
        const valid = normalizeProject(fullProj || projs[0]);
        setProject(valid);
        setHistory([valid]);
        setHistoryIndex(0);
      }
    });

    const pollJobs = () => {
      fetchRenderJobs().then(setRenderJobs);
    };
    pollJobs();
    const interval = setInterval(pollJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  // Autosave debounced
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsSaving(true);
      await saveProject(project);
      setIsSaving(false);
      setLastSavedAt(new Date().toLocaleTimeString());
    }, 2000);
    return () => clearTimeout(timer);
  }, [project]);

  // Clip manipulation handlers
  const handleAddClipToTimeline = (
    trackId: string,
    sourcePath: string,
    name: string,
    duration: number = 5.0
  ) => {
    const newClip: TimelineClip = {
      id: String(Date.now()),
      sourcePath,
      name,
      trackId,
      timelineStart: Number(currentTime.toFixed(2)),
      duration: Number(duration.toFixed(2)),
      sourceStart: 0,
      sourceEnd: Number(duration.toFixed(2)),
      speed: 1.0,
      volume: 1.0,
      opacity: 1.0,
      transform: { x: 0, y: 0, scale: 1.0, rotation: 0 },
      colorAdjustments: { brightness: 0, contrast: 1, saturation: 1 },
    };

    const newTracks = project.tracks.map((t) => {
      if (t.id === trackId) {
        return { ...t, clips: [...t.clips, newClip] };
      }
      return t;
    });

    pushState({ ...project, tracks: newTracks });
    setSelectedClipId(newClip.id);
  };

  const handleAddTextToTimeline = (text: string, position: "top" | "center" | "bottom") => {
    const newClip: TimelineClip = {
      id: String(Date.now()),
      name: `Text: ${text.slice(0, 15)}`,
      trackId: "track-t1",
      timelineStart: Number(currentTime.toFixed(2)),
      duration: 3.5,
      sourceStart: 0,
      sourceEnd: 3.5,
      speed: 1.0,
      volume: 1.0,
      opacity: 1.0,
      transform: { x: 0, y: 0, scale: 1.0, rotation: 0 },
      textData: {
        text,
        fontSize: position === "center" ? 54 : 36,
        color: position === "center" ? "#00f0ff" : "#ffffff",
        position,
      },
    };

    const newTracks = project.tracks.map((t) => {
      if (t.id === "track-t1") {
        return { ...t, clips: [...t.clips, newClip] };
      }
      return t;
    });

    pushState({ ...project, tracks: newTracks });
    setSelectedClipId(newClip.id);
  };

  const handleSplitClip = (clipId?: string, splitTime: number = currentTime) => {
    const targetId = clipId || selectedClipId || (project.tracks ?? [])
      .flatMap((t) => t.clips ?? [])
      .find((c) => splitTime > c.timelineStart && splitTime < c.timelineStart + c.duration)?.id;
    if (!targetId) return;

    let found = false;
    const newTracks = project.tracks.map((track) => {
      const clipIdx = track.clips.findIndex((c) => c.id === targetId);
      if (clipIdx === -1) return track;

      const clip = track.clips[clipIdx];
      const tStart = clip.timelineStart;
      const tEnd = tStart + clip.duration;

      if (splitTime <= tStart || splitTime >= tEnd) return track;

      found = true;
      const dur1 = splitTime - tStart;
      const dur2 = tEnd - splitTime;

      const clip1: TimelineClip = {
        ...clip,
        duration: Number(dur1.toFixed(2)),
        sourceEnd: clip.sourceStart + dur1,
      };

      const clip2: TimelineClip = {
        ...clip,
        id: String(Date.now()),
        timelineStart: Number(splitTime.toFixed(2)),
        duration: Number(dur2.toFixed(2)),
        sourceStart: clip.sourceStart + dur1,
        sourceEnd: clip.sourceStart + dur1 + dur2,
      };

      const updatedClips = [...track.clips];
      updatedClips.splice(clipIdx, 1, clip1, clip2);
      return { ...track, clips: updatedClips };
    });

    if (found) {
      pushState({ ...project, tracks: newTracks });
    }
  };

  const handleDeleteClip = (clipId?: string) => {
    const targetId = clipId || selectedClipId || (project.tracks ?? [])
      .flatMap((t) => t.clips ?? [])
      .find((c) => currentTime >= c.timelineStart && currentTime <= c.timelineStart + c.duration)?.id;
    if (!targetId) return;

    const newTracks = project.tracks.map((track) => ({
      ...track,
      clips: track.clips.filter((c) => c.id !== targetId),
    }));
    pushState({ ...project, tracks: newTracks });
    if (selectedClipId === targetId) setSelectedClipId(null);
  };

  const handleDuplicateClip = (clipId?: string) => {
    const targetId = clipId || selectedClipId || (project.tracks ?? [])
      .flatMap((t) => t.clips ?? [])
      .find((c) => currentTime >= c.timelineStart && currentTime <= c.timelineStart + c.duration)?.id;
    if (!targetId) return;

    const newTracks = project.tracks.map((track) => {
      const clip = track.clips.find((c) => c.id === targetId);
      if (!clip) return track;

      const dupClip: TimelineClip = {
        ...clip,
        id: String(Date.now()),
        timelineStart: clip.timelineStart + clip.duration + 0.5,
        name: `${clip.name} (Copy)`,
      };
      return { ...track, clips: [...track.clips, dupClip] };
    });
    pushState({ ...project, tracks: newTracks });
  };

  const handleUpdateClip = (updatedClip: TimelineClip) => {
    const newTracks = (project.tracks ?? []).map((track) => ({
      ...track,
      clips: (track.clips ?? []).map((c) => (c.id === updatedClip.id ? updatedClip : c)),
    }));
    pushState(normalizeProject({ ...project, tracks: newTracks }));
  };

  const handleApplyFilter = (filterName: string) => {
    const targetClip =
      selectedClip ||
      (project.tracks ?? [])
        .flatMap((t) => t.clips ?? [])
        .find((c) => currentTime >= c.timelineStart && currentTime <= c.timelineStart + c.duration);
    if (!targetClip) return;
    const updated = {
      ...targetClip,
      filterName: filterName === "none" ? undefined : filterName,
    };
    handleUpdateClip(updated);
  };

  const handleApplyTransition = (transitionType: string) => {
    const targetClip =
      selectedClip ||
      (project.tracks ?? [])
        .flatMap((t) => t.clips ?? [])
        .find((c) => currentTime >= c.timelineStart && currentTime <= c.timelineStart + c.duration);
    if (!targetClip) return;
    const updated = {
      ...targetClip,
      transition: transitionType === "none" ? undefined : { type: transitionType, duration: 1.0 },
    };
    handleUpdateClip(updated);
  };

  const handleApplyColorPreset = (preset: {
    brightness: number;
    contrast: number;
    saturation: number;
    filterName?: string;
  }) => {
    const targetClip =
      selectedClip ||
      (project.tracks ?? [])
        .flatMap((t) => t.clips ?? [])
        .find((c) => currentTime >= c.timelineStart && currentTime <= c.timelineStart + c.duration);
    if (!targetClip) return;
    const updated = {
      ...targetClip,
      colorAdjustments: {
        brightness: preset.brightness,
        contrast: preset.contrast,
        saturation: preset.saturation,
      },
      filterName: preset.filterName || targetClip.filterName,
    };
    handleUpdateClip(updated);
  };

  const handleAddMotionOverlay = (motionType: string) => {
    const newClip: TimelineClip = {
      id: String(Date.now()),
      name: `HUD: ${motionType.toUpperCase()}`,
      trackId: "track-v3",
      motionType,
      timelineStart: Number(currentTime.toFixed(2)),
      duration: 5.0,
      sourceStart: 0,
      sourceEnd: 5.0,
      speed: 1.0,
      volume: 1.0,
      opacity: 1.0,
      transform: { x: 0, y: 0, scale: 1.0, rotation: 0 },
    };
    const newTracks = project.tracks.map((t) => {
      if (t.id === "track-v3") {
        return { ...t, clips: [...t.clips, newClip] };
      }
      return t;
    });
    pushState({ ...project, tracks: newTracks });
    setSelectedClipId(newClip.id);
  };

  const handleUpdateClipSpeed = (spd: number) => {
    const targetClip =
      selectedClip ||
      (project.tracks ?? [])
        .flatMap((t) => t.clips ?? [])
        .find((c) => currentTime >= c.timelineStart && currentTime <= c.timelineStart + c.duration);
    if (!targetClip) return;
    handleUpdateClip({ ...targetClip, speed: spd });
  };

  const handleResetClipTransform = () => {
    const targetClip =
      selectedClip ||
      (project.tracks ?? [])
        .flatMap((t) => t.clips ?? [])
        .find((c) => currentTime >= c.timelineStart && currentTime <= c.timelineStart + c.duration);
    if (!targetClip) return;
    handleUpdateClip({
      ...targetClip,
      transform: { x: 0, y: 0, scale: 1.0, rotation: 0 },
      opacity: 1.0,
    });
  };

  const handleSplitAtScenes = (timestamps: number[]) => {
    timestamps.forEach((ts) => {
      if (ts > 0.5) {
        const clipAtTs = (project.tracks ?? [])
          .flatMap((t) => t.clips ?? [])
          .find((c) => ts > c.timelineStart && ts < c.timelineStart + c.duration);
        if (clipAtTs) {
          handleSplitClip(clipAtTs.id, ts);
        }
      }
    });
  };

  const handleRemoveSilenceSpans = (spans: { start: number; end: number }[]) => {
    spans.forEach((span) => {
      const clipAtSilence = (project.tracks ?? [])
        .flatMap((t) => t.clips ?? [])
        .find((c) => span.start > c.timelineStart && span.start < c.timelineStart + c.duration);
      if (clipAtSilence) {
        handleSplitClip(clipAtSilence.id, span.start);
      }
    });
  };

  const handleImportMediaAsset = (asset: MediaAsset) => {
    const existing = project.assets || [];
    const newProj = { ...project, assets: [...existing, asset] };
    pushState(newProj);
    // Add to V1 directly
    handleAddClipToTimeline("track-v1", asset.path, asset.filename, asset.duration);
  };

  const selectedClip =
    (project.tracks ?? []).flatMap((t) => t.clips ?? []).find((c) => c.id === selectedClipId) || null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100 antialiased">
      {/* Top Studio Navbar */}
      <StudioNavbar
        project={project}
        onUpdateProjectName={(name) => pushState({ ...project, name })}
        onUpdateAspectRatio={(ratio) => {
          const dimMap = {
            "16:9": [1920, 1080],
            "9:16": [1080, 1920],
            "1:1": [1080, 1080],
            "4:5": [1080, 1350],
            "21:9": [2560, 1080],
          };
          const [width, height] = dimMap[ratio] || [1920, 1080];
          pushState({
            ...project,
            settings: { ...(project.settings || DEFAULT_SETTINGS), aspectRatio: ratio, width, height },
          });
        }}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
        onOpenMediaPicker={() => setIsMediaPickerOpen(true)}
        onOpenLosslessModal={() => setIsLosslessOpen(true)}
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        onOpenExportModal={() => setIsExportOpen(true)}
        activeJobs={renderJobs}
      />

      {/* Main Center Workspace (Sidebar | Preview | Inspector) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left 14-Section Sidebar */}
        <StudioSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          project={project}
          onAddClipToTimeline={handleAddClipToTimeline}
          onAddTextToTimeline={handleAddTextToTimeline}
          renderJobs={renderJobs}
          onRefreshJobs={() => fetchRenderJobs().then(setRenderJobs)}
          onOpenMediaPicker={() => setIsMediaPickerOpen(true)}
          onUpdateProjectSettings={(w, h, fps) =>
            pushState({
              ...project,
              settings: { ...(project.settings || DEFAULT_SETTINGS), width: w, height: h, fps },
            })
          }
          selectedClipId={selectedClipId}
          currentTime={currentTime}
          onApplyFilter={handleApplyFilter}
          onApplyTransition={handleApplyTransition}
          onApplyColorPreset={handleApplyColorPreset}
          onAddMotionOverlay={handleAddMotionOverlay}
          onSplitClip={() => handleSplitClip(selectedClipId || undefined, currentTime)}
          onDeleteClip={() => handleDeleteClip(selectedClipId || undefined)}
          onDuplicateClip={() => handleDuplicateClip(selectedClipId || undefined)}
          onUpdateClipSpeed={handleUpdateClipSpeed}
          onResetClipTransform={handleResetClipTransform}
          onSplitAtScenes={handleSplitAtScenes}
          onRemoveSilenceSpans={handleRemoveSilenceSpans}
          onUpdateAspectRatio={(ratio) => {
            const dimMap: Record<string, [number, number]> = {
              "16:9": [1920, 1080],
              "9:16": [1080, 1920],
              "1:1": [1080, 1080],
              "21:9": [2560, 1080],
            };
            const [width, height] = dimMap[ratio] || [1920, 1080];
            pushState({
              ...project,
              settings: { ...(project.settings || DEFAULT_SETTINGS), aspectRatio: ratio as AspectRatio, width, height },
            });
          }}
        />

        {/* Center Preview Viewport */}
        <StudioPreview
          project={project}
          currentTime={currentTime}
          totalDuration={totalDuration}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onSeek={setCurrentTime}
          selectedClip={selectedClip}
        />

        {/* Right Contextual Properties Inspector */}
        <StudioInspector
          clip={selectedClip}
          project={project}
          onUpdateClip={handleUpdateClip}
          onClose={() => setSelectedClipId(null)}
        />

        {/* AI Studio Bot — collapsible panel on far right */}
        {isAIBotOpen && (
          <AIStudioBot
            mode="video"
            theme="cyan"
            variant="panel"
            contextHint={`Project: ${project.name}. Clips on timeline: ${(project.tracks ?? []).flatMap(t => t.clips ?? []).length}. Selected clip: ${selectedClip ? (selectedClip.sourcePath || selectedClip.name || "clip") : "none"}. Current time: ${currentTime.toFixed(2)}s.`}
            onClose={() => setIsAIBotOpen(false)}
          />
        )}

        {/* FAB to reopen bot when closed */}
        {!isAIBotOpen && (
          <button
            onClick={() => setIsAIBotOpen(true)}
            className="fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:scale-105 transition-transform"
            title="Open NEXORA AI Assistant"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-white stroke-2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
          </button>
        )}
      </div>

      {/* Bottom Multitrack Timeline */}
      <StudioTimeline
        project={project}
        currentTime={currentTime}
        totalDuration={totalDuration}
        onSeek={setCurrentTime}
        selectedClipId={selectedClipId}
        onSelectClip={(c) => setSelectedClipId(c?.id || null)}
        onSplitClip={handleSplitClip}
        onDeleteClip={handleDeleteClip}
        onDuplicateClip={handleDuplicateClip}
        onUpdateClip={handleUpdateClip}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleMuteTrack={(trackId) => {
          const newTracks = project.tracks.map((t) =>
            t.id === trackId ? { ...t, muted: !t.muted } : t
          );
          pushState({ ...project, tracks: newTracks });
        }}
        onToggleLockTrack={(trackId) => {
          const newTracks = project.tracks.map((t) =>
            t.id === trackId ? { ...t, locked: !t.locked } : t
          );
          pushState({ ...project, tracks: newTracks });
        }}
        onToggleSoloTrack={(trackId) => {
          const newTracks = (project.tracks ?? []).map((t) =>
            t.id === trackId ? { ...t, solo: !t.solo } : t
          );
          pushState({ ...project, tracks: newTracks });
        }}
        onUpdateTrackVolume={(trackId, vol) => {
          const newTracks = (project.tracks ?? []).map((t) =>
            t.id === trackId ? { ...t, volume: vol } : t
          );
          pushState({ ...project, tracks: newTracks });
        }}
      />

      {/* Bottom Status & Telemetry Bar */}
      <StudioStatusBar activeJobs={renderJobs} statusMessage="NEXORA Studio Engine Ready" />

      {/* Modals */}
      <ExportModal
        project={project}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onJobStarted={(jobId) => {
          fetchRenderJobs().then(setRenderJobs);
        }}
      />

      <LosslessModal
        isOpen={isLosslessOpen}
        onClose={() => setIsLosslessOpen(false)}
        onMediaProduced={(outPath, name, dur) => {
          handleAddClipToTimeline("track-v1", outPath, name, dur);
        }}
      />

      <AIAssistantModal
        project={project}
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        onApplyPlan={() => {}}
      />

      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onImportMedia={handleImportMediaAsset}
      />
    </div>
  );
};

