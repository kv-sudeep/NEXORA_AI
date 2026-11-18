import React, { useState } from 'react';
import { Panel } from './Panel';
import { HudInput, HudButton } from './HudShell';
import { Play, Pause, Crop, MoveRight, FileVideo, Upload, Youtube } from 'lucide-react';

interface VideoEditorProps {
  // Define any necessary props here
}

export function VideoEditor({}: VideoEditorProps) {
  const [videoPath, setVideoPath] = useState('');
  const [operation, setOperation] = useState('');
  const [params, setParams] = useState({});
  const [result, setResult] = useState<any>(null);

  const handleOperationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOperation(e.target.value);
    setParams({}); // Reset params when operation changes
  };

  const handleParamChange = (key: string, value: string) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoPath(e.target.value);
  };

  const executeOperation = async () => {
    if (!videoPath || !operation) {
      alert('Please provide video path and select an operation.');
      return;
    }

    try {
      const response = await fetch('/api/jarvis/video/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: videoPath, operation, ...params }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: 'Failed to execute operation.' });
      console.error('Operation error:', error);
    }
  };

  return (
    <Panel title="VIDEO EDITING SUITE" className="relative">
      <div className="space-y-3">
        <HudInput
          label="VIDEO SOURCE"
          value={videoPath}
          onChange={handlePathChange}
          placeholder="/path/to/your/video.mp4"
        />

        <div className="flex items-center gap-2">
          <label className="text-xs tracking-widest text-hud-cyan/60">OPERATION</label>
          <select
            value={operation}
            onChange={handleOperationChange}
            className="flex-1 rounded border border-hud-cyan/40 bg-transparent px-3 py-1.5 text-xs text-hud-cyan placeholder:text-hud-cyan/30 focus:border-hud-cyan focus:outline-none"
          >
            <option value="">SELECT OPERATION</option>
            <option value="trim">Trim Video</option>
            <option value="split">Split Video</option>
            <option value="merge">Merge Videos</option>
            <option value="convert">Convert Format</option>
            <option value="resize">Resize Video</option>
            <option value="adjust brightness">Adjust Brightness</option>
            <option value="adjust contrast">Adjust Contrast</option>
            <option value="adjust saturation">Adjust Saturation</option>
            <option value="apply filter:grayscale">Apply Grayscale</option>
            <option value="apply filter:vintage">Apply Vintage Filter</option>
            <option value="add text">Add Text Overlay</option>
            <option value="add watermark">Add Watermark</option>
            <option value="rotate">Rotate Video</option>
            <option value="cut">Cut Segment</option>
          </select>
        </div>

        {/* Operation-specific parameters */}
        {operation === 'trim' && (
          <div className="flex gap-2">
            <HudInput label="START (s)" value={params.start || ''} onChange={(v) => handleParamChange('start', v)} type="number" />
            <HudInput label="END (s)" value={params.end || ''} onChange={(v) => handleParamChange('end', v)} type="number" />
          </div>
        )}
        {operation === 'split' && (
          <HudInput label="SPLIT POINTS (comma-sep)" value={params.split_points || ''} onChange={(v) => handleParamChange('split_points', v)} />
        )}
        {(operation === 'merge' || operation === 'concatenate') && (
           <HudInput label="VIDEO PATHS (comma-sep)" value={params.paths || ''} onChange={(v) => handleParamChange('paths', v)} />
        )}
        {operation === 'convert' && (
          <HudInput label="FORMAT (e.g., mp4, mov)" value={params.format || 'mp4'} onChange={(v) => handleParamChange('format', v)} />
        )}
        {operation === 'resize' && (
          <div className="flex gap-2">
            <HudInput label="WIDTH" value={params.width || ''} onChange={(v) => handleParamChange('width', v)} type="number" />
            <HudInput label="HEIGHT" value={params.height || ''} onChange={(v) => handleParamChange('height', v)} type="number" />
          </div>
        )}
        {(operation === 'adjust brightness' || operation === 'adjust contrast' || operation === 'adjust saturation') && (
          <HudInput label={`${operation} FACTOR`} value={params.factor || ''} onChange={(v) => handleParamChange('factor', v)} type="number" step="0.1" />
        )}
        {operation === 'add text' && (
          <div className="flex flex-col gap-2">
            <HudInput label="TEXT" value={params.text || ''} onChange={(v) => handleParamChange('text', v)} />
            <HudInput label="POSITION (e.g., center, bottom-right)" value={params.position || 'bottom'} onChange={(v) => handleParamChange('position', v)} />
          </div>
        )}
        {operation === 'add watermark' && (
          <HudInput label="WATERMARK PATH" value={params.watermark_path || ''} onChange={(v) => handleParamChange('watermark_path', v)} />
        )}
        {operation === 'rotate' && (
          <HudInput label="DEGREES (90, 180, 270)" value={params.degrees || '90'} onChange={(v) => handleParamChange('degrees', v)} type="number" />
        )}
        {operation === 'cut' && (
          <HudInput label="START TIME (seconds)" value={params.start || ''} onChange={(v) => handleParamChange('start', v)} type="number" />
        )}

        <HudButton onClick={executeOperation} className="mt-2">
          EXECUTE OPERATION
        </HudButton>
      </div>

      {result && (
        <div className="mt-4 rounded border p-3 text-xs border-hud-cyan/30 bg-hud-cyan/5">
          <h3 className="font-bold tracking-wide mb-2">OPERATION RESULT</h3>
          <pre className="whitespace-pre-wrap text-hud-cyan/70 font-mono">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </Panel>
  );
}