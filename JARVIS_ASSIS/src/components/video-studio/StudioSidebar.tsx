import React, { useState, useEffect } from "react";
import {
  Folder,
  HardDrive,
  Scissors,
  Music,
  Type,
  Shuffle,
  Wand2,
  Palette,
  Sparkles,
  LayoutTemplate,
  Activity,
  Clock,
  Settings,
  Plus,
  Play,
  Trash2,
  Download,
  Check,
  AlertCircle,
  Mic,
  Volume2,
  FileText,
  Search,
  RefreshCw,
  Film,
  X
} from "lucide-react";
import { SidebarTab, VideoProject, MediaAsset, RenderJob } from "./types";
import {
  fetchDrives,
  scanDirectory,
  generateSubtitles,
  generateTTS,
  detectScenes,
  detectSilence,
  generateAIPlan,
  fetchTemplates,
  renderTemplate,
  cancelRenderJob
} from "./api";

interface StudioSidebarProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  project: VideoProject;
  onAddClipToTimeline: (trackId: string, sourcePath: string, name: string, duration?: number) => void;
  onAddTextToTimeline: (text: string, position: "top" | "center" | "bottom") => void;
  renderJobs: RenderJob[];
  onRefreshJobs: () => void;
  onOpenMediaPicker: () => void;
  onUpdateProjectSettings: (width: number, height: number, fps: number) => void;
  selectedClipId?: string | null;
  currentTime?: number;
  onApplyFilter?: (filterName: string) => void;
  onApplyTransition?: (transitionType: string) => void;
  onApplyColorPreset?: (preset: { brightness: number; contrast: number; saturation: number; filterName?: string }) => void;
  onAddMotionOverlay?: (motionType: string) => void;
  onSplitClip?: () => void;
  onDeleteClip?: () => void;
  onDuplicateClip?: () => void;
  onUpdateClipSpeed?: (speed: number) => void;
  onResetClipTransform?: () => void;
  onSplitAtScenes?: (timestamps: number[]) => void;
  onRemoveSilenceSpans?: (spans: { start: number; end: number }[]) => void;
  onUpdateAspectRatio?: (ratio: string) => void;
}

