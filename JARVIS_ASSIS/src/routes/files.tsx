import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { Background } from "@/components/jarvis/Background";
import { Button } from "@/components/ui/button";
import {
  Folder, FileText, Video, Music, Archive,
  ChevronLeft, ChevronRight, Search, Grid, List,
  RefreshCw, Star, HardDrive, Upload,
  Brain as LucideBrain,
  Copy, Settings as LucideSettings,
  Home, ChevronRight as Breadcrumb, AlertCircle, Loader2,
  FolderOpen, FileAudio, FileImage, FileCode,
  ExternalLink, X, Check,
  ArrowUp
} from "lucide-react";

const BACKEND = "";

interface FileItem {
  id: string;
  name: string;
  type: "folder" | "file";
  size?: number | null;
  size_str?: string;
  modified?: string;
  path: string;
  isFavorite?: boolean;
  ext?: string;
}

interface DirectoryResult {
  path: string;
  items: FileItem[];
  count: number;
  error?: string;
}

interface DriveInfo {
  letter: string;
  label: string;
  total?: string;
  free?: string;
  path: string;
}

// Format bytes to human-readable
function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Get icon for file type
function getFileIcon(item: FileItem) {
  if (item.type === "folder") return Folder;
  const name = item.name.toLowerCase();
  const ext = name.split(".").pop() || "";
  if (["mp4", "mkv", "mov", "avi", "webm", "m4v", "mpeg", "ts", "flv"].includes(ext)) return Video;
  if (["mp3", "wav", "aac", "flac", "ogg", "m4a", "wma"].includes(ext)) return FileAudio;
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "tiff", "ico"].includes(ext)) return FileImage;
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext)) return Archive;
  if (["js", "ts", "tsx", "jsx", "py", "html", "css", "json", "xml", "yaml", "yml", "sh", "bat", "ps1", "c", "cpp", "java", "go", "rs"].includes(ext)) return FileCode;
  if (["txt", "md", "log", "csv", "rtf"].includes(ext)) return FileText;
  if (["pdf"].includes(ext)) return FileText;
  return FileText;
}

// Get icon color class
function getIconColor(item: FileItem): string {
  if (item.type === "folder") return "text-yellow-400";
  const name = item.name.toLowerCase();
  const ext = name.split(".").pop() || "";
  if (["mp4", "mkv", "mov", "avi", "webm", "m4v", "mpeg"].includes(ext)) return "text-purple-400";
  if (["mp3", "wav", "aac", "flac", "ogg", "m4a"].includes(ext)) return "text-green-400";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) return "text-blue-400";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "text-orange-400";
  if (["py", "js", "ts", "tsx"].includes(ext)) return "text-cyan-400";
  return "text-hud-cyan/70";
}

export const Route = createFileRoute("/files")({
  component: FilesPage,
});

