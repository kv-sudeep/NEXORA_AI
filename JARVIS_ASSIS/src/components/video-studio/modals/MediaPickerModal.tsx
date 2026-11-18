import React, { useState, useEffect } from "react";
import { FolderOpen, X, HardDrive, Film, Music, Image, Search, Plus, Check } from "lucide-react";
import { fetchDrives, scanDirectory, inspectMedia } from "../api";
import { MediaAsset } from "../types";

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportMedia: (asset: MediaAsset) => void;
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  isOpen,
  onClose,
  onImportMedia,
}) => {
  const [drives, setDrives] = useState<any[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [items, setItems] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [customPath, setCustomPath] = useState("");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDrives().then((d) => {
        setDrives(d);
        if (d.length > 0) {
          setSelectedPath(d[0].path);
          handleScan(d[0].path);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScan = async (path: string) => {
    if (!path) return;
    setIsScanning(true);
    try {
      const res = await scanDirectory(path);
      if (res.success) {
        setItems(res.items || []);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleImport = async (item: any) => {
    const meta = await inspectMedia(item.path);
    const asset: MediaAsset = {
      id: String(Date.now()),
      path: item.path,
      filename: item.name,
      duration: meta.duration || 5.0,
      type: item.type,
      video: meta.video,
      audio: meta.audio,
    };
    onImportMedia(asset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-950 border border-cyan-500/30 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.2)] overflow-hidden select-none text-xs text-slate-300 flex flex-col h-[520px]">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-100">Authorized Storage & Media Picker</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drive and Folder Bar */}
        <div className="p-4 border-b border-slate-900 bg-slate-950/60 flex items-center gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 block mb-1">Select Drive or System Directory</label>
            <select
              value={selectedPath}
              onChange={(e) => {
                setSelectedPath(e.target.value);
                handleScan(e.target.value);
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {drives.map((d) => (
                <option key={d.id} value={d.path}>
                  {d.name} {d.free_gb ? `• ${d.free_gb} GB Free` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="text-[10px] text-slate-400 block mb-1">Or Enter Exact Directory Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="D:\JARVIS_ASSIS"
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
              />
              <button
                onClick={() => handleScan(customPath)}
                disabled={isScanning || !customPath.trim()}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs"
              >
                Scan
              </button>
            </div>
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isScanning ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              <p>Scanning directory for media files...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600">
              <HardDrive className="w-8 h-8 mb-2" />
              <p>No supported media files found in this directory.</p>
              <p className="text-[10px] text-slate-700 mt-0.5">Supported formats: MP4, MKV, MOV, WebM, MP3, WAV, AAC, PNG, JPG, SRT</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {items.map((item, idx) => {
                const isSelected = selectedItem?.path === item.path;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedItem(item)}
                    className={`p-2.5 rounded border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                        : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {item.type === "video" ? (
                        <Film className="w-4 h-4 text-cyan-400 shrink-0" />
                      ) : item.type === "audio" ? (
                        <Music className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Image className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <div className="overflow-hidden">
                        <p className="font-medium text-slate-200 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-500">{item.size_mb} MB • {item.type}</p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImport(item);
                      }}
                      className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 font-semibold text-[10px] shrink-0"
                    >
                      Import
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-900 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">
            {items.length} files discovered in current directory
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded border border-slate-800 hover:bg-slate-900 text-slate-300 text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

