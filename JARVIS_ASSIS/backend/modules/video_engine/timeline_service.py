"""
timeline_service.py — Project Management and Timeline State Service
Manages non-destructive multitrack video editing projects, serialization,
autosave, versioning, and asset relinking for NEXORA AI Video Studio.
"""
import json
import logging
import os
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "video_projects"
DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_default_tracks() -> List[Dict[str, Any]]:
    """Generates standard multitrack layout: V3, V2, V1, T1, A1, A2, A3"""
    return [
        {
            "id": "track-v3",
            "type": "video",
            "name": "Video 3 (Overlay / PiP)",
            "order": 0,
            "muted": False,
            "locked": False,
            "solo": False,
            "volume": 1.0,
            "clips": []
        },
        {
            "id": "track-v2",
            "type": "video",
            "name": "Video 2 (B-Roll / Cutaways)",
            "order": 1,
            "muted": False,
            "locked": False,
            "solo": False,
            "volume": 1.0,
            "clips": []
        },
        {
            "id": "track-v1",
            "type": "video",
            "name": "Video 1 (Primary Footage)",
            "order": 2,
            "muted": False,
            "locked": False,
            "solo": False,
            "volume": 1.0,
            "clips": []
        },
        {
            "id": "track-t1",
            "type": "text",
            "name": "Text & Subtitles",
            "order": 3,
            "muted": False,
            "locked": False,
            "solo": False,
            "volume": 1.0,
            "clips": []
        },
        {
            "id": "track-a1",
            "type": "audio",
            "name": "Audio 1 (Dialogue / Mic)",
            "order": 4,
            "muted": False,
            "locked": False,
            "solo": False,
            "volume": 1.0,
            "clips": []
        },
        {
            "id": "track-a2",
            "type": "audio",
            "name": "Audio 2 (Sound Effects / Foley)",
            "order": 5,
            "muted": False,
            "locked": False,
            "solo": False,
            "volume": 1.0,
            "clips": []
        },
        {
            "id": "track-a3",
            "type": "audio",
            "name": "Audio 3 (Background Music)",
            "order": 6,
            "muted": False,
            "locked": False,
            "solo": False,
            "volume": 0.8,
            "clips": []
        }
    ]


class TimelineService:
    """Handles CRUD, autosave, and state management for editing projects"""

    def __init__(self, projects_dir: Optional[Path] = None):
        self.projects_dir = projects_dir or DATA_DIR
        self.projects_dir.mkdir(parents=True, exist_ok=True)

    def _project_file(self, project_id: str) -> Path:
        return self.projects_dir / f"{project_id}.json"

    def create_project(self, name: str = "Untitled Project",
                       aspect_ratio: str = "16:9",
                       fps: int = 30) -> Dict[str, Any]:
        """Creates a new empty project manifest with standard multitrack layout"""
        project_id = str(uuid.uuid4())
        dim_map = {
            "16:9": (1920, 1080),
            "9:16": (1080, 1920),
            "1:1": (1080, 1080),
            "4:5": (1080, 1350),
            "21:9": (2560, 1080)
        }
        width, height = dim_map.get(aspect_ratio, (1920, 1080))
        now = datetime.now().isoformat()

        project = {
            "id": project_id,
            "name": name,
            "version": "1.0.0",
            "createdAt": now,
            "updatedAt": now,
            "settings": {
                "width": width,
                "height": height,
                "fps": fps,
                "aspectRatio": aspect_ratio,
                "sampleRate": 48000
            },
            "tracks": get_default_tracks(),
            "markers": [],
            "assets": []
        }

        self.save_project(project)
        return project

    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Loads and returns a project by ID"""
        path = self._project_file(project_id)
        if not path.exists():
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error("Failed to load project %s: %s", project_id, e)
            return None

    def save_project(self, project: Dict[str, Any]) -> bool:
        """Persists project manifest to disk with updated timestamp"""
        project_id = project.get("id")
        if not project_id:
            project_id = str(uuid.uuid4())
            project["id"] = project_id

        project["updatedAt"] = datetime.now().isoformat()
        path = self._project_file(project_id)
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(project, f, indent=2)
            return True
        except Exception as e:
            logger.error("Failed to save project %s: %s", project_id, e)
            return False

    def list_projects(self) -> List[Dict[str, Any]]:
        """Lists all projects with lightweight metadata"""
        projects = []
        for file in sorted(self.projects_dir.glob("*.json"), key=os.path.getmtime, reverse=True):
            try:
                with open(file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    total_clips = sum(len(t.get("clips", [])) for t in data.get("tracks", []))
                    settings = data.get("settings", {})
                    projects.append({
                        "id": data.get("id"),
                        "name": data.get("name", "Untitled"),
                        "settings": {
                            "width": settings.get("width", 1920),
                            "height": settings.get("height", 1080),
                            "fps": settings.get("fps", 30),
                            "aspectRatio": settings.get("aspectRatio", "16:9"),
                            "sampleRate": settings.get("sampleRate", 48000),
                        },
                        "aspectRatio": settings.get("aspectRatio", "16:9"),
                        "fps": settings.get("fps", 30),
                        "clipCount": total_clips,
                        "createdAt": data.get("createdAt"),
                        "updatedAt": data.get("updatedAt")
                    })
            except Exception as e:
                logger.warning("Could not read project file %s: %s", file, e)
        return projects

    def duplicate_project(self, project_id: str, new_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Duplicates an existing project with a new ID"""
        original = self.get_project(project_id)
        if not original:
            return None

        new_project = json.loads(json.dumps(original))
        new_project["id"] = str(uuid.uuid4())
        new_project["name"] = new_name or f"{original.get('name', 'Project')} (Copy)"
        new_project["createdAt"] = datetime.now().isoformat()
        new_project["updatedAt"] = new_project["createdAt"]

        if self.save_project(new_project):
            return new_project
        return None

    def delete_project(self, project_id: str) -> bool:
        """Deletes a project file"""
        path = self._project_file(project_id)
        if path.exists():
            try:
                path.unlink()
                return True
            except Exception as e:
                logger.error("Failed to delete project %s: %s", project_id, e)
                return False
        return False


# Global service instance
timeline_service = TimelineService()