function FilesPage() {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [items, setItems] = useState<FileItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("nexora_fav_paths") || "[]"); }
    catch { return []; }
  });
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileItem | null } | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  // Show notification
  const notify = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Load directory from backend
  const loadDirectory = useCallback(async (path: string, addToHistory = true) => {
    setLoading(true);
    setError(null);
    setSelectedItems([]);
    setSearchTerm("");
    try {
      const url = path
        ? `${BACKEND}/api/jarvis/files?path=${encodeURIComponent(path)}`
        : `${BACKEND}/api/jarvis/files`;
      const res = await fetch(url);
      const data: DirectoryResult = await res.json();
      if (data.error) {
        setError(data.error);
        setItems([]);
      } else {
        // Add id and ext to each item
        const enriched = (data.items || []).map((item, i) => ({
          ...item,
          id: item.path || `item-${i}`,
          ext: item.name.split(".").pop()?.toLowerCase() || "",
        }));
        setItems(enriched);
        setCurrentPath(data.path);
        if (addToHistory && path !== history[historyIndex]) {
          const newHist = history.slice(0, historyIndex + 1).concat(data.path);
          setHistory(newHist);
          setHistoryIndex(newHist.length - 1);
        }
      }
    } catch (e: any) {
      setError(`Cannot connect to backend: ${e.message}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [history, historyIndex]);

  // Load drives list from backend
  const loadDrives = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/video/drives`);
      if (res.ok) {
        const data = await res.json();
        const driveList: DriveInfo[] = (data.drives || []).map((d: any) => ({
          letter: d.letter || d.path?.charAt(0) || "?",
          label: d.label || d.name || `Drive ${d.letter || "?"}`,
          total: d.total,
          free: d.free,
          path: d.path || `${d.letter}:\\`,
        }));
        setDrives(driveList);
      }
    } catch {
      // If video drives endpoint fails, add default Windows drives
      setDrives([
        { letter: "C", label: "System (C:)", path: "C:\\" },
        { letter: "D", label: "Data (D:)", path: "D:\\" },
      ]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDrives();
    // Load Desktop by default
    const initPath = "";
    loadDirectory(initPath, true);
  }, []);

  // Filter on search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItems(items);
    } else {
      const q = searchTerm.toLowerCase();
      setFilteredItems(items.filter(i => i.name.toLowerCase().includes(q)));
    }
  }, [items, searchTerm]);

  // Save favorites
  useEffect(() => {
    localStorage.setItem("nexora_fav_paths", JSON.stringify(favorites));
  }, [favorites]);

  // Close context menu on outside click
  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  // Open file or navigate into folder
  const openItem = async (item: FileItem) => {
    if (item.type === "folder") {
      await loadDirectory(item.path);
    } else {
      // Open file via backend os.startfile()
      try {
        setStatusMsg(`Opening ${item.name}...`);
        const res = await fetch(`${BACKEND}/api/jarvis/files/open`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: item.path }),
        });
        const data = await res.json();
        if (data.success) {
          notify(`Opened: ${item.name}`);
        } else {
          notify(`Failed to open: ${item.name}`, "error");
        }
        setStatusMsg("");
      } catch (e: any) {
        notify(`Error: ${e.message}`, "error");
        setStatusMsg("");
      }
    }
  };

  // Navigate back
  const goBack = () => {
    if (historyIndex > 0) {
      const prevPath = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      loadDirectory(prevPath, false);
    }
  };

  // Navigate forward
  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const nextPath = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      loadDirectory(nextPath, false);
    }
  };

  // Go up one level
  const goUp = () => {
    if (!currentPath) return;
    const sep = currentPath.includes("\\") ? "\\" : "/";
    const parts = currentPath.split(sep).filter(Boolean);
    if (parts.length <= 1) return;
    parts.pop();
    const parent = parts.join(sep) + sep;
    loadDirectory(parent.replace(/\\/g, "\\"));
  };

  const toggleSelect = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleFavorite = (item: FileItem) => {
    setFavorites(prev =>
      prev.includes(item.path)
        ? prev.filter(p => p !== item.path)
        : [...prev, item.path]
    );
  };

  const handleContextMenu = (e: React.MouseEvent, item?: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item: item || null });
  };

  // Breadcrumb segments
  const breadcrumbs = (() => {
    if (!currentPath) return [];
    const sep = currentPath.includes("\\") ? "\\" : "/";
    const parts = currentPath.split(sep).filter(Boolean);
    return parts.map((part, i) => ({
      label: part,
      path: parts.slice(0, i + 1).join(sep) + sep,
    }));
  })();

  // Windows user home shortcuts — backend serves real paths from Desktop by default
  const USER_HOME = "C:\\Users\\User";
  const sidebarLinks = [
    { icon: Home, label: "Desktop", path: "" },
    { icon: LucideBrain, label: "Documents", path: `${USER_HOME}\\Documents` },
    { icon: FileImage, label: "Images", path: `${USER_HOME}\\Pictures` },
    { icon: Video, label: "Videos", path: `${USER_HOME}\\Videos` },
    { icon: Music, label: "Music", path: `${USER_HOME}\\Music` },
    { icon: Upload, label: "Downloads", path: `${USER_HOME}\\Downloads` },
    { icon: HardDrive, label: "NEXORA Project", path: "D:\\JARVIS_ASSIS" },
  ];

  return (
    <>
      <Background />

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[200] flex items-center gap-2 px-4 py-2 rounded border text-sm font-display shadow-lg transition-all ${
          notification.type === "success"
            ? "bg-black/90 border-hud-cyan/50 text-hud-cyan"
            : "bg-black/90 border-red-500/50 text-red-400"
        }`}>
          {notification.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {notification.msg}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[100] bg-black/95 border border-hud-cyan/30 rounded shadow-xl p-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.item && (
            <>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-hud-cyan hover:bg-hud-cyan/10 rounded transition-colors"
                onClick={() => { contextMenu.item && openItem(contextMenu.item); setContextMenu(null); }}
              >
                <ExternalLink className="h-4 w-4" />
                {contextMenu.item.type === "folder" ? "Open" : "Open with default app"}
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-hud-cyan hover:bg-hud-cyan/10 rounded transition-colors"
                onClick={() => { contextMenu.item && toggleFavorite(contextMenu.item); setContextMenu(null); }}
              >
                <Star className="h-4 w-4" />
                {contextMenu.item && favorites.includes(contextMenu.item.path) ? "Remove from Favorites" : "Add to Favorites"}
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-hud-cyan hover:bg-hud-cyan/10 rounded transition-colors"
                onClick={() => { navigator.clipboard.writeText(contextMenu.item?.path || ""); notify("Path copied!"); setContextMenu(null); }}
              >
                <Copy className="h-4 w-4" />
                Copy Path
              </button>
              <div className="border-t border-hud-cyan/10 my-1" />
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-hud-cyan/50 hover:bg-hud-cyan/5 rounded transition-colors"
                onClick={() => { 
                  contextMenu.item && alert(`Name: ${contextMenu.item.name}\nPath: ${contextMenu.item.path}\nType: ${contextMenu.item.type}\nSize: ${formatBytes(contextMenu.item.size)}\nModified: ${contextMenu.item.modified}`);
                  setContextMenu(null);
                }}
              >
                <LucideSettings className="h-4 w-4" />
                Properties
              </button>
            </>
          )}
          {!contextMenu.item && (
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-hud-cyan hover:bg-hud-cyan/10 rounded transition-colors"
              onClick={() => { loadDirectory(currentPath); setContextMenu(null); }}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          )}
        </div>
      )}

      <main ref={mainRef} className="relative h-screen w-screen overflow-hidden flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-black/40 border-b border-hud-cyan/20 shrink-0">
          <span className="font-display text-hud-cyan text-sm font-bold tracking-widest mr-2">NEXORA FILES</span>

          {/* Nav buttons */}
          <Button variant="ghost" size="sm" onClick={goBack} disabled={historyIndex <= 0} title="Back">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goForward} disabled={historyIndex >= history.length - 1} title="Forward">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goUp} title="Up">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => loadDirectory(currentPath)} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          {/* Breadcrumb path bar */}
          <div className="flex-1 flex items-center gap-1 px-3 py-1 bg-black/40 border border-hud-cyan/20 rounded text-sm text-hud-cyan/80 font-mono overflow-x-auto">
            <button
              className="hover:text-hud-cyan shrink-0"
              onClick={() => loadDirectory("")}
            >
              <Home className="h-3.5 w-3.5" />
            </button>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1 shrink-0">
                <Breadcrumb className="h-3 w-3 text-hud-cyan/30" />
                <button
                  className="hover:text-hud-cyan hover:underline max-w-[160px] truncate"
                  onClick={() => loadDirectory(crumb.path)}
                >
                  {crumb.label}
                </button>
              </span>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-hud-cyan/50" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-7 pr-3 py-1.5 bg-black/40 border border-hud-cyan/20 rounded text-sm text-foreground placeholder:text-hud-cyan/30 w-48 focus:outline-none focus:border-hud-cyan/50"
            />
            {searchTerm && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearchTerm("")}>
                <X className="h-3 w-3 text-hud-cyan/50" />
              </button>
            )}
          </div>

          {/* View toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")}
            title={viewMode === "grid" ? "List view" : "Grid view"}
          >
            {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>

          <Link to="/" className="text-xs text-hud-cyan/50 hover:text-hud-cyan ml-2">← HUD</Link>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <aside className="w-52 bg-black/30 border-r border-hud-cyan/20 overflow-y-auto shrink-0 flex flex-col">
            {/* Quick access */}
            <div className="p-3">
              <div className="text-xs text-hud-cyan/40 font-display tracking-widest mb-2 uppercase">Quick Access</div>
              <nav className="space-y-0.5">
                {sidebarLinks.map(link => (
                  <button
                    key={link.label}
                    onClick={() => link.path !== null ? loadDirectory(link.path) : undefined}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-hud-cyan/70 hover:bg-hud-cyan/10 hover:text-hud-cyan transition-colors"
                  >
                    <link.icon className="h-4 w-4 shrink-0" />
                    <span>{link.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Favorites */}
            {favorites.length > 0 && (
              <div className="px-3 pb-3">
                <div className="text-xs text-hud-cyan/40 font-display tracking-widest mb-2 uppercase">Favorites</div>
                <nav className="space-y-0.5">
                  {favorites.map(favPath => {
                    const label = favPath.split("\\").pop() || favPath.split("/").pop() || favPath;
                    return (
                      <button
                        key={favPath}
                        onClick={() => loadDirectory(favPath)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-yellow-400/70 hover:bg-yellow-400/10 hover:text-yellow-400 transition-colors"
                      >
                        <Star className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            )}

            {/* Drives */}
            <div className="px-3 pb-3 mt-auto">
              <div className="text-xs text-hud-cyan/40 font-display tracking-widest mb-2 uppercase">Drives</div>
              <nav className="space-y-0.5">
                {drives.map(drive => (
                  <button
                    key={drive.path}
                    onClick={() => loadDirectory(drive.path)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-hud-cyan/70 hover:bg-hud-cyan/10 hover:text-hud-cyan transition-colors"
                  >
                    <HardDrive className="h-4 w-4 shrink-0" />
                    <span className="truncate">{drive.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div
            className="flex-1 overflow-y-auto relative"
            onContextMenu={e => handleContextMenu(e)}
            onClick={() => setSelectedItems([])}
          >
            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
                <div className="flex items-center gap-2 text-hud-cyan">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-display text-sm">Loading...</span>
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="p-8 text-center">
                <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
                <p className="text-red-400 font-display text-sm">{error}</p>
                <Button variant="ghost" size="sm" className="mt-3" onClick={() => loadDirectory(currentPath)}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Retry
                </Button>
              </div>
            )}

            {/* Selection bar */}
            {selectedItems.length > 0 && (
              <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 bg-hud-cyan/10 border-b border-hud-cyan/30 backdrop-blur-sm">
                <span className="text-sm text-hud-cyan font-display">{selectedItems.length} selected</span>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const paths = selectedItems.map(id => {
                      const f = filteredItems.find(i => i.id === id);
                      return f?.path || "";
                    }).filter(Boolean).join("\n");
                    navigator.clipboard.writeText(paths);
                    notify("Paths copied!");
                  }}
                >
                  <Copy className="h-4 w-4 mr-1" /> Copy Paths
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedItems([])}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-hud-cyan/50">
                <FolderOpen className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-display text-sm">
                  {searchTerm ? "No results found" : "This folder is empty"}
                </p>
                {searchTerm && (
                  <button className="mt-2 text-xs text-hud-cyan underline" onClick={() => setSearchTerm("")}>Clear search</button>
                )}
              </div>
            )}

            {/* File Grid */}
            {!error && filteredItems.length > 0 && viewMode === "grid" && (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredItems.map(file => {
                  const FileIcon = getFileIcon(file);
                  const iconColor = getIconColor(file);
                  const isSelected = selectedItems.includes(file.id);
                  const isFav = favorites.includes(file.path);

                  return (
                    <div
                      key={file.id}
                      onDoubleClick={e => { e.stopPropagation(); openItem(file); }}
                      onClick={e => { e.stopPropagation(); toggleSelect(file.id); }}
                      onContextMenu={e => { e.stopPropagation(); handleContextMenu(e, file); }}
                      className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all group ${
                        isSelected
                          ? "bg-hud-cyan/15 border-hud-cyan shadow-[0_0_10px_rgba(0,255,255,0.15)]"
                          : "bg-black/20 border-hud-cyan/10 hover:bg-black/40 hover:border-hud-cyan/30"
                      }`}
                    >
                      {/* Fav indicator */}
                      {isFav && <Star className="absolute top-2 right-2 h-3 w-3 text-yellow-400 fill-yellow-400" />}

                      <FileIcon className={`h-10 w-10 ${iconColor}`} />

                      <div className="w-full text-center">
                        <div className="text-xs font-display text-foreground truncate leading-tight" title={file.name}>
                          {file.name}
                        </div>
                        {file.type === "file" && file.size != null && (
                          <div className="text-[10px] text-hud-cyan/40 mt-0.5">{formatBytes(file.size)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* File List */}
            {!error && filteredItems.length > 0 && viewMode === "list" && (
              <div className="p-2">
                <div className="grid grid-cols-[1.5rem_2.5rem_1fr_8rem_8rem] gap-2 px-3 py-1.5 text-xs text-hud-cyan/40 font-display border-b border-hud-cyan/10 mb-1 uppercase tracking-widest">
                  <span />
                  <span />
                  <span>Name</span>
                  <span className="text-right">Size</span>
                  <span className="text-right">Modified</span>
                </div>
                {filteredItems.map(file => {
                  const FileIcon = getFileIcon(file);
                  const iconColor = getIconColor(file);
                  const isSelected = selectedItems.includes(file.id);
                  const isFav = favorites.includes(file.path);

                  return (
                    <div
                      key={file.id}
                      onDoubleClick={e => { e.stopPropagation(); openItem(file); }}
                      onClick={e => { e.stopPropagation(); toggleSelect(file.id); }}
                      onContextMenu={e => { e.stopPropagation(); handleContextMenu(e, file); }}
                      className={`grid grid-cols-[1.5rem_2.5rem_1fr_8rem_8rem] gap-2 items-center px-3 py-2 rounded cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-hud-cyan/15 border border-hud-cyan/50"
                          : "hover:bg-black/40 border border-transparent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(file.id)}
                        onClick={e => e.stopPropagation()}
                        className="h-3.5 w-3.5 accent-cyan-400"
                      />
                      <FileIcon className={`h-5 w-5 ${iconColor}`} />
                      <div className="min-w-0">
                        <div className="text-sm font-display text-foreground truncate">{file.name}</div>
                        {isFav && <Star className="inline h-2.5 w-2.5 text-yellow-400 fill-yellow-400 ml-1" />}
                      </div>
                      <div className="text-xs text-hud-cyan/50 text-right font-mono">
                        {file.type === "file" && file.size != null ? formatBytes(file.size) : "—"}
                      </div>
                      <div className="text-xs text-hud-cyan/50 text-right font-mono truncate">
                        {file.modified || "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="shrink-0 flex items-center justify-between px-4 py-1.5 bg-black/40 border-t border-hud-cyan/15 text-xs text-hud-cyan/50 font-mono">
          <div className="flex items-center gap-4">
            <span>{filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}</span>
            {selectedItems.length > 0 && (
              <span className="text-hud-cyan/80">{selectedItems.length} selected</span>
            )}
            {statusMsg && (
              <span className="text-hud-cyan flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {statusMsg}
              </span>
            )}
          </div>
          <div className="truncate max-w-[50%]">{currentPath || "Desktop"}</div>
        </div>
      </main>
    </>
  );
}
