"""
VideoEditor — High-level video editing interface for JARVIS
Provides intelligent editing operations with natural language understanding
"""
import logging
import os
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from .ffmpeg_engine import ffmpeg_engine, FFMPEG_AVAILABLE

logger = logging.getLogger(__name__)


class VideoEditor:
    """High-level video editing operations for JARVIS"""

    def __init__(self, work_dir: Optional[str] = None):
        self.work_dir = Path(work_dir or tempfile.gettempdir()) / "jarvis_edits"
        self.work_dir.mkdir(parents=True, exist_ok=True)

    def _generate_output_path(self, original_path: str, suffix: str = "edited") -> str:
        """Generate output path with timestamp"""
        original = Path(original_path)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        stem = f"{original.stem}_{timestamp}_{suffix}"
        return str(self.work_dir / f"{stem}{original.suffix}")

    def analyze_video(self, video_path: str) -> Dict[str, Any]:
        """Analyze video and return metadata"""
        if not os.path.exists(video_path):
            return {"error": "Video file not found", "path": video_path}

        metadata = ffmpeg_engine.get_metadata(video_path)
        metadata["path"] = video_path
        metadata["analyzed_at"] = datetime.now().isoformat()
        return metadata

    def trim_video(self, input_path: str, start: float, end: float,
                   preserve_original: bool = True) -> Dict[str, Any]:
        """Trim video from start to end time (in seconds)"""
        if not FFMPEG_AVAILABLE:
            return {"error": "FFmpeg not available", "success": False}

        output_path = self._generate_output_path(input_path, "trimmed")
        result = ffmpeg_engine.trim(input_path, output_path, start, end)

        return {
            "success": result.get("success", False),
            "input_path": input_path,
            "output_path": output_path if result.get("success") else None,
            "operation": "trim",
            "parameters": {"start": start, "end": end},
            "error": result.get("error")
        }

    def split_video(self, input_path: str, split_points: List[float]) -> Dict[str, Any]:
        """Split video at specified timestamps"""
        if not FFMPEG_AVAILABLE:
            return {"error": "FFmpeg not available", "success": False}

        output_paths = []
        split_points = [0] + sorted(split_points) + [float('inf')]

        for i in range(len(split_points) - 1):
            start = split_points[i]
            end = split_points[i + 1] if split_points[i + 1] != float('inf') else None

            clip_path = self._generate_output_path(input_path, f"clip{i+1}")

            if end is None:
                # Extract from start to end of file
                result = ffmpeg_engine.extract_clip(input_path, clip_path, start, 999999)
            else:
                result = ffmpeg_engine.extract_clip(input_path, clip_path, start, end - start)

            if result.get("success"):
                output_paths.append(clip_path)

        return {
            "success": len(output_paths) > 0,
            "input_path": input_path,
            "output_paths": output_paths,
            "clip_count": len(output_paths),
            "operation": "split",
            "error": None if output_paths else "Split failed"
        }

    def merge_videos(self, input_paths: List[str], title: str = "") -> Dict[str, Any]:
        """Merge multiple videos into one"""
        if not FFMPEG_AVAILABLE:
            return {"error": "FFmpeg not available", "success": False}

        if len(input_paths) < 2:
            return {"error": "Need at least 2 videos to merge", "success": False}

        # Check if title is provided
        if title:
            # First, add title to the beginning
            output_path = self._generate_output_path(input_paths[0], "titled")

            # Create title video using FFmpeg
            title_path = self.work_dir / f"title_temp_{Path(input_paths[0]).name}"
            img_args = [
                "-f", "lavfi", "-i", f"color=c=black:s=1920x1080:d=2",
                "-vf", f"drawtext=fontfile=/Windows/Fonts/arial.ttf:text='{title}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", str(title_path)
            ]
            # Create title video using ffmpeg_engine
            result = ffmpeg_engine._run_ffmpeg(img_args)

            # Concatenate with title
            if result.get("success"):
                all_inputs = [str(title_path)] + input_paths
                result = ffmpeg_engine.concatenate(all_inputs, output_path)
        else:
            output_path = self._generate_output_path(input_paths[0], "merged")
            result = ffmpeg_engine.concatenate(input_paths, output_path)

        return {
            "success": result.get("success", False),
            "input_paths": input_paths,
            "output_path": output_path if result.get("success") else None,
            "operation": "merge",
            "error": result.get("error")
        }

    def export_video(self, input_path: str, output_path: Optional[str] = None,
                     resolution: str = "1080p", format: str = "mp4") -> Dict[str, Any]:
        """Export video with specified settings"""
        if not FFMPEG_AVAILABLE:
            return {"error": "FFmpeg not available", "success": False}

        if output_path is None:
            output_path = self._generate_output_path(input_path, "exported")

        # Resolution presets
        resolutions = {
            "720p": "1280:720",
            "1080p": "1920:1080",
            "2160p": "3840:2160"
        }

        res = resolutions.get(resolution, "1920:1080")

        args = [
            "-i", input_path,
            "-vf", f"scale={res}",
            "-c:v", "libx264", "-preset", "medium",
            "-c:a", "aac", "-b:a", "192k",
            output_path
        ]

        result = ffmpeg_engine._run_ffmpeg(args)

        return {
            "success": result.get("success", False),
            "input_path": input_path,
            "output_path": output_path if result.get("success") else None,
            "resolution": resolution,
            "format": format,
            "operation": "export",
            "error": result.get("error")
        }


# Global editor instance
video_editor = VideoEditor()