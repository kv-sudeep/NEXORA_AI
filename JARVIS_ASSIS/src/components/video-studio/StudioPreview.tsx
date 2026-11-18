import React, { useRef, useState, useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Gauge,
  Grid,
  Tv,
  Film
} from "lucide-react";
import { VideoProject, TimelineClip } from "./types";
import { getMediaStreamUrl } from "./api";

interface StudioPreviewProps {
  project: VideoProject;
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  selectedClip: TimelineClip | null;
}

// Subcomponent for synchronized audio playback from timeline audio tracks
const AudioTrackElement: React.FC<{
  src: string;
  clipOffset: number;
  isPlaying: boolean;
  volume: number;
  speed: number;
  muted: boolean;
}> = ({ src, clipOffset, isPlaying, volume, speed, muted }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (Math.abs(audio.currentTime - clipOffset) > 0.4) {
      audio.currentTime = clipOffset;
    }
    audio.playbackRate = speed;
    audio.muted = muted;
    audio.volume = Math.max(0, Math.min(1, volume));

    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [clipOffset, isPlaying, volume, speed, muted]);

  return <audio ref={audioRef} src={src} preload="auto" />;
};

export const StudioPreview: React.FC<StudioPreviewProps> = ({
  project,
  currentTime,
  totalDuration,
  isPlaying,
  onTogglePlay,
  onSeek,
  selectedClip,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState<number>(1.0);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLargeTheater, setIsLargeTheater] = useState(false);

  const fps = project?.settings?.fps || 30;
  const frameDuration = 1 / fps;

  // Track native fullscreen changes (including pressing Escape key)
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Format seconds to SMPTE timecode HH:MM:SS:FF
  const formatSMPTE = (seconds: number): string => {
    const s = Math.max(0, seconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    const frames = Math.floor((s % 1) * fps);
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
  };

  const handleStepFrame = (deltaFrames: number) => {
    const newTime = Math.max(0, Math.min(totalDuration, currentTime + deltaFrames * frameDuration));
    onSeek(newTime);
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Find active video clip at the current timeline position
  const activeVideoClip = (project.tracks ?? [])
    .filter((t) => t.type === "video" && !t.muted)
    .sort((a, b) => b.order - a.order) // Top track overrides
    .flatMap((t) => t.clips ?? [])
    .find((c) => currentTime >= c.timelineStart && currentTime <= c.timelineStart + c.duration);

  // Find active text overlays at the current timeline position
  const activeTextClips = (project.tracks ?? [])
    .filter((t) => t.type === "text" && !t.muted)
    .flatMap((t) => t.clips ?? [])
    .filter((c) => currentTime >= c.timelineStart && currentTime <= c.timelineStart + c.duration);

  // Find active motion overlays at current timeline position
  const activeMotionClips = (project.tracks ?? [])
    .filter((t) => (t.id === "track-v3" || t.type === "overlay") && !t.muted)
    .flatMap((t) => t.clips ?? [])
    .filter((c) => currentTime >= c.timelineStart && currentTime <= c.timelineStart + c.duration);

  // Find active audio clips from audio tracks
  const activeAudioClips = (project.tracks ?? [])
    .filter((t) => t.type === "audio" && !t.muted)
    .flatMap((t) =>
      (t.clips ?? []).map((c) => ({
        ...c,
        trackVolume: t.volume ?? 1.0,
      }))
    )
    .filter(
      (c) =>
        currentTime >= c.timelineStart &&
        currentTime <= c.timelineStart + c.duration &&
        c.sourcePath
    );

  // Synchronize HTML5 video element with timeline currentTime and playback status
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeVideoClip) return;

    // Calculate current position within this specific clip
    const clipOffset = Math.max(
      0,
      (currentTime - activeVideoClip.timelineStart) * (activeVideoClip.speed || 1.0) +
        (activeVideoClip.trimStart || 0)
    );

    // Only update currentTime if drifted by more than 0.35s to prevent jitter
    if (Math.abs(video.currentTime - clipOffset) > 0.35) {
      video.currentTime = clipOffset;
    }

    video.playbackRate = (activeVideoClip.speed || 1.0) * playbackSpeed;
    video.muted = isMuted;
    video.volume = Math.max(0, Math.min(1, (activeVideoClip.volume ?? 1.0) * volumeLevel));

    if (isPlaying) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Playback interrupted or prevented by browser
        });
      }
    } else {
      video.pause();
    }
  }, [
    currentTime,
    isPlaying,
    activeVideoClip?.id,
    activeVideoClip?.sourcePath,
    activeVideoClip?.timelineStart,
    activeVideoClip?.trimStart,
    playbackSpeed,
    isMuted,
    volumeLevel,
  ]);

  // Calculate CSS Filter string combining color grading and visual effects
  const getClipCssFilter = (clip: TimelineClip) => {
    const b = 1 + (clip.colorAdjustments?.brightness || 0);
    const c = clip.colorAdjustments?.contrast || 1;
    const s = clip.colorAdjustments?.saturation || 1;
    let fx = `brightness(${b}) contrast(${c}) saturate(${s})`;

    switch (clip.filterName) {
      case "grayscale":
      case "noir":
        fx += " grayscale(100%)";
        break;
      case "sepia":
      case "vintage":
        fx += " sepia(80%) contrast(1.1)";
        break;
      case "blur":
        fx += " blur(4px)";
        break;
      case "invert":
        fx += " invert(100%)";
        break;
      case "cyberpunk":
        fx += " hue-rotate(180deg) saturate(200%)";
        break;
      case "vivid":
        fx += " saturate(170%) contrast(1.2)";
        break;
      case "teal_orange":
        fx += " hue-rotate(-20deg) contrast(1.3) saturate(1.3)";
        break;
    }
    return fx;
  };

  // Calculate live transition effect (e.g. Fade-in, Zoom)
  const getClipTransitionStyle = (clip: TimelineClip) => {
    const timeInClip = currentTime - clip.timelineStart;
    const tDur = clip.transition?.duration || 1.0;
    let transOpacity = clip.opacity;
    let transScale = clip.transform.scale;

    if (clip.transition && timeInClip >= 0 && timeInClip < tDur) {
      const progress = timeInClip / tDur;
      if (clip.transition.type.includes("fade") || clip.transition.type.includes("dissolve") || clip.transition.type.includes("dip")) {
        transOpacity = clip.opacity * progress;
      } else if (clip.transition.type.includes("zoom")) {
        transScale = clip.transform.scale * (0.8 + 0.2 * progress);
      }
    }
    return {
      opacity: transOpacity,
      transform: `scale(${transScale}) rotate(${clip.transform.rotation}deg) translate(${clip.transform.x}px, ${clip.transform.y}px)`,
    };
  };
  const aspectClasses: Record<string, string> = {
    "16:9": "aspect-video",
    "9:16": "aspect-[9/16]",
    "1:1": "aspect-square",
    "4:5": "aspect-[4/5]",
    "21:9": "aspect-[21/9]",
  };

  const aspectRatio = project?.settings?.aspectRatio || "16:9";

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-950 relative select-none overflow-hidden transition-all ${
        isFullscreen
          ? "fixed inset-0 z-[9999] w-screen h-screen"
          : isLargeTheater
          ? "flex-[2] min-h-[500px]"
          : "flex-1"
      }`}
    >
      {/* Hidden Audio Elements for Multitrack Audio Playback */}
      {activeAudioClips.map((a) => {
        const aOffset = Math.max(
          0,
          (currentTime - a.timelineStart) * (a.speed || 1.0) + (a.trimStart || 0)
        );
        return (
          <AudioTrackElement
            key={a.id}
            src={getMediaStreamUrl(a.sourcePath)}
            clipOffset={aOffset}
            isPlaying={isPlaying}
            volume={(a.volume ?? 1.0) * (a.trackVolume ?? 1.0) * volumeLevel}
            speed={(a.speed || 1.0) * playbackSpeed}
            muted={isMuted}
          />
        );
      })}

      {/* Top Telemetry / Timecode Bar */}
      <div className="h-9 px-4 border-b border-slate-900 flex items-center justify-between text-xs text-slate-400 bg-slate-950/80 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-cyan-400 font-bold tracking-wider text-xs">
            {formatSMPTE(currentTime)}
          </span>
          <span className="text-slate-600 font-mono">/</span>
          <span className="font-mono text-slate-400 text-xs">
            {formatSMPTE(totalDuration)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            ({fps} FPS)
          </span>
          {activeVideoClip && (
            <span className="text-[10px] text-cyan-400/70 border border-cyan-500/20 px-1.5 py-0.5 rounded font-mono truncate max-w-[200px]">
              {activeVideoClip.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Large Screen / Theater Mode Toggle */}
          <button
            onClick={() => setIsLargeTheater(!isLargeTheater)}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-colors ${
              isLargeTheater
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-500 hover:text-slate-300"
            }`}
            title={isLargeTheater ? "Default Screen Size" : "Large Screen Mode"}
          >
            <Tv className="w-3 h-3" />
            <span>{isLargeTheater ? "Standard" : "Large View"}</span>
          </button>

          {/* Safe Zones Toggle */}
          <button
            onClick={() => setShowSafeZones(!showSafeZones)}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-colors ${
              showSafeZones
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-500 hover:text-slate-300"
            }`}
            title="Toggle Action & Title Safe Margins"
          >
            <Grid className="w-3 h-3" />
            <span>Safe Zones</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Gauge className="w-3 h-3 text-cyan-400" />
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-200 focus:outline-none"
            >
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={1.0}>1.0x</option>
              <option value={1.5}>1.5x</option>
              <option value={2.0}>2.0x</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Video Viewport Canvas */}
      <div
        className="flex-1 flex items-center justify-center p-3 relative overflow-hidden bg-black/80 cursor-pointer"
        onClick={onTogglePlay}
        title="Click to Play / Pause"
      >
        <div
          className={`relative border border-slate-800/80 shadow-[0_0_40px_rgba(0,0,0,0.9)] rounded overflow-hidden flex items-center justify-center bg-black transition-all ${
            aspectClasses[aspectRatio] || "aspect-video"
          }`}
          style={{
            maxHeight: isFullscreen ? "100vh" : isLargeTheater ? "100%" : "calc(100% - 8px)",
            maxWidth: isFullscreen ? "100vw" : isLargeTheater ? "100%" : "calc(100% - 16px)",
            width: isLargeTheater ? "100%" : undefined,
            height: isLargeTheater ? "100%" : undefined,
          }}
          onClick={(e) => e.stopPropagation()} // Prevent double trigger
        >
          {/* Active Video Display */}
          {activeVideoClip?.sourcePath ? (
            <div className="w-full h-full relative flex items-center justify-center overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={getMediaStreamUrl(activeVideoClip.sourcePath)}
                playsInline
                preload="auto"
                className="w-full h-full object-contain pointer-events-auto cursor-pointer"
                onClick={onTogglePlay}
                style={{
                  ...getClipTransitionStyle(activeVideoClip),
                  filter: getClipCssFilter(activeVideoClip),
                }}
                onLoadedMetadata={(e) => {
                  const video = e.currentTarget;
                  const clipOffset = Math.max(
                    0,
                    (currentTime - activeVideoClip.timelineStart) * (activeVideoClip.speed || 1.0) +
                      (activeVideoClip.trimStart || 0)
                  );
                  video.currentTime = clipOffset;
                  if (isPlaying) video.play().catch(() => {});
                }}
              />
            </div>
          ) : (
            <div className="text-center p-8 text-slate-600 select-none flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border border-slate-800 flex items-center justify-center mb-3 text-cyan-400/40 bg-slate-950/60 shadow-inner">
                <Film className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase font-display">
                No Video at Playhead
              </p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-xs">
                Move playhead over a clip or drag videos from Media Library onto tracks below
              </p>
            </div>
          )}

          {/* Active Text Overlay Render */}
          {activeTextClips.map((t) => (
            <div
              key={t.id}
              className={`absolute left-0 right-0 px-6 pointer-events-none flex justify-center z-10 ${
                t.textData?.position === "top"
                  ? "top-8"
                  : t.textData?.position === "center"
                  ? "top-1/2 -translate-y-1/2"
                  : "bottom-8"
              }`}
            >
              <div
                className="font-bold tracking-wide text-center"
                style={{
                  fontSize: `${(t.textData?.fontSize || 38) * (isFullscreen ? 1.0 : isLargeTheater ? 0.8 : 0.6)}px`,
                  color: t.textData?.color || "#ffffff",
                  backgroundColor: t.textData?.backgroundColor || "transparent",
                  padding: t.textData?.backgroundColor ? "4px 14px" : "0",
                  borderRadius: "4px",
                  textShadow: "0 2px 10px rgba(0,0,0,0.95)",
                }}
              >
                {t.textData?.text}
              </div>
            </div>
          ))}

          {/* Active Motion HUD Overlays */}
          {activeMotionClips.map((m) => {
            const mType = m.motionType || (m.name?.toLowerCase().includes("reticle") ? "reticle" : m.name?.toLowerCase().includes("waveform") || m.name?.toLowerCase().includes("visualizer") ? "visualizer" : m.name?.toLowerCase().includes("telemetry") ? "telemetry" : "watermark");
            return (
              <div key={m.id} className="absolute inset-0 pointer-events-none z-15 flex items-center justify-center">
                {mType === "reticle" && (
                  <div className="relative w-48 h-48 flex items-center justify-center animate-pulse">
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/60 animate-spin" style={{ animationDuration: "12s" }} />
                    <div className="absolute inset-4 rounded-full border border-cyan-400/40" />
                    <div className="w-12 h-12 rounded-full border border-cyan-400/80 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    </div>
                    <div className="absolute -bottom-6 text-[10px] font-mono text-cyan-400 bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-500/40">
                      TARGET ACQUIRED: 34.05°N, 118.24°W
                    </div>
                  </div>
                )}
                {mType === "visualizer" && (
                  <div className="absolute bottom-12 flex items-end gap-1.5 px-6 py-2 bg-slate-950/70 rounded-lg border border-cyan-500/30">
                    {[35, 60, 85, 45, 95, 70, 40, 80, 55, 90, 65, 30].map((h, i) => (
                      <div
                        key={i}
                        className="w-2 rounded-t bg-gradient-to-t from-cyan-500 to-emerald-400 animate-pulse"
                        style={{
                          height: `${isPlaying ? (h * ((i % 3) + 1)) % 60 + 15 : h * 0.4}px`,
                          animationDelay: `${i * 80}ms`,
                          transition: "height 0.15s ease",
                        }}
                      />
                    ))}
                  </div>
                )}
                {mType === "telemetry" && (
                  <div className="absolute top-8 right-8 p-3 rounded-lg bg-slate-950/80 border border-cyan-500/40 font-mono text-[10px] text-cyan-300 space-y-1 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    <div className="flex items-center justify-between gap-4 font-bold border-b border-cyan-500/30 pb-1">
                      <span>NEXORA HUD</span>
                      <span className="text-emerald-400 animate-pulse">SYS: OK</span>
                    </div>
                    <div className="flex justify-between gap-4"><span>CPU LOAD</span><span className="text-cyan-400">18.4%</span></div>
                    <div className="flex justify-between gap-4"><span>GPU MEM</span><span className="text-cyan-400">4.2 / 16 GB</span></div>
                    <div className="flex justify-between gap-4"><span>PLAYHEAD</span><span className="text-cyan-400">{currentTime.toFixed(2)}s</span></div>
                  </div>
                )}
                {mType === "watermark" && (
                  <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1 rounded bg-slate-950/75 border border-cyan-500/40 font-display text-xs font-bold tracking-widest text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>NEXORA // STARK INDUSTRIES</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Safe Zones Guides */}
          {showSafeZones && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {/* Action Safe (90%) */}
              <div className="absolute inset-[5%] border border-dashed border-cyan-500/30">
                <span className="absolute top-1 left-1 text-[8px] font-mono text-cyan-400/60 uppercase">
                  Action Safe 90%
                </span>
              </div>
              {/* Title Safe (80%) */}
              <div className="absolute inset-[10%] border border-dashed border-amber-500/30">
                <span className="absolute top-1 left-1 text-[8px] font-mono text-amber-400/60 uppercase">
                  Title Safe 80%
                </span>
              </div>
              {/* Center Crosshair */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none flex items-center justify-center">
                <div className="w-4 h-px bg-cyan-400/40" />
                <div className="h-4 w-px bg-cyan-400/40 -ml-2" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transport Controls Bottom Bar */}
      <div className="h-12 border-t border-slate-900 bg-slate-950 px-4 flex items-center justify-between text-slate-300 z-10 shrink-0">
        {/* Left: Skip to start, frame step */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSeek(0)}
            className="p-1.5 rounded hover:bg-slate-900 text-slate-400 hover:text-cyan-400 transition-colors"
            title="Jump to Start (Home)"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStepFrame(-1)}
            className="p-1.5 rounded hover:bg-slate-900 text-slate-400 hover:text-cyan-400 transition-colors"
            title="Step Back 1 Frame (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Main Play/Pause Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shadow-[0_0_16px_rgba(6,182,212,0.6)] transition-all active:scale-95"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-slate-950" />
            ) : (
              <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
            )}
          </button>
        </div>

        {/* Right: Step forward, skip to end, volume, large screen, fullscreen */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleStepFrame(1)}
            className="p-1.5 rounded hover:bg-slate-900 text-slate-400 hover:text-cyan-400 transition-colors"
            title="Step Forward 1 Frame (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSeek(totalDuration)}
            className="p-1.5 rounded hover:bg-slate-900 text-slate-400 hover:text-cyan-400 transition-colors"
            title="Jump to End (End)"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-slate-800 mx-1" />

          {/* Volume Control */}
          <div className="flex items-center gap-1 text-slate-400">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded hover:bg-slate-900 hover:text-cyan-400 transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volumeLevel === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volumeLevel}
              onChange={(e) => {
                setVolumeLevel(Number(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              title={`Preview Volume: ${Math.round(volumeLevel * 100)}%`}
            />
          </div>

          <div className="w-px h-4 bg-slate-800 mx-1" />

          {/* Fullscreen Button */}
          <button
            onClick={handleToggleFullscreen}
            className={`p-1.5 rounded hover:bg-slate-900 transition-colors ${
              isFullscreen ? "text-cyan-400 bg-slate-900" : "text-slate-400 hover:text-cyan-400"
            }`}
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen Large View"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
