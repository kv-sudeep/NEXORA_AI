export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5" | "21:9";

export interface ProjectSettings {
  width: number;
  height: number;
  fps: number;
  aspectRatio: AspectRatio;
  sampleRate: number;
}

export interface TimelineClip {
  id: string;
  sourcePath?: string;
  name: string;
  trackId: string;
  timelineStart: number; // in seconds
  duration: number;      // in seconds
  sourceStart: number;   // trim in point
  sourceEnd: number;     // trim out point
  speed: number;         // 1.0 = normal
  volume: number;        // 1.0 = 100%
  opacity: number;       // 1.0 = 100%
  transform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
  colorAdjustments?: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
  textData?: {
    text: string;
    fontSize: number;
    color: string;
    backgroundColor?: string;
    position: "top" | "center" | "bottom" | "custom";
  };
  filterName?: string;
  motionType?: string;
  transition?: {
    type: string;
    duration: number;
  };
}

export interface TimelineTrack {
  id: string;
  type: "video" | "audio" | "text" | "overlay";
  name: string;
  order: number;
  muted: boolean;
  locked: boolean;
  solo: boolean;
  volume: number;
  clips: TimelineClip[];
}

export interface VideoProject {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
  tracks: TimelineTrack[];
  markers?: { time: number; label: string; color: string }[];
  assets?: MediaAsset[];
}

export interface MediaAsset {
  id: string;
  path: string;
  filename: string;
  duration: number;
  type: "video" | "audio" | "image" | "subtitle";
  video?: {
    width: number;
    height: number;
    codec: string;
    fps: number;
  };
  audio?: {
    codec: string;
    sampleRate: number;
  };
}

export interface RenderJob {
  id: string;
  projectId?: string;
  projectName?: string;
  outputPath: string;
  status: "queued" | "rendering" | "completed" | "failed" | "cancelled";
  progress: number;
  fps: number;
  speed: string;
  currentTime: number;
  totalTime: number;
  createdAt: string;
  fileSize?: number;
  error?: string;
}

export type SidebarTab =
  | "media"
  | "files"
  | "editor"
  | "audio"
  | "text"
  | "transitions"
  | "effects"
  | "color"
  | "ai"
  | "templates"
  | "motion"
  | "render_queue"
  | "history"
  | "settings";

