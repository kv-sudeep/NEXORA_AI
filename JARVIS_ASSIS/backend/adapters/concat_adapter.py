"""
concat_adapter.py — Clean Service Adapter for Concat Video Editor Integration
Implements JSON-RPC and MCP compatible operations:
create_project, open_project, import_media, add_clip, trim_clip, split_clip,
add_caption, add_title, apply_effect, add_audio, export_project, get_render_status, cancel_render.
Decouples NEXORA AI from internal implementation details and provides seamless fallback.
"""
import json
import logging
import os
import shutil
import socket
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

CONCAT_BIN = shutil.which("concat")
CONCAT_RPC_PORT = int(os.getenv("CONCAT_RPC_PORT", "9876"))


class ConcatAdapter:
    """Service adapter exposing standardized NLE operations to NEXORA AI"""

    def __init__(self):
        self.is_concat_installed = CONCAT_BIN is not None
        self.rpc_port = CONCAT_RPC_PORT

    def _send_json_rpc(self, method: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Sends JSON-RPC request to running Concat instance if available"""
        if not self.is_concat_installed:
            return None
        payload = {
            "jsonrpc": "2.0",
            "id": str(uuid.uuid4()),
            "method": method,
            "params": params
        }
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(2.0)
                s.connect(("127.0.0.1", self.rpc_port))
                s.sendall(json.dumps(payload).encode("utf-8") + b"\n")
                data = s.recv(65536)
                if data:
                    return json.loads(data.decode("utf-8")).get("result")
        except Exception:
            return None

    def create_project(self, name: str = "Concat Project",
                       aspect_ratio: str = "16:9",
                       fps: int = 30) -> Dict[str, Any]:
        """Creates a new project manifest"""
        rpc_res = self._send_json_rpc("create_project", {"name": name, "aspectRatio": aspect_ratio, "fps": fps})
        if rpc_res:
            return rpc_res

        from modules.video_engine.timeline_service import timeline_service
        return timeline_service.create_project(name=name, aspect_ratio=aspect_ratio, fps=fps)

    def open_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Opens and loads project"""
        rpc_res = self._send_json_rpc("open_project", {"projectId": project_id})
        if rpc_res:
            return rpc_res

        from modules.video_engine.timeline_service import timeline_service
        return timeline_service.get_project(project_id)

    def import_media(self, project_id: str, file_path: str) -> Dict[str, Any]:
        """Inspects media file and registers it in the project assets"""
        from modules.video_engine.lossless_engine import lossless_engine
        from modules.video_engine.timeline_service import timeline_service

        meta = lossless_engine.inspect_media(file_path)
        if not meta.get("success"):
            return {"success": False, "error": meta.get("error")}

        project = timeline_service.get_project(project_id)
        if not project:
            return {"success": False, "error": f"Project not found: {project_id}"}

        asset_id = str(uuid.uuid4())
        asset = {
            "id": asset_id,
            "path": str(file_path),
            "filename": Path(file_path).name,
            "duration": meta.get("duration", 0.0),
            "video": meta.get("video"),
            "audio": meta.get("audio"),
            "importedAt": meta.get("analyzed_at")
        }

        project.setdefault("assets", []).append(asset)
        timeline_service.save_project(project)

        return {"success": True, "asset": asset}

    def add_clip(self, project_id: str, track_id: str, source_path: str,
                 timeline_start: float = 0.0, duration: Optional[float] = None) -> Dict[str, Any]:
        """Adds a media clip to a timeline track"""
        from modules.video_engine.lossless_engine import lossless_engine
        from modules.video_engine.timeline_service import timeline_service

        project = timeline_service.get_project(project_id)
        if not project:
            return {"success": False, "error": f"Project not found: {project_id}"}

        target_track = next((t for t in project.get("tracks", []) if t["id"] == track_id), None)
        if not target_track:
            return {"success": False, "error": f"Track not found: {track_id}"}

        meta = lossless_engine.inspect_media(source_path)
        file_dur = meta.get("duration", 5.0) if meta.get("success") else 5.0
        clip_dur = duration or file_dur

        clip_id = str(uuid.uuid4())
        new_clip = {
            "id": clip_id,
            "sourcePath": str(source_path),
            "name": Path(source_path).name,
            "timelineStart": float(timeline_start),
            "duration": float(clip_dur),
            "sourceStart": 0.0,
            "sourceEnd": float(clip_dur),
            "speed": 1.0,
            "volume": 1.0,
            "opacity": 1.0,
            "transform": {"x": 0, "y": 0, "scale": 1.0, "rotation": 0}
        }

        target_track.setdefault("clips", []).append(new_clip)
        timeline_service.save_project(project)

        return {"success": True, "clip": new_clip}

    def trim_clip(self, project_id: str, track_id: str, clip_id: str,
                  source_start: float, source_end: float) -> Dict[str, Any]:
        """Trims in/out points of a clip in the timeline"""
        from modules.video_engine.timeline_service import timeline_service

        project = timeline_service.get_project(project_id)
        if not project:
            return {"success": False, "error": "Project not found"}

        for track in project.get("tracks", []):
            if track["id"] == track_id:
                for clip in track.get("clips", []):
                    if clip["id"] == clip_id:
                        clip["sourceStart"] = source_start
                        clip["sourceEnd"] = source_end
                        clip["duration"] = max(0.1, source_end - source_start)
                        timeline_service.save_project(project)
                        return {"success": True, "clip": clip}

        return {"success": False, "error": "Clip not found"}

    def split_clip(self, project_id: str, track_id: str, clip_id: str,
                   split_time_seconds: float) -> Dict[str, Any]:
        """Splits a clip into two adjacent clips at the given timeline time"""
        from modules.video_engine.timeline_service import timeline_service

        project = timeline_service.get_project(project_id)
        if not project:
            return {"success": False, "error": "Project not found"}

        for track in project.get("tracks", []):
            if track["id"] == track_id:
                clips = track.get("clips", [])
                for idx, clip in enumerate(clips):
                    if clip["id"] == clip_id:
                        t_start = clip["timelineStart"]
                        t_end = t_start + clip["duration"]
                        if not (t_start < split_time_seconds < t_end):
                            return {"success": False, "error": "Split point must fall within clip bounds"}

                        dur1 = split_time_seconds - t_start
                        dur2 = t_end - split_time_seconds

                        clip["duration"] = dur1
                        clip["sourceEnd"] = clip["sourceStart"] + dur1

                        clip2 = dict(clip)
                        clip2["id"] = str(uuid.uuid4())
                        clip2["timelineStart"] = split_time_seconds
                        clip2["duration"] = dur2
                        clip2["sourceStart"] = clip["sourceStart"] + dur1
                        clip2["sourceEnd"] = clip2["sourceStart"] + dur2

                        clips.insert(idx + 1, clip2)
                        timeline_service.save_project(project)
                        return {"success": True, "clip1": clip, "clip2": clip2}

        return {"success": False, "error": "Clip not found"}

    def add_caption(self, project_id: str, text: str,
                    start_time: float, duration: float = 3.0) -> Dict[str, Any]:
        """Adds a subtitle caption clip on the text track"""
        from modules.video_engine.timeline_service import timeline_service

        project = timeline_service.get_project(project_id)
        if not project:
            return {"success": False, "error": "Project not found"}

        text_track = next((t for t in project.get("tracks", []) if t["type"] == "text"), None)
        if not text_track:
            return {"success": False, "error": "Text track not found"}

        caption_clip = {
            "id": str(uuid.uuid4()),
            "name": f"Sub: {text[:20]}",
            "timelineStart": start_time,
            "duration": duration,
            "textData": {
                "text": text,
                "fontSize": 38,
                "color": "#ffffff",
                "backgroundColor": "#000000",
                "position": "bottom"
            }
        }
        text_track.setdefault("clips", []).append(caption_clip)
        timeline_service.save_project(project)
        return {"success": True, "caption": caption_clip}

    def add_title(self, project_id: str, title: str,
                  start_time: float = 0.0, duration: float = 4.0) -> Dict[str, Any]:
        """Adds an animated opening or section title"""
        from modules.video_engine.timeline_service import timeline_service

        project = timeline_service.get_project(project_id)
        if not project:
            return {"success": False, "error": "Project not found"}

        text_track = next((t for t in project.get("tracks", []) if t["type"] == "text"), None)
        if not text_track:
            return {"success": False, "error": "Text track not found"}

        title_clip = {
            "id": str(uuid.uuid4()),
            "name": f"Title: {title[:20]}",
            "timelineStart": start_time,
            "duration": duration,
            "textData": {
                "text": title,
                "fontSize": 64,
                "color": "#00f0ff",  # Cyan HUD
                "backgroundColor": "",
                "position": "center"
            }
        }
        text_track.setdefault("clips", []).append(title_clip)
        timeline_service.save_project(project)
        return {"success": True, "title": title_clip}

    def apply_effect(self, project_id: str, track_id: str, clip_id: str,
                     effect_type: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Applies visual effect or color grading to a clip"""
        from modules.video_engine.timeline_service import timeline_service

        project = timeline_service.get_project(project_id)
        if not project:
            return {"success": False, "error": "Project not found"}

        for track in project.get("tracks", []):
            if track["id"] == track_id:
                for clip in track.get("clips", []):
                    if clip["id"] == clip_id:
                        if effect_type == "color":
                            clip.setdefault("colorAdjustments", {}).update(parameters)
                        elif effect_type == "transform":
                            clip.setdefault("transform", {}).update(parameters)
                        elif effect_type == "speed":
                            clip["speed"] = float(parameters.get("speed", 1.0))
                        timeline_service.save_project(project)
                        return {"success": True, "clip": clip}

        return {"success": False, "error": "Clip not found"}

    def add_audio(self, project_id: str, audio_path: str,
                  start_time: float = 0.0, volume: float = 0.8) -> Dict[str, Any]:
        """Adds background music or sound effect to an audio track"""
        from modules.video_engine.lossless_engine import lossless_engine
        from modules.video_engine.timeline_service import timeline_service

        project = timeline_service.get_project(project_id)
        if not project:
            return {"success": False, "error": "Project not found"}

        # Prefer Audio 3 (BGM) or any audio track
        audio_track = next((t for t in project.get("tracks", []) if t["id"] == "track-a3"), None)
        if not audio_track:
            audio_track = next((t for t in project.get("tracks", []) if t["type"] == "audio"), None)

        if not audio_track:
            return {"success": False, "error": "No audio track available"}

        meta = lossless_engine.inspect_media(audio_path)
        dur = meta.get("duration", 30.0) if meta.get("success") else 30.0

        audio_clip = {
            "id": str(uuid.uuid4()),
            "sourcePath": str(audio_path),
            "name": Path(audio_path).name,
            "timelineStart": start_time,
            "duration": dur,
            "sourceStart": 0.0,
            "sourceEnd": dur,
            "volume": volume
        }
        audio_track.setdefault("clips", []).append(audio_clip)
        timeline_service.save_project(project)
        return {"success": True, "audio_clip": audio_clip}

    def export_project(self, project_id: str, output_path: str,
                       settings: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Initiates real rendering pipeline for the project"""
        from modules.video_engine.timeline_service import timeline_service
        from modules.video_engine.video_exporter import video_exporter

        project = timeline_service.get_project(project_id)
        if not project:
            return {"success": False, "error": f"Project not found: {project_id}"}

        job_id = video_exporter.queue_render_job(project, output_path, settings)
        return {"success": True, "job_id": job_id, "output_path": output_path}

    def get_render_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Returns real-time progress and status of active render"""
        from modules.video_engine.video_exporter import video_exporter
        return video_exporter.get_job(job_id)

    def cancel_render(self, job_id: str) -> bool:
        """Cancels an active render job"""
        from modules.video_engine.video_exporter import video_exporter
        return video_exporter.cancel_job(job_id)


# Global adapter instance
concat_adapter = ConcatAdapter()
