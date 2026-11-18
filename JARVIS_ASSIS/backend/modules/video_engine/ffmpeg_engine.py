"""
FFmpegVideoEngine — Low-level FFmpeg operations for video processing
Uses subprocess for safe execution of FFmpeg commands
"""
import json
import logging
import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Check if FFmpeg is available
FFMPEG_AVAILABLE = shutil.which("ffmpeg") is not None
FFPROBE_AVAILABLE = shutil.which("ffprobe") is not None


class FFmpegEngine:
    """FFmpeg subprocess wrapper for video operations"""

    def __init__(self):
        if not FFMPEG_AVAILABLE:
            logger.warning("FFmpeg not found - video editing will be limited")

    def _run_ffmpeg(self, args: List[str], timeout: int = 300) -> Dict[str, Any]:
        """Execute FFmpeg command safely"""
        cmd = ["ffmpeg", "-y"] + args
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "error": None if result.returncode == 0 else result.stderr
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Operation timed out"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_metadata(self, video_path: str) -> Dict[str, Any]:
        """Extract video metadata using ffprobe"""
        if not FFPROBE_AVAILABLE:
            return {"error": "FFmpeg not available"}

        cmd = [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_format", "-show_streams",
            str(video_path)
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                data = json.loads(result.stdout)
                video_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), {})
                audio_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "audio"), {})

                return {
                    "duration": float(data.get("format", {}).get("duration", 0)),
                    "size": int(data.get("format", {}).get("size", 0)),
                    "filename": data.get("format", {}).get("filename", video_path),
                    "video": {
                        "width": video_stream.get("width"),
                        "height": video_stream.get("height"),
                        "codec": video_stream.get("codec_name"),
                        "fps": eval(video_stream.get("r_frame_rate", "0/1")),
                        "bitrate": video_stream.get("bit_rate")
                    },
                    "audio": {
                        "codec": audio_stream.get("codec_name"),
                        "bitrate": audio_stream.get("bit_rate"),
                        "sample_rate": audio_stream.get("sample_rate"),
                        "channels": audio_stream.get("channels")
                    },
                    "format": data.get("format", {}).get("format_name")
                }
            return {"error": "Could not parse video metadata"}
        except Exception as e:
            return {"error": str(e)}

    def trim(self, input_path: str, output_path: str, start: float, end: float) -> Dict[str, Any]:
        """Trim video from start to end time"""
        duration = end - start
        if duration <= 0:
            return {"error": "Invalid trim range"}

        args = [
            "-i", str(input_path),
            "-ss", str(start),
            "-t", str(duration),
            "-c", "copy",
            str(output_path)
        ]
        return self._run_ffmpeg(args)

    def extract_clip(self, input_path: str, output_path: str, start: float, duration: float) -> Dict[str, Any]:
        """Extract a clip with re-encoding (for when keyframes don't align)"""
        args = [
            "-i", str(input_path),
            "-ss", str(start),
            "-t", str(duration),
            "-c", "libx264", "-preset", "fast",
            str(output_path)
        ]
        return self._run_ffmpeg(args)

    def concatenate(self, input_paths: List[str], output_path: str) -> Dict[str, Any]:
        """Concatenate multiple videos using concat demuxer"""
        if len(input_paths) < 2:
            return {"error": "Need at least 2 videos to concatenate"}

        # Create concat file
        concat_file = Path(output_path).parent / f"concat_{uuid.uuid4().hex}.txt"
        try:
            with open(concat_file, "w") as f:
                for path in input_paths:
                    f.write(f"file '{path}'\n")

            args = [
                "-f", "concat", "-safe", "0",
                "-i", str(concat_file),
                "-c", "copy",
                str(output_path)
            ]
            return self._run_ffmpeg(args)
        finally:
            if concat_file.exists():
                concat_file.unlink()

    def convert(self, input_path: str, output_path: str, format: str = "mp4") -> Dict[str, Any]:
        """Convert video to different format"""
        args = [
            "-i", str(input_path),
            "-c:v", "libx264", "-c:a", "aac",
            str(output_path)
        ]
        return self._run_ffmpeg(args)

    def add_text_overlay(self, input_path: str, output_path: str, text: str,
                         position: str = "bottom", fontsize: int = 24) -> Dict[str, Any]:
        """Add text overlay to video"""
        args = [
            "-i", str(input_path),
            "-vf", f"drawtext=fontfile=/Windows/Fonts/arial.ttf:text='{text}':"
                   f"fontcolor=white:fontsize={fontsize}:x=(w-text_w)/2:y=h-(text_h+20)",
            "-c:a", "copy",
            str(output_path)
        ]
        return self._run_ffmpeg(args)

    def change_speed(self, input_path: str, output_path: str, speed: float) -> Dict[str, Any]:
        """Change video speed (1.0 = normal, 2.0 = 2x fast, 0.5 = half speed)"""
        args = [
            "-i", str(input_path),
            "-filter:v", f"setpts=N/({speed}*TB)",
            "-filter:a", f"atempo={speed}" if 0.5 <= speed <= 2.0 else (
                f"atempo=2.0,atempo={speed/2}" if speed < 0.5 else f"atempo=0.5,atempo={speed/0.5}"
            ),
            str(output_path)
        ]
        return self._run_ffmpeg(args)

    def add_watermark(self, input_path: str, output_path: str, watermark_path: str,
                      position: str = "bottom-right", opacity: float = 0.7) -> Dict[str, Any]:
        """Add watermark image to video"""
        args = [
            "-i", str(input_path),
            "-i", str(watermark_path),
            "-filter_complex", f"[0:v][1:v]overlay=10:10:opacity={opacity}",
            "-c:a", "copy",
            str(output_path)
        ]
        return self._run_ffmpeg(args)

    def resize(self, input_path: str, output_path: str, width: int, height: int) -> Dict[str, Any]:
        """Resize video to specified dimensions"""
        args = [
            "-i", str(input_path),
            "-vf", f"scale={width}:{height}",
            "-c:a", "copy",
            str(output_path)
        ]
        return self._run_ffmpeg(args)

    def crop(self, input_path: str, output_path: str, width: int, height: int,
             x: int = 0, y: int = 0) -> Dict[str, Any]:
        """Crop video to specified region"""
        args = [
            "-i", str(input_path),
            "-vf", f"crop={width}:{height}:{x}:{y}",
            "-c:a", "copy",
            str(output_path)
        ]
        return self._run_ffmpeg(args)

    def rotate(self, input_path: str, output_path: str, degrees: int) -> Dict[str, Any]:
        """Rotate video by specified degrees (90, 180, 270)"""
        angle_map = {90: 1, 180: 2, 270: 3}
        method = angle_map.get(degrees % 360, 0)
        args = [
            "-i", str(input_path),
            "-vf", f"transpose={method}",
            "-c:a", "copy",
            str(output_path)
        ]
        return self._run_ffmpeg(args)

    def adjust_brightness(self, input_path: str, output_path: str, factor: float) -> Dict[str, Any]:
        """Adjust brightness (-1 to 1, 0 = normal)"""
        args = [
            "-i", str(input_path),
            "-vf", f"eq= brightness={factor}",
            "-c:a", "copy",
            str(output_path)
        ]
        return self._run_ffmpeg(args)

    def adjust_contrast(self, input_path: str, output_path: str, factor: float) -> Dict[str, Any]:
        """Adjust contrast (0.1 to 3.0, 1.0 = normal)"""
        args = [
            "-i", str(input_path),
            "-vf", f"eq=contrast={factor}",
            "-c:a", "copy",
            str(output_path)
        ]
        return self._run_ffmpeg(args)

    def adjust_saturation(self, input_path: str, output_path: str, factor: float) -> Dict[str, Any]:
        """Adjust saturation (0 = grayscale, 1 = normal, >1 = more vibrant)"""
        args = [
            "-i", str(input_path),
            "-vf", f"eq=saturation={factor}",
            "-c:a", "copy",
            str(output_path)
        ]
        return self._run_ffmpeg(args)

    def apply_filter(self, input_path: str, output_path: str, filter_name: str) -> Dict[str, Any]:
        """Apply common video filters"""
        filters = {
            "grayscale": "hue=s=0",
            "invert": "format=gray,eq=gamma=1.5",
            "blur": "boxblur=5:1",
            "sharpen": "unsharp=C5:5:1.0",
            "vintage": "eq=contrast=0.8:saturation=0.5:brightness=-0.1"
        }
        vf = filters.get(filter_name, "")
        if not vf:
            return {"error": f"Unknown filter: {filter_name}"}

        args = [
            "-i", str(input_path),
            "-vf", vf,
            "-c:a", "copy",
            str(output_path)
        ]
        return self._run_ffmpeg(args)


# Global engine instance
ffmpeg_engine = FFmpegEngine()