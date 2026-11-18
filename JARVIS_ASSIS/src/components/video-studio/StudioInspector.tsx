import React from "react";
import {
  SlidersHorizontal,
  RotateCw,
  Maximize2,
  Volume2,
  Sun,
  Contrast,
  Droplet,
  Gauge,
  Type,
  Layers,
  X
} from "lucide-react";
import { TimelineClip, VideoProject } from "./types";

interface StudioInspectorProps {
  clip: TimelineClip | null;
  project: VideoProject;
  onUpdateClip: (clip: TimelineClip) => void;
  onClose: () => void;
}

export const StudioInspector: React.FC<StudioInspectorProps> = ({
  clip,
  project,
  onUpdateClip,
  onClose,
}) => {
  if (!clip) {
    return (
      <div className="w-72 bg-slate-950 border-l border-slate-900 p-4 text-xs text-slate-500 flex flex-col items-center justify-center text-center select-none">
        <SlidersHorizontal className="w-8 h-8 text-slate-700 mb-2" />
        <p className="font-medium text-slate-400">NO CLIP SELECTED</p>
        <p className="text-[10px] text-slate-600 mt-1">Select a clip on the timeline to inspect its transform, audio, color, and effects.</p>
      </div>
    );
  }

  const isText = !!clip.textData;
  const isAudio = clip.trackId?.startsWith("track-a");

  return (
    <div className="w-72 bg-slate-950 border-l border-slate-900 flex flex-col h-full overflow-y-auto select-none z-20 text-xs text-slate-300">
      {/* Header */}
      <div className="h-10 px-3 border-b border-slate-900 flex items-center justify-between bg-slate-950/80">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-semibold text-slate-200 truncate text-[11px]">{clip.name}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-900 text-slate-500 hover:text-slate-300"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-4">
        {/* Timing parameters */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Timing</span>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 block">Start</span>
              <span className="font-mono text-cyan-400 font-semibold">{clip.timelineStart.toFixed(2)}s</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 block">Duration</span>
              <span className="font-mono text-cyan-400 font-semibold">{clip.duration.toFixed(2)}s</span>
            </div>
          </div>
        </div>

        {/* Text styling if text clip */}
        {isText && clip.textData && (
          <div className="space-y-3 pt-2 border-t border-slate-900">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Typography</span>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Text Content</label>
              <textarea
                value={clip.textData.text}
                onChange={(e) =>
                  onUpdateClip({
                    ...clip,
                    textData: { ...clip.textData!, text: e.target.value },
                  })
                }
                rows={2}
                className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Font Size</span>
                <span className="font-mono text-cyan-400">{clip.textData.fontSize}px</span>
              </div>
              <input
                type="range"
                min={16}
                max={96}
                value={clip.textData.fontSize}
                onChange={(e) =>
                  onUpdateClip({
                    ...clip,
                    textData: { ...clip.textData!, fontSize: Number(e.target.value) },
                  })
                }
                className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Position</label>
              <select
                value={clip.textData.position}
                onChange={(e) =>
                  onUpdateClip({
                    ...clip,
                    textData: { ...clip.textData!, position: e.target.value as any },
                  })
                }
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
              >
                <option value="top">Top</option>
                <option value="center">Center</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>
          </div>
        )}

        {/* Transforms (Scale, Rotation, Opacity) */}
        {!isAudio && (
          <div className="space-y-3 pt-2 border-t border-slate-900">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Transform</span>
            {/* Scale */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Scale</span>
                <span className="font-mono text-cyan-400">{clip.transform.scale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={3.0}
                step={0.05}
                value={clip.transform.scale}
                onChange={(e) =>
                  onUpdateClip({
                    ...clip,
                    transform: { ...clip.transform, scale: Number(e.target.value) },
                  })
                }
                className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
              />
            </div>

            {/* Rotation */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Rotation</span>
                <span className="font-mono text-cyan-400">{clip.transform.rotation}°</span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                value={clip.transform.rotation}
                onChange={(e) =>
                  onUpdateClip({
                    ...clip,
                    transform: { ...clip.transform, rotation: Number(e.target.value) },
                  })
                }
                className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
              />
            </div>

            {/* Opacity */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Opacity</span>
                <span className="font-mono text-cyan-400">{Math.round(clip.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={clip.opacity}
                onChange={(e) =>
                  onUpdateClip({
                    ...clip,
                    opacity: Number(e.target.value),
                  })
                }
                className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
              />
            </div>
          </div>
        )}

        {/* Audio Volume */}
        <div className="space-y-3 pt-2 border-t border-slate-900">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Audio & Speed</span>
          {/* Volume */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Volume</span>
              <span className="font-mono text-emerald-400">{Math.round(clip.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={2.0}
              step={0.05}
              value={clip.volume}
              onChange={(e) =>
                onUpdateClip({
                  ...clip,
                  volume: Number(e.target.value),
                })
              }
              className="w-full accent-emerald-400 h-1 bg-slate-800 rounded"
            />
          </div>

          {/* Speed */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Playback Speed</span>
              <span className="font-mono text-cyan-400">{clip.speed}x</span>
            </div>
            <input
              type="range"
              min={0.25}
              max={3.0}
              step={0.25}
              value={clip.speed}
              onChange={(e) =>
                onUpdateClip({
                  ...clip,
                  speed: Number(e.target.value),
                })
              }
              className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
            />
          </div>
        </div>

        {/* Color Grading if Video */}
        {!isAudio && !isText && (
          <div className="space-y-3 pt-2 border-t border-slate-900">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Color Grading</span>
            {/* Brightness */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Brightness</span>
                <span className="font-mono text-cyan-400">{(clip.colorAdjustments?.brightness || 0).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-0.5}
                max={0.5}
                step={0.05}
                value={clip.colorAdjustments?.brightness || 0}
                onChange={(e) =>
                  onUpdateClip({
                    ...clip,
                    colorAdjustments: {
                      ...(clip.colorAdjustments || { contrast: 1, saturation: 1 }),
                      brightness: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Contrast</span>
                <span className="font-mono text-cyan-400">{(clip.colorAdjustments?.contrast || 1).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.05}
                value={clip.colorAdjustments?.contrast || 1}
                onChange={(e) =>
                  onUpdateClip({
                    ...clip,
                    colorAdjustments: {
                      ...(clip.colorAdjustments || { brightness: 0, saturation: 1 }),
                      contrast: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Saturation</span>
                <span className="font-mono text-cyan-400">{(clip.colorAdjustments?.saturation || 1).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={2.5}
                step={0.05}
                value={clip.colorAdjustments?.saturation || 1}
                onChange={(e) =>
                  onUpdateClip({
                    ...clip,
                    colorAdjustments: {
                      ...(clip.colorAdjustments || { brightness: 0, contrast: 1 }),
                      saturation: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
              />
            </div>
          </div>
        )}

        {/* Visual Filter & Transitions if Video / Overlay */}
        {!isAudio && (
          <div className="space-y-3 pt-2 border-t border-slate-900">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Effects & Transitions</span>
            
            {/* Visual Filter */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Visual Filter</label>
              <select
                value={clip.filterName || "none"}
                onChange={(e) =>
                  onUpdateClip({
                    ...clip,
                    filterName: e.target.value === "none" ? undefined : e.target.value,
                  })
                }
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="none">Normal (No Filter)</option>
                <option value="noir">Film Noir (B&W High Contrast)</option>
                <option value="sepia">Vintage 70s Sepia</option>
                <option value="blur">Cinematic Box Blur</option>
                <option value="invert">Negative / Invert</option>
                <option value="cyberpunk">Cyberpunk Neon Glow</option>
                <option value="vivid">Vivid Color Saturation</option>
                <option value="teal_orange">Blockbuster Teal & Orange</option>
              </select>
            </div>

            {/* Transition */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Transition In</label>
              <select
                value={clip.transition?.type || "none"}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateClip({
                    ...clip,
                    transition: val === "none" ? undefined : { type: val, duration: clip.transition?.duration || 1.0 },
                  });
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 mb-2"
              >
                <option value="none">None (Hard Cut)</option>
                <option value="fade">Crossfade / Dissolve</option>
                <option value="dip_black">Dip to Black</option>
                <option value="dip_white">Dip to White</option>
                <option value="zoom_in">Zoom In Pop</option>
                <option value="slide_wipe">Slide Wipe</option>
              </select>

              {clip.transition && (
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Transition Duration</span>
                    <span className="font-mono text-cyan-400">{clip.transition.duration.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={3.0}
                    step={0.1}
                    value={clip.transition.duration}
                    onChange={(e) =>
                      onUpdateClip({
                        ...clip,
                        transition: { ...clip.transition!, duration: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

