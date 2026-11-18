"""
drive_indexer.py — Authorized Drive Discovery & Media Catalog Indexer
Discovers user-accessible storage drives and directories on Windows/Linux,
scans for audio/video/image media assets, extracts metadata, and maintains
a local search index for automated editing workflows.
"""
import json
import logging
import os
import shutil
import string
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

MEDIA_EXTENSIONS = {
    "video": {".mp4", ".mkv", ".mov", ".avi", ".webm", ".m4v", ".ts", ".flv", ".wmv"},
    "audio": {".mp3", ".wav", ".aac", ".flac", ".ogg", ".m4a", ".wma"},
    "image": {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tiff"},
    "subtitle": {".srt", ".vtt", ".ass", ".ssa"}
}
ALL_SUPPORTED = set().union(*MEDIA_EXTENSIONS.values())

INDEX_CACHE_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "media_index.json"


class DriveIndexer:
    """Discovers accessible drives and builds incremental media catalogs"""

    def __init__(self):
        self.catalog: List[Dict[str, Any]] = []
        self._load_cache()

    def _load_cache(self):
        if INDEX_CACHE_FILE.exists():
            try:
                with open(INDEX_CACHE_FILE, "r", encoding="utf-8") as f:
                    self.catalog = json.load(f)
            except Exception as e:
                logger.warning("Could not read media catalog cache: %s", e)
                self.catalog = []

    def _save_cache(self):
        try:
            INDEX_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(INDEX_CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(self.catalog, f, indent=2)
        except Exception as e:
            logger.warning("Could not write media catalog cache: %s", e)

    def get_authorized_drives(self) -> List[Dict[str, Any]]:
        """
        Discovers all mounted system and removable drives and user standard directories.
        Returns drive letter, label, free space, and total space.
        """
        drives = []

        # Windows drive letters A-Z
        if os.name == "nt":
            for letter in string.ascii_uppercase:
                root_path = f"{letter}:\\"
                if os.path.exists(root_path):
                    try:
                        total, used, free = shutil.disk_usage(root_path)
                        drives.append({
                            "id": f"drive_{letter}",
                            "path": root_path,
                            "name": f"Local Disk ({letter}:)",
                            "type": "drive",
                            "total_gb": round(total / (1024 ** 3), 2),
                            "free_gb": round(free / (1024 ** 3), 2),
                            "used_gb": round(used / (1024 ** 3), 2),
                            "percent_used": round((used / total) * 100, 1)
                        })
                    except (PermissionError, OSError):
                        pass
        else:
            try:
                total, used, free = shutil.disk_usage("/")
                drives.append({
                    "id": "root_drive",
                    "path": "/",
                    "name": "Root Drive (/)",
                    "type": "drive",
                    "total_gb": round(total / (1024 ** 3), 2),
                    "free_gb": round(free / (1024 ** 3), 2),
                    "used_gb": round(used / (1024 ** 3), 2),
                    "percent_used": round((used / total) * 100, 1)
                })
            except Exception:
                pass

        # Add user standard library directories
        home = Path.home()
        quick_folders = [
            ("Desktop", home / "Desktop"),
            ("Videos", home / "Videos"),
            ("Downloads", home / "Downloads"),
            ("Music", home / "Music"),
            ("Pictures", home / "Pictures"),
            ("Workspace Media", Path("D:/JARVIS_ASSIS"))
        ]
        for name, folder in quick_folders:
            if folder.exists():
                drives.append({
                    "id": f"folder_{name.lower().replace(' ', '_')}",
                    "path": str(folder),
                    "name": name,
                    "type": "folder",
                    "total_gb": None,
                    "free_gb": None
                })

        return drives

    def scan_directory(self, target_dir: str, max_depth: int = 3,
                       max_files: int = 300) -> Dict[str, Any]:
        """
        Recursively scans the given directory for media files.
        Extracts size, modification date, and media type.
        """
        target = Path(target_dir)
        if not target.exists() or not target.is_dir():
            return {"success": False, "error": f"Invalid directory: {target_dir}"}

        found_files = []
        try:
            for root, dirs, files in os.walk(str(target)):
                # Depth limiter
                rel = Path(root).relative_to(target)
                if len(rel.parts) > max_depth:
                    dirs.clear()
                    continue

                # Skip hidden/system directories
                dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ("node_modules", "$RECYCLE.BIN", "System Volume Information", "venv")]

                for f in files:
                    ext = Path(f).suffix.lower()
                    if ext in ALL_SUPPORTED:
                        fp = Path(root) / f
                        try:
                            st = fp.stat()
                            m_type = "video" if ext in MEDIA_EXTENSIONS["video"] else (
                                "audio" if ext in MEDIA_EXTENSIONS["audio"] else (
                                    "image" if ext in MEDIA_EXTENSIONS["image"] else "subtitle"
                                )
                            )
                            item = {
                                "name": f,
                                "path": str(fp),
                                "extension": ext,
                                "type": m_type,
                                "size_bytes": st.st_size,
                                "size_mb": round(st.st_size / (1024 * 1024), 2),
                                "modified": datetime.fromtimestamp(st.st_mtime).isoformat()
                            }
                            found_files.append(item)
                            if len(found_files) >= max_files:
                                break
                        except (PermissionError, OSError):
                            pass

                if len(found_files) >= max_files:
                    break

            # Merge with existing catalog without duplicates
            existing_paths = {c["path"] for c in self.catalog}
            for itm in found_files:
                if itm["path"] not in existing_paths:
                    self.catalog.append(itm)

            self._save_cache()

            return {
                "success": True,
                "scanned_directory": str(target),
                "count": len(found_files),
                "items": found_files
            }
        except Exception as e:
            logger.error("Scan error: %s", e)
            return {"success": False, "error": str(e)}

    def search_catalog(self, query: str = "", media_type: Optional[str] = None,
                       limit: int = 50) -> List[Dict[str, Any]]:
        """Searches indexed media by filename and type"""
        q = query.lower().strip()
        results = []
        for item in self.catalog:
            if media_type and item.get("type") != media_type:
                continue
            if not q or q in item.get("name", "").lower() or q in item.get("path", "").lower():
                results.append(item)
                if len(results) >= limit:
                    break
        return results


# Global indexer instance
drive_indexer = DriveIndexer()