export const StudioSidebar: React.FC<StudioSidebarProps> = ({
  activeTab,
  onSelectTab,
  project,
  onAddClipToTimeline,
  onAddTextToTimeline,
  renderJobs,
  onRefreshJobs,
  onOpenMediaPicker,
  onUpdateProjectSettings,
  selectedClipId,
  currentTime = 0,
  onApplyFilter,
  onApplyTransition,
  onApplyColorPreset,
  onAddMotionOverlay,
  onSplitClip,
  onDeleteClip,
  onDuplicateClip,
  onUpdateClipSpeed,
  onResetClipTransform,
  onSplitAtScenes,
  onRemoveSilenceSpans,
  onUpdateAspectRatio,
}) => {
  // Drives and Explorer state
  const [drives, setDrives] = useState<any[]>([]);
  const [selectedDrivePath, setSelectedDrivePath] = useState<string>("");
  const [directoryItems, setDirectoryItems] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Audio Studio TTS state
  const [ttsText, setTtsText] = useState("");
  const [isGeneratingTts, setIsGeneratingTts] = useState(false);

  // Subtitle state
  const [subLang, setSubLang] = useState("en");
  const [isGeneratingSubs, setIsGeneratingSubs] = useState(false);

  // AI Assistant state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [detectedScenes, setDetectedScenes] = useState<number[]>([]);
  const [isDetectingScenes, setIsDetectingScenes] = useState(false);
  const [detectedSilence, setDetectedSilence] = useState<any[]>([]);
  const [isDetectingSilence, setIsDetectingSilence] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateCustomTitle, setTemplateCustomTitle] = useState("NEXORA AI");
  const [templateCustomSubtitle, setTemplateCustomSubtitle] = useState("SYSTEMS ONLINE");
  const [isRenderingTemplate, setIsRenderingTemplate] = useState(false);

  const selectedClip =
    (project.tracks ?? []).flatMap((t) => t.clips ?? []).find((c) => c.id === selectedClipId) || null;

  // Load drives on mount
  useEffect(() => {
    fetchDrives().then((d) => {
      setDrives(d);
      if (d.length > 0) {
        setSelectedDrivePath(d[0].path);
      }
    });
    fetchTemplates().then(setTemplates);
  }, []);

  const handleScanDirectory = async (path: string) => {
    setIsScanning(true);
    try {
      const res = await scanDirectory(path);
      if (res.success) {
        setDirectoryItems(res.items || []);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const navItems: { id: SidebarTab; label: string; icon: any }[] = [
    { id: "media", label: "Media Library", icon: Folder },
    { id: "files", label: "File Explorer", icon: HardDrive },
    { id: "editor", label: "Video Tools", icon: Scissors },
    { id: "audio", label: "Audio Studio", icon: Music },
    { id: "text", label: "Captions & Titles", icon: Type },
    { id: "transitions", label: "Transitions", icon: Shuffle },
    { id: "effects", label: "Visual Effects", icon: Wand2 },
    { id: "color", label: "Color Grading", icon: Palette },
    { id: "ai", label: "AI Assistant", icon: Sparkles },
    { id: "templates", label: "Templates", icon: LayoutTemplate },
    { id: "motion", label: "Motion Graphics", icon: Activity },
    { id: "render_queue", label: "Render Queue", icon: Film },
    { id: "history", label: "Export Archive", icon: Clock },
    { id: "settings", label: "Project Settings", icon: Settings },
  ];

  return (
    <div className="flex h-full border-r border-slate-800/80 bg-slate-950/95 z-20">
      {/* Icon Navigation Bar */}
      <div className="w-16 border-r border-slate-900 bg-slate-950 flex flex-col items-center py-2 gap-1 select-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-12 h-11 flex flex-col items-center justify-center rounded transition-all group relative ${
                active
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/80"
              }`}
              title={item.label}
            >
              <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span className="text-[9px] font-medium tracking-tight mt-0.5 truncate max-w-[44px]">
                {item.label.split(" ")[0]}
              </span>
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-cyan-400 rounded-r shadow-[0_0_6px_#00f0ff]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded Tool Panel */}
      <div className="w-72 bg-slate-900/60 flex flex-col h-full overflow-hidden border-r border-slate-800/50">
        <div className="h-10 px-3 border-b border-slate-800/80 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200 tracking-wide uppercase">
            {navItems.find((n) => n.id === activeTab)?.label}
          </span>
          {activeTab === "render_queue" && (
            <button
              onClick={onRefreshJobs}
              className="p-1 hover:text-cyan-400 text-slate-400 rounded transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 text-xs text-slate-300 space-y-3">
          {/* 1. MEDIA LIBRARY */}
          {activeTab === "media" && (
            <div className="space-y-3">
              <button
                onClick={onOpenMediaPicker}
                className="w-full py-2 border border-dashed border-cyan-500/40 hover:border-cyan-400/80 rounded bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-300 font-medium flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Import Local Media</span>
              </button>

              <div className="text-[11px] font-medium text-slate-400 tracking-wider uppercase pt-1">
                Project Assets ({project.assets?.length || 0})
              </div>

              {(!project.assets || project.assets.length === 0) ? (
                <div className="p-4 text-center text-slate-500 rounded border border-slate-800/60 bg-slate-950/40">
                  <Folder className="w-8 h-8 text-slate-600 mx-auto mb-1.5" />
                  <p>No media files imported yet.</p>
                  <p className="text-[10px] text-slate-600 mt-1">Click "Import Local Media" or open File Explorer.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {project.assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="p-2 rounded bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Film className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div className="overflow-hidden">
                          <p className="font-medium text-slate-200 truncate">{asset.filename}</p>
                          <p className="text-[10px] text-slate-500">{asset.duration?.toFixed(1)}s • {asset.type}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => onAddClipToTimeline("track-v1", asset.path, asset.filename, asset.duration)}
                        className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 text-[10px] font-medium shrink-0"
                        title="Add to V1 Track"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. FILE EXPLORER */}
          {activeTab === "files" && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Select Storage Drive / Folder</label>
                <select
                  value={selectedDrivePath}
                  onChange={(e) => {
                    setSelectedDrivePath(e.target.value);
                    handleScanDirectory(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {drives.map((d) => (
                    <option key={d.id} value={d.path}>
                      {d.name} {d.free_gb ? `(${d.free_gb} GB Free)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => handleScanDirectory(selectedDrivePath)}
                disabled={isScanning || !selectedDrivePath}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isScanning ? "Scanning..." : "Scan for Media"}</span>
              </button>

              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                {directoryItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 rounded bg-slate-950/50 border border-slate-800/80 hover:border-cyan-500/40 flex items-center justify-between text-[11px]"
                  >
                    <div className="overflow-hidden pr-2">
                      <p className="truncate text-slate-200">{item.name}</p>
                      <p className="text-[9px] text-slate-500">{item.size_mb} MB • {item.type}</p>
                    </div>
                    <button
                      onClick={() => onAddClipToTimeline("track-v1", item.path, item.name)}
                      className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-semibold hover:bg-cyan-500/40"
                    >
                      Use
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. VIDEO TOOLS */}
          {activeTab === "editor" && (
            <div className="space-y-3">
              <span className="text-[11px] font-medium text-slate-400 block">Timeline Editing Actions</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onSplitClip}
                  className="p-2.5 rounded bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-center transition-all group"
                  title="Split Clip at Current Playhead (S)"
                >
                  <Scissors className="w-4 h-4 text-cyan-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-[11px] text-slate-200 block">Split at Playhead</span>
                  <span className="text-[9px] text-cyan-400 font-mono">Shortcut: S</span>
                </button>
                <button
                  onClick={onDeleteClip}
                  className="p-2.5 rounded bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/50 text-center transition-all group"
                  title="Delete Selected Clip (Del)"
                >
                  <Trash2 className="w-4 h-4 text-rose-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-[11px] text-slate-200 block">Delete Clip</span>
                  <span className="text-[9px] text-rose-400 font-mono">Shortcut: Del</span>
                </button>
                <button
                  onClick={onDuplicateClip}
                  className="p-2.5 rounded bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-center transition-all group"
                  title="Duplicate Clip"
                >
                  <Plus className="w-4 h-4 text-cyan-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-[11px] text-slate-200 block">Duplicate</span>
                  <span className="text-[9px] text-slate-500">Clone selected</span>
                </button>
                <button
                  onClick={onResetClipTransform}
                  className="p-2.5 rounded bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-center transition-all group"
                  title="Reset Scale and Rotation to Defaults"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-[11px] text-slate-200 block">Reset Transform</span>
                  <span className="text-[9px] text-slate-500">1.0x / 0°</span>
                </button>
              </div>

              {/* Clip Speed Presets */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <span className="text-[10px] text-slate-400 block font-medium">Selected Clip Playback Speed</span>
                <div className="grid grid-cols-5 gap-1">
                  {[0.5, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => onUpdateClipSpeed && onUpdateClipSpeed(spd)}
                      className={`py-1 rounded text-[10px] font-mono border transition-all ${
                        selectedClip?.speed === spd
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60"
                          : "bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio Switcher */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <span className="text-[10px] text-slate-400 block font-medium">Project Aspect Ratio</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { ratio: "16:9", desc: "YouTube / Standard" },
                    { ratio: "9:16", desc: "Reels / TikTok / Shorts" },
                    { ratio: "1:1", desc: "Square Social" },
                    { ratio: "21:9", desc: "Ultrawide Cinema" },
                  ].map(({ ratio, desc }) => (
                    <button
                      key={ratio}
                      onClick={() => onUpdateAspectRatio && onUpdateAspectRatio(ratio)}
                      className={`p-2 rounded text-left border transition-all ${
                        project.settings?.aspectRatio === ratio
                          ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                          : "bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300"
                      }`}
                    >
                      <span className="font-bold text-xs block">{ratio}</span>
                      <span className="text-[9px] text-slate-500 block truncate">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. AUDIO STUDIO */}
          {activeTab === "audio" && (
            <div className="space-y-3">
              <span className="text-[11px] font-medium text-slate-400 block">AI Voiceover Generator (TTS)</span>
              <textarea
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                placeholder="Enter narration text for AI speech..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={async () => {
                  if (!ttsText.trim()) return;
                  setIsGeneratingTts(true);
                  try {
                    const res = await generateTTS(ttsText);
                    if (res.success && res.audio_path) {
                      onAddClipToTimeline("track-a1", res.audio_path, "AI Narration", res.duration);
                      setTtsText("");
                    }
                  } finally {
                    setIsGeneratingTts(false);
                  }
                }}
                disabled={isGeneratingTts || !ttsText.trim()}
                className="w-full py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isGeneratingTts ? "Generating Audio..." : "Generate & Add to A1"}</span>
              </button>

              {/* Sound FX & Ambience Presets */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <span className="text-[11px] font-medium text-slate-400 block">Audio SFX & Ambient Atmosphere</span>
                {[
                  { name: "Cyber Ambience Drone", duration: 8.0, desc: "Deep low-frequency sci-fi synth pad" },
                  { name: "Dramatic Sub Bass Impact", duration: 4.0, desc: "Punchy cinematic cinematic drop" },
                  { name: "Sci-Fi HUD Ping", duration: 2.5, desc: "Crisp holographic UI chime" },
                ].map((sfx) => (
                  <div
                    key={sfx.name}
                    className="p-2 rounded bg-slate-950/70 border border-slate-800 hover:border-cyan-500/40 flex items-center justify-between transition-all"
                  >
                    <div className="overflow-hidden pr-2">
                      <p className="font-medium text-slate-200 text-[11px] truncate">{sfx.name}</p>
                      <p className="text-[9px] text-slate-500">{sfx.duration}s • {sfx.desc}</p>
                    </div>
                    <button
                      onClick={async () => {
                        const res = await generateTTS(sfx.name);
                        if (res.success && res.audio_path) {
                          onAddClipToTimeline("track-a2", res.audio_path, sfx.name, sfx.duration);
                        } else {
                          // Fallback synthetic audio clip
                          onAddClipToTimeline("track-a2", "ambient_sfx.wav", sfx.name, sfx.duration);
                        }
                      }}
                      className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 text-[10px] font-medium shrink-0"
                    >
                      + Add to A2
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. TEXT & CAPTIONS */}
          {activeTab === "text" && (
            <div className="space-y-3">
              <span className="text-[11px] font-medium text-slate-400 block">Quick Typography Presets</span>
              <div className="space-y-2">
                <button
                  onClick={() => onAddTextToTimeline("NEXORA AI TITLE", "center")}
                  className="w-full py-2 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-slate-200 font-bold text-center block transition-all hover:bg-slate-900"
                >
                  CENTER TITLE CARD
                </button>
                <button
                  onClick={() => onAddTextToTimeline("Lower-Third Speaker Info", "bottom")}
                  className="w-full py-2 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-slate-200 text-center block transition-all hover:bg-slate-900"
                >
                  LOWER-THIRD CAPTION
                </button>
                <button
                  onClick={() => onAddTextToTimeline("STARK SYSTEMS // READY", "top")}
                  className="w-full py-2 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-cyan-300 font-mono text-center block transition-all hover:bg-slate-900"
                >
                  TOP TELEMETRY BANNER
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-[11px] font-medium text-slate-400 block mb-1.5">Auto Subtitles & Speech-to-Text</span>
                <select
                  value={subLang}
                  onChange={(e) => setSubLang(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 mb-2 focus:outline-none"
                >
                  <option value="en">English (US)</option>
                  <option value="kn">Kannada (ಕನ್ನಡ)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="te">Telugu (తెలుగు)</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                </select>
                <button
                  onClick={async () => {
                    const firstClip = (project.tracks ?? []).flatMap((t) => t.clips ?? []).find((c) => c.sourcePath);
                    if (!firstClip?.sourcePath) {
                      alert("Please add at least one video or audio clip to the timeline first.");
                      return;
                    }
                    setIsGeneratingSubs(true);
                    try {
                      const res = await generateSubtitles(firstClip.sourcePath, subLang);
                      if (res.success && res.subtitles) {
                        res.subtitles.forEach((s: any) => {
                          onAddTextToTimeline(s.text, "bottom");
                        });
                      }
                    } finally {
                      setIsGeneratingSubs(false);
                    }
                  }}
                  disabled={isGeneratingSubs}
                  className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isGeneratingSubs ? "Transcribing Audio..." : "Transcribe & Generate Subtitles"}</span>
                </button>
              </div>
            </div>
          )}

          {/* 6. TRANSITIONS */}
          {activeTab === "transitions" && (
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-slate-400 block">Click Transition to Apply to Clip</span>
              {[
                { id: "fade", name: "Crossfade / Dissolve", dur: 1.0 },
                { id: "dip_black", name: "Dip to Black", dur: 1.0 },
                { id: "dip_white", name: "Dip to White", dur: 1.0 },
                { id: "zoom_in", name: "Zoom In Pop", dur: 1.2 },
                { id: "slide_wipe", name: "Slide Wipe", dur: 1.0 },
                { id: "none", name: "None (Remove Transition)", dur: 0 },
              ].map((t) => {
                const isActive = (selectedClip?.transition?.type || "none") === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onApplyTransition && onApplyTransition(t.id)}
                    className={`w-full p-2.5 rounded text-left border flex items-center justify-between text-[11px] transition-all ${
                      isActive
                        ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                        : "bg-slate-950/80 border-slate-800 hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Shuffle className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                      <span className="font-medium">{t.name}</span>
                    </div>
                    <span className="text-[9px] font-mono text-cyan-400/80">
                      {isActive ? "ACTIVE" : t.dur > 0 ? `${t.dur}s` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 7. EFFECTS */}
          {activeTab === "effects" && (
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-slate-400 block">Click Visual Effect to Apply</span>
              {[
                { id: "noir", name: "Film Noir (High-Contrast B&W)" },
                { id: "vignette", name: "Vignette Darkening" },
                { id: "blur", name: "Cinematic Box Blur" },
                { id: "invert", name: "Negative Color Inversion" },
                { id: "cyberpunk", name: "Cyberpunk Neon Glow" },
                { id: "vivid", name: "Vivid Saturation Boost" },
                { id: "teal_orange", name: "Blockbuster Teal & Orange" },
                { id: "sepia", name: "Vintage 70s Sepia" },
                { id: "none", name: "Normal (Clear Filter)" },
              ].map((fx) => {
                const isActive = (selectedClip?.filterName || "none") === fx.id;
                return (
                  <button
                    key={fx.id}
                    onClick={() => onApplyFilter && onApplyFilter(fx.id)}
                    className={`w-full p-2.5 rounded text-left border flex items-center justify-between text-[11px] transition-all ${
                      isActive
                        ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                        : "bg-slate-950/80 border-slate-800 hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Wand2 className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                      <span className="font-medium">{fx.name}</span>
                    </div>
                    {isActive && <span className="text-[9px] font-bold text-cyan-400">ACTIVE</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* 8. COLOR GRADING */}
          {activeTab === "color" && (
            <div className="space-y-3">
              <span className="text-[11px] font-medium text-slate-400 block">Color Grading Presets</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: "Neutral", preset: { brightness: 0, contrast: 1, saturation: 1 } },
                  { name: "Vivid Pop", preset: { brightness: 0.05, contrast: 1.25, saturation: 1.45 } },
                  { name: "Cinematic Teal", preset: { brightness: -0.05, contrast: 1.3, saturation: 0.95, filterName: "teal_orange" } },
                  { name: "Noir B&W", preset: { brightness: 0, contrast: 1.4, saturation: 0, filterName: "noir" } },
                  { name: "Vintage 70s", preset: { brightness: 0.08, contrast: 0.9, saturation: 0.85, filterName: "sepia" } },
                  { name: "Cyberpunk", preset: { brightness: 0.1, contrast: 1.4, saturation: 1.8, filterName: "cyberpunk" } },
                ].map(({ name, preset }) => (
                  <button
                    key={name}
                    onClick={() => onApplyColorPreset && onApplyColorPreset(preset)}
                    className="p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 text-left transition-all group"
                  >
                    <span className="font-bold text-xs text-slate-200 group-hover:text-cyan-300 block">{name}</span>
                    <span className="text-[9px] text-slate-500 block">Instant Apply</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 pt-1">
                Select any clip on the timeline or inspect its sliders on the right panel for fine curve tuning.
              </p>
            </div>
          )}

          {/* 9. AI VIDEO ASSISTANT */}
          {activeTab === "ai" && (
            <div className="space-y-3">
              <span className="text-[11px] font-medium text-slate-400 block">NEXORA Video Intelligence</span>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe your editing goal (e.g. 'Cut silent pauses and arrange clips into a 60-second highlight video')..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={async () => {
                  if (!aiPrompt.trim()) return;
                  setIsAiThinking(true);
                  try {
                    const res = await generateAIPlan(aiPrompt, project.id);
                    if (res.success) {
                      setAiOutput(res.plan);
                    }
                  } finally {
                    setIsAiThinking(false);
                  }
                }}
                disabled={isAiThinking || !aiPrompt.trim()}
                className="w-full py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAiThinking ? "Synthesizing Plan..." : "Generate AI Plan"}</span>
              </button>

              {aiOutput && (
                <div className="p-2.5 rounded bg-slate-950 border border-cyan-500/30 text-[11px] text-slate-300 max-h-48 overflow-y-auto space-y-1">
                  <span className="text-cyan-400 font-semibold block text-[10px]">AI Editing Recommendation:</span>
                  <p className="whitespace-pre-wrap leading-relaxed">{aiOutput}</p>
                </div>
              )}

              {/* Automatic Scene & Silence Analysis Tools */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <span className="text-[11px] font-medium text-slate-400 block">Automated AI Detection</span>
                
                {/* Scene Detection */}
                <button
                  onClick={async () => {
                    const clip = (project.tracks ?? []).flatMap((t) => t.clips ?? []).find((c) => c.sourcePath);
                    if (!clip?.sourcePath) {
                      alert("Please place a media clip on the timeline first.");
                      return;
                    }
                    setIsDetectingScenes(true);
                    try {
                      const res = await detectScenes(clip.sourcePath);
                      if (res.success && res.scene_timestamps) {
                        setDetectedScenes(res.scene_timestamps);
                      }
                    } finally {
                      setIsDetectingScenes(false);
                    }
                  }}
                  disabled={isDetectingScenes}
                  className="w-full py-1.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5"
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isDetectingScenes ? "Scanning Scenes..." : "Auto-Detect Scene Cuts"}</span>
                </button>

                {detectedScenes.length > 0 && (
                  <div className="p-2 rounded bg-slate-950 border border-cyan-500/30 space-y-1.5">
                    <span className="text-[10px] text-cyan-300 font-semibold block">
                      Found {detectedScenes.length} Scene Cuts: {detectedScenes.map((s) => `${s.toFixed(1)}s`).join(", ")}
                    </span>
                    <button
                      onClick={() => onSplitAtScenes && onSplitAtScenes(detectedScenes)}
                      className="w-full py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 text-[10px] font-bold"
                    >
                      Split Timeline at Detected Cuts
                    </button>
                  </div>
                )}

                {/* Silence Detection */}
                <button
                  onClick={async () => {
                    const clip = (project.tracks ?? []).flatMap((t) => t.clips ?? []).find((c) => c.sourcePath);
                    if (!clip?.sourcePath) {
                      alert("Please place an audio or video clip on the timeline first.");
                      return;
                    }
                    setIsDetectingSilence(true);
                    try {
                      const res = await detectSilence(clip.sourcePath);
                      if (res.success && res.silence_spans) {
                        setDetectedSilence(res.silence_spans);
                      }
                    } finally {
                      setIsDetectingSilence(false);
                    }
                  }}
                  disabled={isDetectingSilence}
                  className="w-full py-1.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5"
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isDetectingSilence ? "Detecting Silence..." : "Auto-Detect Silent Pauses"}</span>
                </button>

                {detectedSilence.length > 0 && (
                  <div className="p-2 rounded bg-slate-950 border border-amber-500/30 space-y-1.5">
                    <span className="text-[10px] text-amber-300 font-semibold block">
                      Found {detectedSilence.length} Silent Regions
                    </span>
                    <button
                      onClick={() => onRemoveSilenceSpans && onRemoveSilenceSpans(detectedSilence)}
                      className="w-full py-1 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-[10px] font-bold"
                    >
                      Trim Silent Regions from Timeline
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 10. TEMPLATES */}
          {activeTab === "templates" && (
            <div className="space-y-2.5">
              <span className="text-[11px] font-medium text-slate-400 block">Remotion Programmatic Compositions</span>
              
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Template Custom Parameters</span>
                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5">Primary Title</label>
                  <input
                    type="text"
                    value={templateCustomTitle}
                    onChange={(e) => setTemplateCustomTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5">Subtitle / Role / Headline</label>
                  <input
                    type="text"
                    value={templateCustomSubtitle}
                    onChange={(e) => setTemplateCustomSubtitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {templates.map((tmpl) => (
                <div key={tmpl.id} className="p-2.5 rounded bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 space-y-1.5 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 text-xs">{tmpl.name}</span>
                    <span className="text-[9px] text-cyan-400 font-mono">{tmpl.duration}s</span>
                  </div>
                  <p className="text-[10px] text-slate-500">{tmpl.description}</p>
                  <button
                    onClick={async () => {
                      setIsRenderingTemplate(true);
                      try {
                        const res = await renderTemplate(tmpl.id, {
                          title: templateCustomTitle,
                          subtitle: templateCustomSubtitle,
                          speakerName: templateCustomTitle,
                          speakerRole: templateCustomSubtitle,
                          headline: templateCustomTitle,
                          tag: templateCustomSubtitle,
                          ctaText: templateCustomTitle,
                          brandUrl: templateCustomSubtitle,
                        });
                        if (res.success && res.output_path) {
                          onAddClipToTimeline("track-v1", res.output_path, tmpl.name, tmpl.duration);
                        }
                      } finally {
                        setIsRenderingTemplate(false);
                      }
                    }}
                    disabled={isRenderingTemplate}
                    className="w-full py-1.5 rounded bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isRenderingTemplate ? "Rendering Composition..." : "Generate & Place on V1"}</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 11. MOTION GRAPHICS */}
          {activeTab === "motion" && (
            <div className="space-y-2.5">
              <span className="text-[11px] font-medium text-slate-400 block">Animated HUD Graphics & Overlays</span>
              <p className="text-[10px] text-slate-500">
                Click any graphic to instantiate an animated HUD overlay onto Video Track 3 (Overlay) at current playhead.
              </p>
              {[
                { id: "reticle", name: "Targeting Reticle HUD", desc: "Spinning animated HUD target lock with coordinates" },
                { id: "visualizer", name: "Waveform Audio Visualizer", desc: "Live dynamic equalizer neon frequency bars" },
                { id: "telemetry", name: "Hexagonal Telemetry HUD", desc: "System performance & playhead telemetry stats" },
                { id: "watermark", name: "Stark Industries Watermark", desc: "Futuristic pulsating holographic brand tag" },
              ].map((m) => (
                <div key={m.id} className="p-2.5 rounded bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 flex items-center justify-between transition-all">
                  <div className="overflow-hidden pr-2">
                    <span className="font-semibold text-slate-200 text-xs block">{m.name}</span>
                    <span className="text-[10px] text-slate-500 block">{m.desc}</span>
                  </div>
                  <button
                    onClick={() => onAddMotionOverlay && onAddMotionOverlay(m.id)}
                    className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 text-[10px] font-bold shrink-0 border border-cyan-500/30"
                  >
                    + Add to V3
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 12. RENDER QUEUE */}
          {activeTab === "render_queue" && (
            <div className="space-y-3">
              <span className="text-[11px] font-medium text-slate-400 block">Active Render Jobs ({renderJobs.length})</span>
              {renderJobs.length === 0 ? (
                <div className="p-4 text-center text-slate-500 rounded border border-slate-800/60 bg-slate-950/40">
                  <Film className="w-8 h-8 text-slate-600 mx-auto mb-1.5" />
                  <p>Queue is currently empty.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {renderJobs.map((job) => (
                    <div key={job.id} className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-200 truncate">{job.projectName || "Export Job"}</span>
                        <span className={`text-[10px] uppercase font-bold ${
                          job.status === "completed" ? "text-emerald-400" : (
                            job.status === "rendering" ? "text-cyan-400 animate-pulse" : "text-slate-400"
                          )
                        }`}>
                          {job.status}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-cyan-400 h-1.5 transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                        <span>{job.progress.toFixed(0)}% • {job.speed || "1.0x"}</span>
                        <span>{job.currentTime.toFixed(1)}s / {job.totalTime.toFixed(1)}s</span>
                      </div>

                      {job.status === "rendering" && (
                        <button
                          onClick={() => cancelRenderJob(job.id)}
                          className="w-full mt-1 py-0.5 rounded bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 text-[10px]"
                        >
                          Cancel Render
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 13. EXPORT ARCHIVE */}
          {activeTab === "history" && (
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-slate-400 block">Exported Files Archive</span>
              {renderJobs.filter(j => j.status === "completed").map((job) => (
                <div key={job.id} className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                  <p className="font-semibold text-slate-200 truncate">{job.outputPath}</p>
                  <p className="text-[9px] text-slate-500 font-mono">
                    {job.fileSize ? `${(job.fileSize / (1024 * 1024)).toFixed(2)} MB • ` : ""}
                    {job.completedAt ? new Date(job.completedAt).toLocaleTimeString() : ""}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 14. PROJECT SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-3">
              <span className="text-[11px] font-medium text-slate-400 block">Resolution & Canvas Settings</span>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Canvas Width (px)</label>
                <input
                  type="number"
                  value={project?.settings?.width ?? 1920}
                  onChange={(e) => onUpdateProjectSettings(Number(e.target.value), project?.settings?.height ?? 1080, project?.settings?.fps ?? 30)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Canvas Height (px)</label>
                <input
                  type="number"
                  value={project?.settings?.height ?? 1080}
                  onChange={(e) => onUpdateProjectSettings(project?.settings?.width ?? 1920, Number(e.target.value), project?.settings?.fps ?? 30)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Frame Rate (FPS)</label>
                <select
                  value={project?.settings?.fps ?? 30}
                  onChange={(e) => onUpdateProjectSettings(project?.settings?.width ?? 1920, project?.settings?.height ?? 1080, Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                >
                  <option value={24}>24 FPS (Cinematic)</option>
                  <option value={30}>30 FPS (Standard)</option>
                  <option value={60}>60 FPS (High Smoothness)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

