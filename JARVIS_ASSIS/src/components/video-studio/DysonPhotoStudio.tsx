import React, { useState, useRef } from "react";
import { AIStudioBot } from "./AIStudioBot";
import {
  Move,
  Crop,
  Wand2,
  Type,
  Hand,
  ZoomIn,
  Search,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Share2,
  Bell,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  Undo2,
  Redo2,
  Plus,
  Download,
  Printer,
  Info,
  Save,
  FolderOpen,
  RefreshCw,
  Palette,
  Image as ImageIcon,
  MoreHorizontal,
  Grid,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  FlipHorizontal,
  FlipVertical,
  Link2,
  Paintbrush,
  Eraser,
  PenTool,
  Sparkles,
  Pipette,
  Stamp,
  Sliders,
  Check,
  X,
  FileText,
  SlidersHorizontal
} from "lucide-react";

export const DysonPhotoStudio: React.FC = () => {
  // Document state
  const [docName, setDocName] = useState("Mountain_Lake.psd");
  const [zoomLevel, setZoomLevel] = useState(66.7);
  const [activeTool, setActiveTool] = useState<string>("move");
  const [autoSelect, setAutoSelect] = useState("Layer");
  const [showTransformControls, setShowTransformControls] = useState(true);

  // Canvas Image & Transform State
  const [canvasImage, setCanvasImage] = useState("/mountain_lake.jpg");
  const [canvasMediaType, setCanvasMediaType] = useState<"image" | "video">("image");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [transform, setTransform] = useState({
    w: 1920,
    h: 1080,
    x: 0,
    y: 0,
    angle: 0,
    flipH: false,
    flipV: false,
  });

  // Color State
  const [fgColor, setFgColor] = useState("#8A2BE2");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [colorHue, setColorHue] = useState(270);
  const [rgbValues, setRgbValues] = useState({ r: 138, g: 43, b: 226, a: 100 });
  const [activeColorTab, setActiveColorTab] = useState<"color" | "swatches" | "gradients" | "patterns">("color");

  // Layers State
  const [layers, setLayers] = useState([
    {
      id: "layer-2",
      name: "Layer 2",
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: "Normal",
      thumbnail: "/mountain_lake.jpg",
      hasMask: true,
      hasAdjustmentSublayer: true,
      sublayerName: "Color Balance 1",
      sublayerVisible: true,
    },
    {
      id: "layer-1",
      name: "Layer 1",
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: "Normal",
      thumbnail: "/mountain_lake.jpg",
    },
    {
      id: "bg",
      name: "Background",
      visible: true,
      locked: true,
      opacity: 100,
      blendMode: "Normal",
      thumbnail: "/mountain_lake.jpg",
    },
  ]);
  const [selectedLayerId, setSelectedLayerId] = useState("layer-2");
  const [layerOpacity, setLayerOpacity] = useState(100);
  const [layerFill, setLayerFill] = useState(100);
  const [blendMode, setBlendMode] = useState("Normal");

  // Brushes State
  const [activeBrushTab, setActiveBrushTab] = useState<"brushes" | "settings">("brushes");
  const [brushSize, setBrushSize] = useState(124);
  const [brushSearch, setBrushSearch] = useState("");
  const [selectedBrush, setSelectedBrush] = useState("Soft Round");

  // History State
  const [historyItems, setHistoryItems] = useState([
    { id: 1, name: "Open", icon: ImageIcon },
    { id: 2, name: "Duplicate Layer", icon: Layers },
    { id: 3, name: "Color Balance", icon: Sliders },
    { id: 4, name: "Levels", icon: SlidersHorizontal },
    { id: 5, name: "New Layer", icon: Plus },
    { id: 6, name: "Brush Tool", icon: Paintbrush },
  ]);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(5);

  // Command Center State
  const [commandSearch, setCommandSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Modals & Menus State
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handlers
  const handleSwapColors = () => {
    const temp = fgColor;
    setFgColor(bgColor);
    setBgColor(temp);
  };

  const handleResetColors = () => {
    setFgColor("#8A2BE2");
    setBgColor("#FFFFFF");
  };

  const handleHexChange = (hex: string) => {
    setFgColor(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      setRgbValues({ r, g, b, a: 100 });
    }
  };

  const handleColorBoxClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const s = Math.round(x * 100);
    const l = Math.round((1 - y) * 50);
    const newHex = hslToHex(colorHue, s, l + (1 - s / 100) * 25);
    handleHexChange(newHex);
  };

  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      const isVid = file.type.startsWith("video/");
      setCanvasImage(url);
      setCanvasMediaType(isVid ? "video" : "image");
      setDocName(file.name);
      setHistoryItems((prev) => [
        ...prev,
        { id: Date.now(), name: `Import ${file.name.slice(0, 10)}`, icon: ImageIcon }
      ]);
      setActiveHistoryIndex(historyItems.length);
    }
  };

  const handleExport = () => {
    const link = document.createElement("a");
    link.download = docName.replace(".psd", ".png");
    link.href = canvasImage;
    link.click();
  };

  // Compute CSS filter for the image based on activeFilter and History
  const getCanvasFilter = () => {
    let f = "";
    if (activeFilter === "blur") f += "blur(4px) ";
    if (activeFilter === "sharpen") f += "contrast(1.4) saturate(1.2) ";
    if (activeFilter === "color") f += "hue-rotate(20deg) saturate(1.5) ";
    if (activeFilter === "grayscale") f += "grayscale(100%) ";
    return f.trim() || undefined;
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f0d19] text-[#e2def0] font-sans select-none overflow-hidden text-xs">
      {/* Hidden File Input for Image Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*,video/*"
        className="hidden"
      />

      {/* ══════════════════════════════════════════════════════════════════════
          1. TOP APPLICATION MENU BAR
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="h-9 bg-[#161324] border-b border-[#2a2542] px-3 flex items-center justify-between text-xs shrink-0 z-50">
        <div className="flex items-center gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-1.5 cursor-pointer">
            <div className="w-5 h-5 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-[#a855f7] stroke-2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-bold tracking-widest text-[#a855f7] text-[13px] font-sans">
              DYSON PHOTOS
            </span>
          </div>

          {/* Menu Dropdown Triggers */}
          <div className="flex items-center gap-1 text-[#b8b0cf] text-[11px] font-medium">
            {["File", "Edit", "Image", "Layer", "Select", "Filter", "View", "Window", "Help"].map((menu) => (
              <div key={menu} className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === menu ? null : menu)}
                  className={`px-2 py-1 rounded hover:bg-[#25203b] hover:text-white transition-colors ${
                    activeMenu === menu ? "bg-[#25203b] text-white" : ""
                  }`}
                >
                  {menu}
                </button>

                {/* Dropdown Menu */}
                {activeMenu === menu && (
                  <div className="absolute left-0 top-full mt-1 w-48 bg-[#1a162b] border border-[#342e52] rounded shadow-2xl py-1 z-50 text-[11px] text-[#ccc6e2]">
                    {menu === "File" && (
                      <>
                        <button
                          onClick={() => { fileInputRef.current?.click(); setActiveMenu(null); }}
                          className="w-full px-3 py-1.5 text-left hover:bg-[#6d28d9] hover:text-white flex justify-between"
                        >
                          <span>Open Image...</span><span className="text-[9px] text-[#8e85ad]">Ctrl+O</span>
                        </button>
                        <button
                          onClick={() => { setTransform({ w: 1920, h: 1080, x: 0, y: 0, angle: 0, flipH: false, flipV: false }); setActiveMenu(null); }}
                          className="w-full px-3 py-1.5 text-left hover:bg-[#6d28d9] hover:text-white flex justify-between"
                        >
                          <span>New Document</span><span className="text-[9px] text-[#8e85ad]">Ctrl+N</span>
                        </button>
                        <div className="h-px bg-[#2a2542] my-1" />
                        <button
                          onClick={() => { handleExport(); setActiveMenu(null); }}
                          className="w-full px-3 py-1.5 text-left hover:bg-[#6d28d9] hover:text-white flex justify-between"
                        >
                          <span>Export As PNG...</span><span className="text-[9px] text-[#8e85ad]">Ctrl+Shift+E</span>
                        </button>
                      </>
                    )}
                    {menu === "Edit" && (
                      <>
                        <button
                          onClick={() => {
                            if (activeHistoryIndex > 0) setActiveHistoryIndex(activeHistoryIndex - 1);
                            setActiveMenu(null);
                          }}
                          className="w-full px-3 py-1.5 text-left hover:bg-[#6d28d9] hover:text-white flex justify-between"
                        >
                          <span>Undo</span><span className="text-[9px] text-[#8e85ad]">Ctrl+Z</span>
                        </button>
                        <button
                          onClick={() => {
                            if (activeHistoryIndex < historyItems.length - 1) setActiveHistoryIndex(activeHistoryIndex + 1);
                            setActiveMenu(null);
                          }}
                          className="w-full px-3 py-1.5 text-left hover:bg-[#6d28d9] hover:text-white flex justify-between"
                        >
                          <span>Redo</span><span className="text-[9px] text-[#8e85ad]">Ctrl+Y</span>
                        </button>
                      </>
                    )}
                    {menu === "Filter" && (
                      <>
                        <button
                          onClick={() => { setActiveFilter(activeFilter === "blur" ? null : "blur"); setActiveMenu(null); }}
                          className="w-full px-3 py-1.5 text-left hover:bg-[#6d28d9] hover:text-white"
                        >
                          Box Blur...
                        </button>
                        <button
                          onClick={() => { setActiveFilter(activeFilter === "sharpen" ? null : "sharpen"); setActiveMenu(null); }}
                          className="w-full px-3 py-1.5 text-left hover:bg-[#6d28d9] hover:text-white"
                        >
                          Sharpen Edge...
                        </button>
                        <button
                          onClick={() => { setActiveFilter(activeFilter === "color" ? null : "color"); setActiveMenu(null); }}
                          className="w-full px-3 py-1.5 text-left hover:bg-[#6d28d9] hover:text-white"
                        >
                          Vivid Sunset Glow...
                        </button>
                      </>
                    )}
                    {menu !== "File" && menu !== "Edit" && menu !== "Filter" && (
                      <div className="px-3 py-2 text-[#7f769c] italic text-[10px]">
                        {menu} options available
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Utility Icons & User Avatar */}
        <div className="flex items-center gap-3">
          <button className="text-[#a49bbd] hover:text-white transition-colors" title="Workspace Layout">
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button className="text-[#a49bbd] hover:text-white transition-colors relative" title="Notifications">
            <Bell className="w-3.5 h-3.5" />
            <span className="w-1.5 h-1.5 bg-[#a855f7] rounded-full absolute -top-0.5 -right-0.5" />
          </button>
          <button
            onClick={() => setInfoModalOpen(true)}
            className="text-[#a49bbd] hover:text-white transition-colors"
            title="Preferences & Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          {/* User Profile Avatar */}
          <div className="w-6 h-6 rounded-full border border-amber-400/80 overflow-hidden cursor-pointer shadow-sm">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
              alt="User"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          2. TOOL OPTIONS BAR (Below Menu Bar)
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="h-8 bg-[#141121] border-b border-[#241f38] px-3 flex items-center justify-between text-xs shrink-0 select-none">
        <div className="flex items-center gap-3 text-[#a89fc2] text-[11px]">
          {/* Home button */}
          <button className="text-[#8e85ad] hover:text-white p-1 rounded hover:bg-[#201b33]">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-currentColor stroke-2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          </button>

          <div className="h-3 w-px bg-[#2a2542]" />

          {/* Auto-Select Option */}
          <div className="flex items-center gap-1.5">
            <input
              type="checkbox"
              id="auto-select"
              defaultChecked
              className="accent-[#8a2be2] rounded cursor-pointer w-3 h-3"
            />
            <label htmlFor="auto-select" className="cursor-pointer text-[11px] text-[#b3abc9]">
              Auto-Select:
            </label>
            <select
              value={autoSelect}
              onChange={(e) => setAutoSelect(e.target.value)}
              className="bg-[#1b172a] border border-[#2e2847] rounded px-1.5 py-0.5 text-[10px] text-[#e0daf2] focus:outline-none"
            >
              <option value="Layer">Layer</option>
              <option value="Group">Group</option>
            </select>
          </div>

          {/* Show Transform Controls */}
          <div className="flex items-center gap-1.5 ml-2">
            <input
              type="checkbox"
              id="show-transform"
              checked={showTransformControls}
              onChange={(e) => setShowTransformControls(e.target.checked)}
              className="accent-[#8a2be2] rounded cursor-pointer w-3 h-3"
            />
            <label htmlFor="show-transform" className="cursor-pointer text-[11px] text-[#b3abc9]">
              Show Transform Controls
            </label>
          </div>

          <div className="h-3 w-px bg-[#2a2542]" />

          {/* Alignment Icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTransform((t) => ({ ...t, x: -200 }))}
              className="p-1 rounded hover:bg-[#241f38] text-[#8e85ad] hover:text-white"
              title="Align Left"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTransform((t) => ({ ...t, x: 0 }))}
              className="p-1 rounded hover:bg-[#241f38] text-[#8e85ad] hover:text-white"
              title="Align Horizontal Center"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTransform((t) => ({ ...t, x: 200 }))}
              className="p-1 rounded hover:bg-[#241f38] text-[#8e85ad] hover:text-white"
              title="Align Right"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTransform((t) => ({ ...t, y: -100 }))}
              className="p-1 rounded hover:bg-[#241f38] text-[#8e85ad] hover:text-white"
              title="Align Top"
            >
              <AlignVerticalJustifyStart className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTransform((t) => ({ ...t, y: 0 }))}
              className="p-1 rounded hover:bg-[#241f38] text-[#8e85ad] hover:text-white"
              title="Align Vertical Center"
            >
              <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTransform((t) => ({ ...t, y: 100 }))}
              className="p-1 rounded hover:bg-[#241f38] text-[#8e85ad] hover:text-white"
              title="Align Bottom"
            >
              <AlignVerticalJustifyEnd className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-3 w-px bg-[#2a2542]" />

          {/* Distribute & Booleans */}
          <div className="flex items-center gap-1 text-[#8e85ad]">
            <button className="p-1 rounded hover:bg-[#241f38] hover:text-white" title="Distribute Horizontally">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-currentColor stroke-2">
                <path d="M4 4v16M20 4v16M9 9h6v6H9z" />
              </svg>
            </button>
            <button className="p-1 rounded hover:bg-[#241f38] hover:text-white" title="Combine Shapes">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-currentColor stroke-2">
                <rect x="3" y="3" width="11" height="11" rx="1" />
                <rect x="10" y="10" width="11" height="11" rx="1" />
              </svg>
            </button>
            <button className="p-1 rounded hover:bg-[#241f38] hover:text-white">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Share Button (Vibrant Purple Pill on Far Right) */}
        <button
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
            alert("Project URL copied to clipboard!");
          }}
          className="px-3 py-1 bg-[#8a2be2] hover:bg-[#7c25cf] text-white font-medium text-[11px] rounded-full flex items-center gap-1.5 shadow-[0_0_12px_rgba(138,43,226,0.5)] transition-all"
        >
          <Share2 className="w-3 h-3" />
          <span>Share</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          3. MAIN CENTER WORKSPACE (Left Tools | Canvas Viewport | Right Panels)
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT VERTICAL TOOLBAR */}
        <div className="w-10 bg-[#161324] border-r border-[#26203a] flex flex-col items-center py-2 gap-1 shrink-0 z-30 select-none">
          {[
            { id: "move", icon: Move, label: "Move Tool (V)" },
            { id: "marquee", icon: Crop, label: "Rectangular Marquee Tool (M)" },
            { id: "lasso", icon: Wand2, label: "Lasso Tool (L)" },
            { id: "crop", icon: Crop, label: "Crop Tool (C)" },
            { id: "eyedropper", icon: Pipette, label: "Eyedropper Tool (I)" },
            { id: "brush", icon: Paintbrush, label: "Brush Tool (B)" },
            { id: "stamp", icon: Stamp, label: "Clone Stamp Tool (S)" },
            { id: "eraser", icon: Eraser, label: "Eraser Tool (E)" },
            { id: "pen", icon: PenTool, label: "Pen Tool (P)" },
            { id: "type", icon: Type, label: "Horizontal Type Tool (T)" },
            { id: "hand", icon: Hand, label: "Hand Tool (H)" },
            { id: "zoom", icon: ZoomIn, label: "Zoom Tool (Z)" },
          ].map((tool) => {
            const Icon = tool.icon;
            const active = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                  active
                    ? "bg-[#6d28d9] text-white shadow-[0_0_8px_rgba(109,40,217,0.7)] border border-[#8a2be2]"
                    : "text-[#8e85ad] hover:text-white hover:bg-[#201b33]"
                }`}
                title={tool.label}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}

          <div className="w-5 h-px bg-[#2a2542] my-1" />

          {/* Color Swatch Boxes (Foreground / Background overlapping) */}
          <div className="relative w-7 h-7 my-1 cursor-pointer">
            {/* Background Color Square */}
            <div
              className="absolute right-0 bottom-0 w-4 h-4 rounded-sm border border-[#2a2542] shadow"
              style={{ backgroundColor: bgColor }}
              onClick={handleSwapColors}
              title="Background Color (Click to swap)"
            />
            {/* Foreground Color Square */}
            <div
              className="absolute left-0 top-0 w-4 h-4 rounded-sm border border-white shadow-md z-10"
              style={{ backgroundColor: fgColor }}
              title="Foreground Color"
            />
          </div>

          {/* Swap & Reset Color mini buttons */}
          <div className="flex items-center gap-1 text-[#8e85ad]">
            <button onClick={handleSwapColors} className="hover:text-white" title="Swap Colors (X)">
              <RefreshCw className="w-2.5 h-2.5" />
            </button>
            <button onClick={handleResetColors} className="hover:text-white" title="Reset Colors (D)">
              <div className="w-2.5 h-2.5 border border-[#8e85ad] flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white" />
              </div>
            </button>
          </div>
        </div>

        {/* CENTER VIEWPORT & CANVAS WITH RULERS */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0812]">
          {/* Document Tab Bar */}
          <div className="h-7 bg-[#13101f] border-b border-[#241f38] flex items-center px-2 shrink-0">
            <div className="h-full bg-[#1c182d] border-t-2 border-[#8a2be2] px-3 flex items-center gap-2 text-[11px] text-[#e0daf2] font-medium rounded-t">
              <span>{docName} @ {zoomLevel.toFixed(1)}% (Layer 2, RGB/8) *</span>
              <button
                onClick={() => setCanvasImage("/mountain_lake.jpg")}
                className="text-[#8e85ad] hover:text-white rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Horizontal Ruler */}
          <div className="h-4 bg-[#141121] border-b border-[#221c33] flex items-end pl-5 pr-2 select-none overflow-hidden shrink-0 text-[8px] font-mono text-[#6d638a]">
            {[0, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000].map((val) => (
              <div key={val} className="flex-1 border-l border-[#2e2745] pl-0.5 h-3">
                {val}
              </div>
            ))}
          </div>

          {/* Canvas Area with Vertical Ruler */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Vertical Ruler */}
            <div className="w-5 bg-[#141121] border-r border-[#221c33] flex flex-col select-none overflow-hidden shrink-0 text-[8px] font-mono text-[#6d638a] pt-1">
              {[0, 200, 400, 600, 800, 1000].map((val) => (
                <div key={val} className="flex-1 border-t border-[#2e2745] pt-0.5 pl-0.5">
                  {val}
                </div>
              ))}
            </div>

            {/* Central Canvas Viewport */}
            <div className="flex-1 flex items-center justify-center p-4 bg-[#0d0b17] overflow-auto relative">
              <div
                className="relative border border-[#2e2847] shadow-[0_10px_40px_rgba(0,0,0,0.8)] bg-black transition-all"
                style={{
                  transform: `translate(${transform.x}px, ${transform.y}px) rotate(${transform.angle}deg) scaleX(${
                    transform.flipH ? -1 : 1
                  }) scaleY(${transform.flipV ? -1 : 1})`,
                  width: `${(transform.w * zoomLevel) / 100 * 0.45}px`,
                  height: `${(transform.h * zoomLevel) / 100 * 0.45}px`,
                }}
              >
                {/* Canvas Artwork — image or video */}
                {canvasMediaType === "video" ? (
                  <video
                    ref={videoRef}
                    src={canvasImage}
                    className="w-full h-full object-cover select-none"
                    style={{ filter: getCanvasFilter(), opacity: layerOpacity / 100 }}
                    controls
                    autoPlay
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={canvasImage}
                    alt="Canvas Artwork"
                    className="w-full h-full object-cover select-none pointer-events-none"
                    style={{ filter: getCanvasFilter(), opacity: layerOpacity / 100 }}
                  />
                )}

                {/* Transform Handles Wireframe if active */}
                {showTransformControls && (
                  <div className="absolute inset-0 border border-[#8a2be2] pointer-events-none">
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-[#8a2be2]" />
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-[#8a2be2]" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-[#8a2be2]" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-[#8a2be2]" />
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-[#8a2be2]" />
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-[#8a2be2]" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Canvas Status Line */}
          <div className="h-6 bg-[#141121] border-t border-[#221c33] px-3 flex items-center justify-between text-[10px] text-[#8e85ad] shrink-0 font-mono">
            <div className="flex items-center gap-3">
              <span>{zoomLevel.toFixed(2)}%</span>
              <span className="text-[#3c3554]">|</span>
              <span>Doc: 5.93M/17.2M</span>
              <span className="text-[#3c3554]">|</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(200, z + 10))}
                className="hover:text-white"
              >
                + Zoom
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(20, z - 10))}
                className="hover:text-white"
              >
                - Zoom
              </button>
            </div>
            <div className="flex items-center gap-1 text-[#8e85ad] hover:text-white cursor-pointer">
              <span>{transform.w} × {transform.h} px (300 ppi)</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              BOTTOM DOCK PANEL (4 Sections: Brushes | History | Navigator | Command Center)
              ══════════════════════════════════════════════════════════════════ */}
          <div className="h-52 bg-[#161324] border-t border-[#26203a] grid grid-cols-4 divide-x divide-[#26203a] shrink-0">
            {/* Panel 1: Brushes / Brush Settings */}
            <div className="flex flex-col p-2 overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#2a2442] pb-1 mb-2">
                <div className="flex items-center gap-3 text-[11px] font-medium">
                  <button
                    onClick={() => setActiveBrushTab("brushes")}
                    className={activeBrushTab === "brushes" ? "text-white border-b-2 border-[#8a2be2] pb-0.5" : "text-[#8e85ad]"}
                  >
                    Brushes
                  </button>
                  <button
                    onClick={() => setActiveBrushTab("settings")}
                    className={activeBrushTab === "settings" ? "text-white border-b-2 border-[#8a2be2] pb-0.5" : "text-[#8e85ad]"}
                  >
                    Brush Settings
                  </button>
                </div>
                <Menu className="w-3 h-3 text-[#8e85ad]" />
              </div>

              {/* Size Slider */}
              <div className="flex items-center justify-between text-[10px] text-[#b0a7c9] mb-2">
                <span>Size:</span>
                <input
                  type="range"
                  min={1}
                  max={500}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-28 accent-[#8a2be2] h-1 bg-[#28223d] rounded"
                />
                <span className="font-mono text-[#8a2be2]">{brushSize} px</span>
              </div>

              {/* Search Brushes */}
              <div className="relative mb-2">
                <Search className="w-3 h-3 absolute left-2 top-2 text-[#7f769c]" />
                <input
                  type="text"
                  placeholder="Search Brushes"
                  value={brushSearch}
                  onChange={(e) => setBrushSearch(e.target.value)}
                  className="w-full bg-[#100e1a] border border-[#29233d] rounded pl-6 pr-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#8a2be2]"
                />
              </div>

              {/* Brush Presets Folder */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 text-[10px]">
                <div className="flex items-center gap-1 font-semibold text-[#8e85ad]">
                  <ChevronDown className="w-3 h-3" />
                  <span>General Brushes</span>
                </div>
                {["Soft Round", "Hard Round", "Soft Round Pressure", "Hard Round Pressure"].map((b) => (
                  <div
                    key={b}
                    onClick={() => setSelectedBrush(b)}
                    className={`px-2 py-1 rounded cursor-pointer flex items-center justify-between border ${
                      selectedBrush === b
                        ? "border-[#8a2be2] bg-[#221a38] text-white"
                        : "border-transparent text-[#b0a7c9] hover:bg-[#1e1930]"
                    }`}
                  >
                    <span>{b}</span>
                    <div className="w-8 h-1 bg-gradient-to-r from-transparent via-white to-transparent rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 2: History */}
            <div className="flex flex-col p-2 overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#2a2442] pb-1 mb-2">
                <div className="flex items-center gap-1 text-[11px] font-medium text-white">
                  <span>History</span>
                  <ChevronDown className="w-3 h-3 text-[#8e85ad]" />
                </div>
                <Menu className="w-3 h-3 text-[#8e85ad]" />
              </div>

              <div className="flex-1 overflow-y-auto space-y-0.5 text-[10px]">
                {historyItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = activeHistoryIndex === idx;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveHistoryIndex(idx)}
                      className={`px-2 py-1 rounded flex items-center gap-2 cursor-pointer transition-all ${
                        isActive
                          ? "bg-[#6d28d9] text-white font-medium shadow-[0_0_8px_rgba(109,40,217,0.5)]"
                          : idx < activeHistoryIndex
                          ? "text-[#c2badb] hover:bg-[#1e1930]"
                          : "text-[#62597d] hover:bg-[#1e1930]"
                      }`}
                    >
                      <Icon className="w-3 h-3 shrink-0" />
                      <span>{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Panel 3: Navigator */}
            <div className="flex flex-col p-2 overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#2a2442] pb-1 mb-2">
                <span className="text-[11px] font-medium text-white">Navigator</span>
                <Menu className="w-3 h-3 text-[#8e85ad]" />
              </div>

              {/* Navigator Preview with red view rect */}
              <div className="flex-1 flex items-center justify-center bg-[#0c0a14] rounded border border-[#2a2442] relative overflow-hidden p-1">
                <div className="relative max-h-full max-w-full">
                  {canvasMediaType === "video" ? (
                    <video
                      src={canvasImage}
                      className="w-full h-28 object-contain rounded"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <img
                      src={canvasImage}
                      alt="Navigator Thumbnail"
                      className="w-full h-28 object-contain rounded"
                    />
                  )}
                  {/* Red Viewport Box */}
                  <div className="absolute inset-4 border-2 border-red-500/80 pointer-events-none rounded-sm shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                </div>
              </div>
            </div>

            {/* Panel 4: Command Center */}
            <div className="flex flex-col p-2 overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#2a2442] pb-1 mb-2">
                <span className="text-[11px] font-medium text-white">Command Center</span>
                <Menu className="w-3 h-3 text-[#8e85ad]" />
              </div>

              {/* Search Commands */}
              <div className="relative mb-2">
                <Search className="w-3 h-3 absolute left-2 top-2 text-[#7f769c]" />
                <input
                  type="text"
                  placeholder="Search commands..."
                  value={commandSearch}
                  onChange={(e) => setCommandSearch(e.target.value)}
                  className="w-full bg-[#100e1a] border border-[#29233d] rounded pl-6 pr-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#8a2be2]"
                />
              </div>

              {/* 8 Quick Action Tiles */}
              <div className="grid grid-cols-4 gap-1.5 flex-1">
                {[
                  { name: "Blur", icon: Wand2, action: () => setActiveFilter(activeFilter === "blur" ? null : "blur") },
                  { name: "Sharpen", icon: Sparkles, action: () => setActiveFilter(activeFilter === "sharpen" ? null : "sharpen") },
                  { name: "Color", icon: Palette, action: () => setActiveFilter(activeFilter === "color" ? null : "color") },
                  { name: "Transform", icon: Move, action: () => setShowTransformControls(!showTransformControls) },
                  { name: "Filter", icon: Sliders, action: () => setActiveFilter(activeFilter === "grayscale" ? null : "grayscale") },
                  { name: "Adjustments", icon: SlidersHorizontal, action: () => setTransform((t) => ({ ...t, angle: t.angle + 15 })) },
                  { name: "Select", icon: Crop, action: () => setActiveTool("marquee") },
                  { name: "Tools", icon: Paintbrush, action: () => setActiveTool("brush") },
                ].map((tile) => {
                  const Icon = tile.icon;
                  return (
                    <button
                      key={tile.name}
                      onClick={tile.action}
                      className="p-1 rounded bg-[#1e1930] hover:bg-[#282142] border border-[#2e2747] hover:border-[#8a2be2] flex flex-col items-center justify-center gap-1 transition-all group"
                    >
                      <Icon className="w-3.5 h-3.5 text-[#a855f7] group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] text-[#c2badb] font-medium">{tile.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            RIGHT DOCK PANEL (Color Picker | Properties | Layers | Quick Actions)
            ══════════════════════════════════════════════════════════════════════ */}
        <div className="w-72 bg-[#161324] border-l border-[#26203a] flex flex-col shrink-0 overflow-y-auto select-none divide-y divide-[#26203a]">
          {/* CARD 1: COLOR PICKER */}
          <div className="p-3 space-y-2.5">
            <div className="flex items-center gap-3 text-[11px] font-medium border-b border-[#2a2442] pb-1">
              {["color", "swatches", "gradients", "patterns"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveColorTab(tab as any)}
                  className={`capitalize ${
                    activeColorTab === tab ? "text-white border-b-2 border-[#8a2be2] pb-0.5" : "text-[#8e85ad]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {/* Color Box */}
              <div
                className="w-8 h-8 rounded border border-[#3e365e] shrink-0 shadow-md"
                style={{ backgroundColor: fgColor }}
              />

              {/* Large 2D Color Picker Canvas / Gradient */}
              <div
                onClick={handleColorBoxClick}
                className="flex-1 h-20 rounded border border-[#2e2747] relative cursor-crosshair overflow-hidden shadow-inner"
                style={{
                  background: `linear-gradient(to top, black, transparent), linear-gradient(to right, white, hsl(${colorHue}, 100%, 50%))`,
                }}
              >
                {/* Selector Node */}
                <div
                  className="w-3 h-3 rounded-full border-2 border-white absolute shadow pointer-events-none"
                  style={{ top: "25%", left: "70%" }}
                />
              </div>

              {/* Vertical Rainbow Hue Slider */}
              <div className="w-4 h-20 rounded border border-[#2e2747] relative overflow-hidden shrink-0">
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={colorHue}
                  onChange={(e) => {
                    const h = Number(e.target.value);
                    setColorHue(h);
                    handleHexChange(hslToHex(h, 85, 55));
                  }}
                  className="w-20 -rotate-90 origin-top-left translate-y-20 h-4 appearance-none cursor-pointer absolute opacity-0"
                />
                <div
                  className="w-full h-full pointer-events-none"
                  style={{
                    background: "linear-gradient(to bottom, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                  }}
                />
              </div>
            </div>

            {/* Hex & RGBA Inputs */}
            <div className="grid grid-cols-5 gap-1.5 text-[10px] font-mono">
              <div className="col-span-2 flex items-center bg-[#100e1a] border border-[#2e2747] rounded px-1.5 py-0.5">
                <span className="text-[#8e85ad] mr-1">#</span>
                <input
                  type="text"
                  value={fgColor.replace("#", "")}
                  onChange={(e) => handleHexChange(`#${e.target.value}`)}
                  className="w-full bg-transparent text-white focus:outline-none uppercase"
                />
              </div>
              <div className="flex items-center bg-[#100e1a] border border-[#2e2747] rounded px-1 py-0.5">
                <span className="text-[#8e85ad] mr-0.5">R</span>
                <span className="text-white">{rgbValues.r}</span>
              </div>
              <div className="flex items-center bg-[#100e1a] border border-[#2e2747] rounded px-1 py-0.5">
                <span className="text-[#8e85ad] mr-0.5">G</span>
                <span className="text-white">{rgbValues.g}</span>
              </div>
              <div className="flex items-center bg-[#100e1a] border border-[#2e2747] rounded px-1 py-0.5">
                <span className="text-[#8e85ad] mr-0.5">B</span>
                <span className="text-white">{rgbValues.b}</span>
              </div>
            </div>
          </div>

          {/* CARD 2: PROPERTIES & ADJUSTMENTS */}
          <div className="p-3 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#2a2442] pb-1">
              <div className="flex items-center gap-3 text-[11px] font-medium">
                <span className="text-white border-b-2 border-[#8a2be2] pb-0.5">Properties</span>
                <span className="text-[#8e85ad]">Adjustments</span>
              </div>
              <Menu className="w-3 h-3 text-[#8e85ad]" />
            </div>

            {/* Layer Type Header */}
            <div className="flex items-center gap-1.5 text-[#b0a7c9] text-[11px] font-medium">
              <ImageIcon className="w-3.5 h-3.5 text-[#8a2be2]" />
              <span>Pixel Layer</span>
            </div>

            {/* Transform Accordion */}
            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center gap-1 font-semibold text-[#8e85ad]">
                <ChevronDown className="w-3 h-3" />
                <span>Transform</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pl-3">
                <div className="flex items-center justify-between bg-[#100e1a] border border-[#2e2747] rounded px-2 py-1">
                  <span className="text-[#8e85ad]">W</span>
                  <span className="font-mono text-white">{transform.w} px</span>
                  <Link2 className="w-2.5 h-2.5 text-[#8a2be2]" />
                </div>
                <div className="flex items-center justify-between bg-[#100e1a] border border-[#2e2747] rounded px-2 py-1">
                  <span className="text-[#8e85ad]">X</span>
                  <span className="font-mono text-white">{transform.x} px</span>
                </div>
                <div className="flex items-center justify-between bg-[#100e1a] border border-[#2e2747] rounded px-2 py-1">
                  <span className="text-[#8e85ad]">H</span>
                  <span className="font-mono text-white">{transform.h} px</span>
                </div>
                <div className="flex items-center justify-between bg-[#100e1a] border border-[#2e2747] rounded px-2 py-1">
                  <span className="text-[#8e85ad]">Y</span>
                  <span className="font-mono text-white">{transform.y} px</span>
                </div>
              </div>

              {/* Rotation & Flip Controls */}
              <div className="flex items-center justify-between pl-3 pt-1">
                <div className="flex items-center gap-1 bg-[#100e1a] border border-[#2e2747] rounded px-2 py-1">
                  <span className="text-[#8e85ad]">∠</span>
                  <span className="font-mono text-white">{transform.angle.toFixed(2)}°</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTransform((t) => ({ ...t, flipH: !t.flipH }))}
                    className={`p-1 rounded border ${
                      transform.flipH ? "border-[#8a2be2] bg-[#2d1e4e] text-white" : "border-[#2e2747] text-[#8e85ad] hover:text-white"
                    }`}
                    title="Flip Horizontal"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setTransform((t) => ({ ...t, flipV: !t.flipV }))}
                    className={`p-1 rounded border ${
                      transform.flipV ? "border-[#8a2be2] bg-[#2d1e4e] text-white" : "border-[#2e2747] text-[#8e85ad] hover:text-white"
                    }`}
                    title="Flip Vertical"
                  >
                    <FlipVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Align & Distribute */}
            <div className="space-y-1.5 text-[10px] pt-1">
              <div className="flex items-center gap-1 font-semibold text-[#8e85ad]">
                <ChevronDown className="w-3 h-3" />
                <span>Align and Distribute</span>
              </div>
              <div className="flex items-center justify-between pl-3 text-[#8e85ad]">
                <span>Align:</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setTransform((t) => ({ ...t, x: -100 }))} className="p-1 hover:text-white">
                    <AlignLeft className="w-3 h-3" />
                  </button>
                  <button onClick={() => setTransform((t) => ({ ...t, x: 0 }))} className="p-1 hover:text-white">
                    <AlignCenter className="w-3 h-3" />
                  </button>
                  <button onClick={() => setTransform((t) => ({ ...t, x: 100 }))} className="p-1 hover:text-white">
                    <AlignRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: LAYERS PANEL */}
          <div className="p-3 space-y-2.5 flex-1">
            <div className="flex items-center justify-between border-b border-[#2a2442] pb-1">
              <div className="flex items-center gap-3 text-[11px] font-medium">
                <span className="text-white border-b-2 border-[#8a2be2] pb-0.5">Layers</span>
                <span className="text-[#8e85ad]">Channels</span>
                <span className="text-[#8e85ad]">Paths</span>
                <span className="text-[#8e85ad]">History</span>
              </div>
              <Menu className="w-3 h-3 text-[#8e85ad]" />
            </div>

            {/* Filter Bar */}
            <div className="flex items-center justify-between text-[10px] text-[#8e85ad]">
              <div className="flex items-center gap-1">
                <span>Kind</span>
                <ChevronDown className="w-3 h-3" />
              </div>
              <div className="flex items-center gap-2">
                <ImageIcon className="w-3 h-3 hover:text-white cursor-pointer" />
                <SlidersHorizontal className="w-3 h-3 hover:text-white cursor-pointer" />
                <Type className="w-3 h-3 hover:text-white cursor-pointer" />
                <Crop className="w-3 h-3 hover:text-white cursor-pointer" />
              </div>
            </div>

            {/* Blending Mode & Opacity Controls */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <select
                value={blendMode}
                onChange={(e) => setBlendMode(e.target.value)}
                className="w-full bg-[#100e1a] border border-[#2e2747] rounded px-1.5 py-0.5 text-white focus:outline-none"
              >
                <option value="Normal">Normal</option>
                <option value="Multiply">Multiply</option>
                <option value="Screen">Screen</option>
                <option value="Overlay">Overlay</option>
                <option value="Darken">Darken</option>
              </select>
              <div className="flex items-center justify-between bg-[#100e1a] border border-[#2e2747] rounded px-1.5 py-0.5">
                <span className="text-[#8e85ad]">Opacity:</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={layerOpacity}
                  onChange={(e) => setLayerOpacity(Number(e.target.value))}
                  className="w-8 bg-transparent text-right font-mono text-white focus:outline-none"
                />
                <span className="text-white">%</span>
              </div>
            </div>

            {/* Lock Row & Fill Controls */}
            <div className="flex items-center justify-between text-[10px] text-[#8e85ad]">
              <div className="flex items-center gap-1.5">
                <span>Lock:</span>
                <Lock className="w-3 h-3 hover:text-white cursor-pointer" />
                <Paintbrush className="w-3 h-3 hover:text-white cursor-pointer" />
                <Move className="w-3 h-3 hover:text-white cursor-pointer" />
              </div>
              <div className="flex items-center gap-1">
                <span>Fill:</span>
                <span className="font-mono text-white">{layerFill}%</span>
              </div>
            </div>

            {/* Layer Stack Items */}
            <div className="space-y-1 pt-1">
              {/* Layer 2 (Active Purple Selection) */}
              <div
                onClick={() => setSelectedLayerId("layer-2")}
                className={`p-1.5 rounded flex items-center justify-between cursor-pointer border ${
                  selectedLayerId === "layer-2"
                    ? "bg-[#6d28d9] border-[#8a2be2] text-white shadow-[0_0_10px_rgba(109,40,217,0.5)]"
                    : "bg-[#181427] border-transparent text-[#b0a7c9]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-3 h-3 shrink-0" />
                  <img
                    src={canvasImage}
                    alt="L2"
                    className="w-7 h-5 object-cover rounded border border-white/20"
                  />
                  <span className="font-medium text-[11px]">Layer 2</span>
                </div>
                <div className="w-5 h-5 border border-white/40 bg-white/20 rounded" title="Layer Mask" />
              </div>

              {/* Sublayer: Color Balance 1 */}
              <div className="pl-6 flex items-center gap-2 text-[10px] text-[#8e85ad]">
                <Eye className="w-3 h-3" />
                <Sliders className="w-3.5 h-3.5 text-[#a855f7]" />
                <span className="italic">Color Balance 1</span>
              </div>

              {/* Layer 1 */}
              <div
                onClick={() => setSelectedLayerId("layer-1")}
                className={`p-1.5 rounded flex items-center justify-between cursor-pointer border ${
                  selectedLayerId === "layer-1"
                    ? "bg-[#6d28d9] border-[#8a2be2] text-white"
                    : "bg-[#181427] border-transparent text-[#b0a7c9] hover:bg-[#201b33]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-3 h-3 shrink-0" />
                  <img
                    src={canvasImage}
                    alt="L1"
                    className="w-7 h-5 object-cover rounded border border-white/20"
                  />
                  <span className="font-medium text-[11px]">Layer 1</span>
                </div>
              </div>

              {/* Background Layer */}
              <div
                onClick={() => setSelectedLayerId("bg")}
                className={`p-1.5 rounded flex items-center justify-between cursor-pointer border ${
                  selectedLayerId === "bg"
                    ? "bg-[#6d28d9] border-[#8a2be2] text-white"
                    : "bg-[#181427] border-transparent text-[#b0a7c9] hover:bg-[#201b33]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-3 h-3 shrink-0" />
                  <div className="w-7 h-5 bg-black rounded border border-white/10" />
                  <span className="font-medium text-[11px]">Background</span>
                </div>
                <Lock className="w-3 h-3 text-[#7f769c]" />
              </div>
            </div>
          </div>

          {/* CARD 4: QUICK ACTIONS */}
          <div className="p-3 space-y-2">
            <span className="text-[11px] font-semibold text-white block">Quick Actions</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded bg-[#1e1930] hover:bg-[#282142] border border-[#2e2747] text-white text-[10px] font-medium flex items-center gap-1.5 justify-center transition-all"
              >
                <FolderOpen className="w-3 h-3 text-[#a855f7]" />
                <span>Import Image</span>
              </button>
              <button
                onClick={() => {
                  setTransform({ w: 1920, h: 1080, x: 0, y: 0, angle: 0, flipH: false, flipV: false });
                  setDocName("Untitled-1.psd");
                }}
                className="p-1.5 rounded bg-[#1e1930] hover:bg-[#282142] border border-[#2e2747] text-white text-[10px] font-medium flex items-center gap-1.5 justify-center transition-all"
              >
                <Plus className="w-3 h-3 text-[#a855f7]" />
                <span>New Project</span>
              </button>
              <button
                onClick={() => alert("Project saved successfully!")}
                className="p-1.5 rounded bg-[#1e1930] hover:bg-[#282142] border border-[#2e2747] text-white text-[10px] font-medium flex items-center gap-1.5 justify-center transition-all"
              >
                <Save className="w-3 h-3 text-[#a855f7]" />
                <span>Save Project</span>
              </button>
              <button
                onClick={handleExport}
                className="p-1.5 rounded bg-[#1e1930] hover:bg-[#282142] border border-[#2e2747] text-white text-[10px] font-medium flex items-center gap-1.5 justify-center transition-all"
              >
                <Download className="w-3 h-3 text-[#a855f7]" />
                <span>Export As</span>
              </button>
              <button
                onClick={() => window.print()}
                className="p-1.5 rounded bg-[#1e1930] hover:bg-[#282142] border border-[#2e2747] text-white text-[10px] font-medium flex items-center gap-1.5 justify-center transition-all"
              >
                <Printer className="w-3 h-3 text-[#a855f7]" />
                <span>Print</span>
              </button>
              <button
                onClick={() => setInfoModalOpen(true)}
                className="p-1.5 rounded bg-[#1e1930] hover:bg-[#282142] border border-[#2e2747] text-white text-[10px] font-medium flex items-center gap-1.5 justify-center transition-all"
              >
                <Info className="w-3 h-3 text-[#a855f7]" />
                <span>Document Info</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DOCUMENT INFO MODAL */}
      {infoModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="w-96 bg-[#161324] border border-[#3e3561] rounded-lg p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2e2747] pb-2">
              <span className="font-bold text-white text-xs">Document Information</span>
              <button onClick={() => setInfoModalOpen(false)} className="text-[#8e85ad] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 text-[11px] text-[#ccc6e2]">
              <div className="flex justify-between"><span>File Name:</span><span className="font-mono text-white">{docName}</span></div>
              <div className="flex justify-between"><span>Resolution:</span><span className="font-mono text-white">1920 × 1080 px</span></div>
              <div className="flex justify-between"><span>Color Mode:</span><span className="font-mono text-white">RGB / 8-bit</span></div>
              <div className="flex justify-between"><span>Print Resolution:</span><span className="font-mono text-white">300 ppi</span></div>
              <div className="flex justify-between"><span>File Size:</span><span className="font-mono text-white">5.93 MB / 17.2 MB</span></div>
              <div className="flex justify-between"><span>Primary Color:</span><span className="font-mono text-[#a855f7]">{fgColor}</span></div>
            </div>
            <button
              onClick={() => setInfoModalOpen(false)}
              className="w-full py-1.5 rounded bg-[#8a2be2] hover:bg-[#7c25cf] text-white font-medium text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════════════════════
          DYSON AI — Floating AI Assistant Bot
          ══════════════════════════════════════════════════════════════════════ */}
      <AIStudioBot
        mode="photo"
        theme="purple"
        variant="fab"
        contextHint={`Document: ${docName}. Zoom: ${zoomLevel.toFixed(1)}%. Active tool: ${activeTool}. Active filter: ${activeFilter || "none"}. Primary color: ${fgColor}. Canvas size: ${transform.w}×${transform.h}px.`}
      />
    </div>
  );
};
