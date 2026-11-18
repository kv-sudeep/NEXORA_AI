import React, { useState, useEffect, useCallback } from 'react';
import { Background } from './Background';
import { Panel } from './Panel';
import { HudInput, HudButton } from './HudShell';
import { Play, Pause, Crop, Scissors, Waves, Mic, Video, SlidersHorizontal, Sparkles, Loader2, Check, AlertCircle, Target, MapPin, Newspaper, BarChart3, Settings, MessageCircle, Shield, Film } from 'lucide-react';
import { VideoStudioWorkspace } from '../video-studio/VideoStudioWorkspace';
import { DysonPhotoStudio } from '../video-studio/DysonPhotoStudio';

const BACKEND = "";

interface VideoOperation {
  type: "trim" | "cut" | "merge" | "convert" | "resize" |
        "brightness" | "contrast" | "saturation" | "grayscale" |
        "vintage" | "blur" | "text" | "watermark" | "rotate" |
        "crop" | "enhance" | "audio" | "generate" | "auto_lip" | "voice_audio";
  path?: string;
  paths?: string[];
  start?: number;
  end?: number;
  splitPoints?: number[];
  width?: number;
  height?: number;
  factor?: number;
  format?: string;
  degrees?: number;
  text?: string;
  watermarkPath?: string;
  title?: string;
  resolution?: string;
}

interface VideoResult {
  success: boolean;
  error?: string;
  input_path?: string;
  output_path?: string;
  operation?: string;
  parameters?: Record<string, any>;
  metadata?: any;
}

export function VideoStudio() {
  const [viewMode, setViewMode] = useState<'dyson_photos' | 'timeline_studio' | 'quick_hud'>('dyson_photos');
  const [videoPath, setVideoPath] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'enhance' | 'ai' | 'intel'>('edit');
  const [operation, setOperation] = useState<string>('');
  const [result, setResult] = useState<VideoResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [params, setParams] = useState<Record<string, any>>({});

  const operations = {
    edit: [
      { type: 'trim', label: 'TRIM / CUT', icon: Scissors },
      { type: 'crop', label: 'CROP', icon: Crop },
      { type: 'resize', label: 'RESIZE', icon: Video },
      { type: 'rotate', label: 'ROTATE', icon: Video },
      { type: 'convert', label: 'CONVERT', icon: Video },
    ],
    audio: [
      { type: 'audio', label: 'MUTE AUDIO', icon: Waves },
      { type: 'voice_audio', label: 'VOICE OVER', icon: Mic },
      { type: 'enhance', label: 'ENHANCE', icon: Sparkles },
    ],
    ai: [
      { type: 'generate', label: 'AI GENERATE', icon: Sparkles },
      { type: 'auto_lip', label: 'AUTO LIP SYNC', icon: Video },
      { type: 'merge', label: 'MERGE CLIPS', icon: Video },
    ],
    adjust: [
      { type: 'brightness', label: 'BRIGHTNESS', icon: SunIcon },
      { type: 'contrast', label: 'CONTRAST', icon: ContrastIcon },
      { type: 'saturation', label: 'SATURATION', icon: SaturationIcon },
      { type: 'grayscale', label: 'GRAYSCALE', icon: GrayscaleIcon },
      { type: 'vintage', label: 'VINTAGE', icon: FilterIcon },
      { type: 'blur', label: 'BLUR', icon: BlurIcon },
    ],
    intel: [
      { type: 'weapons', label: 'WEAPONS GPS', icon: Target },
      { type: 'locations', label: 'LOCATIONS', icon: MapPin },
      { type: 'news', label: 'LIVE NEWS', icon: Newspaper },
      { type: 'analytics', label: 'ANALYTICS', icon: BarChart3 },
      { type: 'settings', label: 'SETTINGS', icon: Settings },
      { type: 'chat', label: 'CHAT BOT', icon: MessageCircle },
    ],
  };

  const getOperationParams = (opType: string) => {
    switch (opType) {
      case 'trim':
      case 'cut':
        return { start: '0', end: '10' };
      case 'crop':
        return { width: '1920', height: '1080', x: '0', y: '0' };
      case 'resize':
        return { width: '1920', height: '1080' };
      case 'rotate':
        return { degrees: '90' };
      case 'brightness':
      case 'contrast':
      case 'saturation':
        return { factor: '1.0' };
      case 'convert':
        return { format: 'mp4' };
      case 'audio':
        return { action: 'mute' };
      case 'voice_audio':
        return { text: 'Hello World', voice: 'en-US' };
      case 'generate':
        return { prompt: 'Generate video', duration: '10' };
      case 'auto_lip':
        return { text: 'Hello World', voice: 'en-US' };
      default:
        return {};
    }
  };

  const analyzeVideo = useCallback(async () => {
    if (!videoPath) return;

    try {
      const response = await fetch(`${BACKEND}/api/jarvis/video/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: videoPath }),
      });
      const data = await response.json();
      setMetadata(data);
    } catch (error) {
      console.error('Failed to analyze video:', error);
    }
  }, [videoPath]);

  useEffect(() => {
    if (videoPath) {
      analyzeVideo();
    }
  }, [videoPath, analyzeVideo]);

  // Send operation to JARVIS main chat system
  const sendToJarvisChat = async (opType: string, opLabel: string) => {
    try {
      const message = `Hey JARVIS, handle ${opLabel} for video path: ${videoPath}${params.text ? ` with text "${params.text}"` : ''}${params.prompt ? ` prompt "${params.prompt}"` : ''}`;

      const response = await fetch('/api/jarvis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: 'Failed to contact JARVIS chat system' });
    }
  };

  const executeOperation = async () => {
    if (!videoPath || !operation) return;

    setIsProcessing(true);
    setResult(null);

    try {
      let endpoint: string;
      let body: Record<string, any> = {
        path: videoPath.replace(/^["']|["']$/g, ''), // Remove surrounding quotes if present
        ...params,
      };

      // Map operations to correct backend endpoints
      if (operation === 'trim') {
        endpoint = '/api/jarvis/video/edit/trim';
        body.start = parseFloat(params.start || '0');
        body.end = parseFloat(params.end || '10');
      } else if (operation === 'cut') {
        endpoint = '/api/jarvis/video/edit/cut';
        body.start = parseFloat(params.start || '0');
      } else if (operation === 'merge') {
        endpoint = '/api/jarvis/video/edit/merge';
        body.paths = videoPath.split(',');
        body.title = params.title || 'Merged video';
      } else if (operation === 'convert') {
        endpoint = '/api/jarvis/video/edit/convert';
        body.format = params.format || 'mp4';
      } else if (operation === 'resize') {
        endpoint = '/api/jarvis/video/edit/resize';
        body.width = parseInt(params.width || '1920');
        body.height = parseInt(params.height || '1080');
      } else if (operation === 'rotate') {
        endpoint = '/api/jarvis/video/edit';
        body.degrees = parseInt(params.degrees || '90');
      } else if (operation === 'brightness') {
        endpoint = '/api/jarvis/video/edit/adjust';
        body.property = 'brightness';
        body.value = parseFloat(params.factor || '1.0');
      } else if (operation === 'contrast') {
        endpoint = '/api/jarvis/video/edit/adjust';
        body.property = 'contrast';
        body.value = parseFloat(params.factor || '1.0');
      } else if (operation === 'saturation') {
        endpoint = '/api/jarvis/video/edit/adjust';
        body.property = 'saturation';
        body.value = parseFloat(params.factor || '1.0');
      } else if (operation === 'grayscale') {
        endpoint = '/api/jarvis/video/edit/filter';
        body.filter = 'grayscale';
      } else if (operation === 'vintage') {
        endpoint = '/api/jarvis/video/edit/filter';
        body.filter = 'vintage';
      } else if (operation === 'blur') {
        endpoint = '/api/jarvis/video/edit/filter';
        body.filter = 'blur';
      } else if (operation === 'crop') {
        endpoint = '/api/jarvis/video/edit';
        body.operation = 'crop';
        body.width = parseInt(params.width || '1920');
        body.height = parseInt(params.height || '1080');
        body.x = parseInt(params.x || '0');
        body.y = parseInt(params.y || '0');
      } else if (operation === 'audio') {
        endpoint = '/api/jarvis/video/audio';
        body.action = params.action || 'mute';
      } else if (operation === 'voice_audio') {
        endpoint = '/api/jarvis/video/voice_audio';
        body.text = params.text || 'Hello World';
        body.voice = params.voice || 'en-US';
      } else if (operation === 'generate') {
        // Generate routes to chat for AI processing
        endpoint = '/api/jarvis/chat';
        body = { message: `Generate a video with prompt: ${params.prompt || 'Generate video'}, duration: ${params.duration || 10}s` };
      } else if (operation === 'auto_lip') {
        // Auto-lip routes to chat for AI processing
        endpoint = '/api/jarvis/chat';
        body = { message: `Apply auto-lip sync to video "${videoPath}" with text: "${params.text || 'Hello World'}"` };
      } else if (['weapons', 'locations', 'news', 'analytics', 'settings', 'chat'].includes(operation)) {
        // For AI and Intel tab operations, send to JARVIS chat
        endpoint = '/api/jarvis/chat';
        const messages: Record<string, string> = {
          weapons: `Check weapons GPS locations and hologram targets for video ${videoPath}`,
          locations: `Show me the current locations and GPS data`,
          news: `Get me the latest live news updates`,
          analytics: `Show me video analytics and statistics`,
          settings: `Open JARVIS settings and configuration`,
          chat: `Open the chat bot interface to communicate with JARVIS`
        };
        body = { message: messages[operation] || operation };
      } else {
        endpoint = '/api/jarvis/video/edit';
        body.operation = operation;
      }

      const response = await fetch(`${BACKEND}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderParams = () => {
    switch (operation) {
      case 'trim':
      case 'cut':
        return (
          <div className="grid grid-cols-2 gap-3">
            <HudInput
              label="START (s)"
              value={params.start || '0'}
              onChange={(v) => setParams(p => ({ ...p, start: v }))}
              type="number"
            />
            <HudInput
              label="END (s)"
              value={params.end || '10'}
              onChange={(v) => setParams(p => ({ ...p, end: v }))}
              type="number"
            />
          </div>
        );
      case 'crop':
        return (
          <div className="grid grid-cols-2 gap-3">
            <HudInput label="WIDTH" value={params.width || '1920'} onChange={(v) => setParams(p => ({ ...p, width: v }))} type="number" />
            <HudInput label="HEIGHT" value={params.height || '1080'} onChange={(v) => setParams(p => ({ ...p, height: v }))} type="number" />
            <HudInput label="X (offset)" value={params.x || '0'} onChange={(v) => setParams(p => ({ ...p, x: v }))} type="number" />
            <HudInput label="Y (offset)" value={params.y || '0'} onChange={(v) => setParams(p => ({ ...p, y: v }))} type="number" />
          </div>
        );
      case 'resize':
        return (
          <div className="grid grid-cols-2 gap-3">
            <HudInput label="WIDTH" value={params.width || '1920'} onChange={(v) => setParams(p => ({ ...p, width: v }))} type="number" />
            <HudInput label="HEIGHT" value={params.height || '1080'} onChange={(v) => setParams(p => ({ ...p, height: v }))} type="number" />
          </div>
        );
      case 'rotate':
        return (
          <HudInput
            label="DEGREES (90, 180, 270)"
            value={params.degrees || '90'}
            onChange={(v) => setParams(p => ({ ...p, degrees: v }))}
            type="number"
          />
        );
      case 'brightness':
      case 'contrast':
      case 'saturation':
        return (
          <HudInput
            label={`${operation.toUpperCase()} FACTOR`}
            value={params.factor || '1.0'}
            onChange={(v) => setParams(p => ({ ...p, factor: v }))}
            type="number"
            step="0.1"
          />
        );
      case 'convert':
        return (
          <HudInput
            label="FORMAT"
            value={params.format || 'mp4'}
            onChange={(v) => setParams(p => ({ ...p, format: v }))}
          />
        );
      case 'audio':
        return (
          <select
            value={params.action || 'mute'}
            onChange={(e) => setParams(p => ({ ...p, action: e.target.value }))}
            className="w-full rounded border border-hud-cyan/30 bg-transparent px-3 py-2 text-sm text-hud-cyan"
          >
            <option value="mute">Mute Audio</option>
            <option value="volume">Adjust Volume</option>
            <option value="split">Split Audio</option>
          </select>
        );
      case 'voice_audio':
        return (
          <div className="grid grid-cols-2 gap-3">
            <HudInput
              label="TEXT"
              value={params.text || 'Hello World'}
              onChange={(v) => setParams(p => ({ ...p, text: v }))}
            />
            <select
              value={params.voice || 'en-US'}
              onChange={(e) => setParams(p => ({ ...p, voice: e.target.value }))}
              className="w-full rounded border border-hud-cyan/30 bg-transparent px-3 py-2 text-sm text-hud-cyan"
            >
              <option value="en-US">English (US)</option>
              <option value="en-UK">English (UK)</option>
              <option value="es-ES">Spanish</option>
              <option value="fr-FR">French</option>
            </select>
          </div>
        );
      case 'generate':
        return (
          <div className="grid grid-cols-2 gap-3">
            <HudInput
              label="PROMPT"
              value={params.prompt || 'Generate video'}
              onChange={(v) => setParams(p => ({ ...p, prompt: v }))}
            />
            <HudInput
              label="DURATION (s)"
              value={params.duration || '10'}
              onChange={(v) => setParams(p => ({ ...p, duration: v }))}
              type="number"
            />
          </div>
        );
      case 'auto_lip':
        return (
          <div className="grid grid-cols-1 gap-3">
            <HudInput
              label="TEXT FOR LIP SYNC"
              value={params.text || 'Hello World'}
              onChange={(v) => setParams(p => ({ ...p, text: v }))}
            />
            <select
              value={params.voice || 'en-US'}
              onChange={(e) => setParams(p => ({ ...p, voice: e.target.value }))}
              className="w-full rounded border border-hud-cyan/30 bg-transparent px-3 py-2 text-sm text-hud-cyan"
            >
              <option value="en-US">English (US)</option>
              <option value="en-UK">English (UK)</option>
              <option value="es-ES">Spanish</option>
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  if (viewMode === 'dyson_photos') {
    return (
      <div className="relative h-screen w-screen overflow-hidden">
        <DysonPhotoStudio />
        <div className="fixed bottom-1.5 right-3 z-50 flex items-center gap-1.5 bg-[#161324]/90 p-1 rounded-full border border-[#2a2442] shadow-xl text-[10px]">
          <button
            onClick={() => setViewMode('timeline_studio')}
            className="px-2 py-0.5 rounded-full text-[#8e85ad] hover:text-white font-mono transition-colors"
            title="Switch to Video Timeline Editor"
          >
            Video Timeline
          </button>
          <button
            onClick={() => setViewMode('quick_hud')}
            className="px-2 py-0.5 rounded-full text-[#8e85ad] hover:text-white font-mono transition-colors"
            title="Switch to Quick HUD Mode"
          >
            Quick HUD
          </button>
        </div>
      </div>
    );
  }

  if (viewMode === 'timeline_studio') {
    return (
      <div className="relative h-screen w-screen overflow-hidden">
        <VideoStudioWorkspace />
        <div className="fixed bottom-1.5 right-3 z-50 flex items-center gap-1.5 bg-[#161324]/90 p-1 rounded-full border border-[#2a2442] shadow-xl text-[10px]">
          <button
            onClick={() => setViewMode('dyson_photos')}
            className="px-2 py-0.5 rounded-full bg-[#8a2be2] text-white font-mono shadow-md"
            title="Switch to Dyson Photos Editor"
          >
            Dyson Photos
          </button>
          <button
            onClick={() => setViewMode('quick_hud')}
            className="px-2 py-0.5 rounded-full text-[#8e85ad] hover:text-white font-mono transition-colors"
            title="Switch to Quick HUD Mode"
          >
            Quick HUD
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Background />
      <main className="relative h-screen w-screen overflow-hidden p-4">
        {/* Header */}
        <header className="mb-4 flex items-center justify-between">
          <div className="font-display text-sm tracking-[0.3em] text-hud-cyan">
            ◣ VIDEO STUDIO · JARVIS 2.0 ◢
          </div>
          <button
            onClick={() => setViewMode('workspace')}
            className="px-3 py-1 rounded bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all"
          >
            Switch to Full Studio NLE Workspace
          </button>
        </header>

        {/* Video Path Input */}
        <Panel title="VIDEO SOURCE" className="mb-4">
          <HudInput
            label="VIDEO PATH"
            value={videoPath}
            onChange={setVideoPath}
            placeholder="D:/path/to/your/video.mp4"
          />
          {metadata && (
            <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
              <div><strong>Duration:</strong> {metadata.duration?.toFixed(2)}s</div>
              <div><strong>Resolution:</strong> {metadata.video?.width}x{metadata.video?.height}</div>
              <div><strong>FPS:</strong> {metadata.video?.fps}</div>
              <div><strong>Format:</strong> {metadata.format}</div>
            </div>
          )}
        </Panel>

        {/* Tab Navigation */}
        <div className="grid grid-cols-6 gap-2 mb-4">
          {[
            { id: 'edit', label: 'EDIT' },
            { id: 'audio', label: 'AUDIO' },
            { id: 'ai', label: 'AI' },
            { id: 'enhance', label: 'EFFECTS' },
            { id: 'intel', label: 'INTEL' },
            { id: 'chat', label: 'CHAT', isSpecial: true },
          ].map((tab) => (
            <HudButton
              key={tab.id}
              variant={activeTab === tab.id ? 'primary' : 'ghost'}
              onClick={() => setActiveTab(tab.id as any)}
              className="text-xs"
            >
              {tab.label}
              {tab.isSpecial && <Shield className="h-3 w-3 ml-1" />}
            </HudButton>
          ))}
        </div>

        {/* Operation Selection */}
        <Panel title={`SELECT ${activeTab.toUpperCase()} OPERATION`} className="mb-4">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {activeTab === 'edit' && operations.edit.map((op) => {
              const Icon = op.icon;
              return (
                <HudButton
                  key={op.type}
                  variant={operation === op.type ? 'primary' : 'ghost'}
                  onClick={() => {
                    setOperation(op.type);
                    setParams(getOperationParams(op.type));
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px]">{op.label}</span>
                </HudButton>
              );
            })}

            {activeTab === 'audio' && operations.audio.map((op) => {
              const Icon = op.icon;
              return (
                <HudButton
                  key={op.type}
                  variant={operation === op.type ? 'primary' : 'ghost'}
                  onClick={() => {
                    setOperation(op.type);
                    setParams(getOperationParams(op.type));
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px]">{op.label}</span>
                </HudButton>
              );
            })}

            {activeTab === 'ai' && operations.ai.map((op) => {
              const Icon = op.icon;
              return (
                <HudButton
                  key={op.type}
                  variant={operation === op.type ? 'primary' : 'ghost'}
                  onClick={() => {
                    setOperation(op.type);
                    setParams(getOperationParams(op.type));
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px]">{op.label}</span>
                </HudButton>
              );
            })}

            {activeTab === 'intel' && operations.intel.map((op) => {
              const Icon = op.icon;
              return (
                <HudButton
                  key={op.type}
                  variant={operation === op.type ? 'primary' : 'ghost'}
                  onClick={() => {
                    setOperation(op.type);
                    setParams(getOperationParams(op.type));
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px]">{op.label}</span>
                </HudButton>
              );
            })}
          </div>

          {/* Operation-specific Parameters */}
          {operation && renderParams()}

          {/* Execute Button */}
          <div className="mt-4 flex items-center gap-3">
            <HudButton
              onClick={executeOperation}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  PROCESSING...
                </span>
              ) : (
                'EXECUTE'
              )}
            </HudButton>
            <HudButton
              variant="ghost"
              onClick={() => {
                setOperation('');
                setParams({});
              }}
            >
              RESET
            </HudButton>
          </div>
        </Panel>

        {/* Result Display */}
        {result && (
          <Panel title="RESULT">
            <div className="text-xs">
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <Check className="h-4 w-4 text-hud-green" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-hud-red" />
                )}
                <strong>{result.success ? 'SUCCESS' : 'FAILED'}</strong>
              </div>
              <pre className="whitespace-pre-wrap bg-hud-cyan/5 p-3 rounded border border-hud-cyan/20 font-mono text-hud-cyan/70">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </Panel>
        )}
      </main>
    </>
  );
}

// Helper icons
const SunIcon = (props: any) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>;
const ContrastIcon = (props: any) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="12" x2="21" y2="12"></line></svg>;
const SaturationIcon = (props: any) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 0 20"></path><circle cx="12" cy="12" r="4"></circle></svg>;
const GrayscaleIcon = (props: any) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" fill="#ccc"></rect></svg>;
const FilterIcon = (props: any) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><filter x="0" y="0" width="200%" height="200%"><feTurbulence type="fractalNoise" baseFrequency="0.5"></feTurbulence></filter></svg>;
const BlurIcon = (props: any) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 12c-1.5-1.5-2-3-2-4.5"></path></svg>;