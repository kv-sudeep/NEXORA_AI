"""
lossless_engine.py — High-Performance Lossless Media Processing Engine
Inspired by LosslessCut architecture. Uses FFmpeg and FFprobe for zero-reencoding,
stream-copy (-c copy), smart cut, container remuxing, GOP keyframe analysis,
and stream compatibility validation.
"""
import json
import logging
import math
import os
import shutil
import subprocess
import tempfile
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

FFMPEG_BIN = shutil.which("ffmpeg") or "ffmpeg"
FFPROBE_BIN = shutil.which("ffprobe") or "ffprobe"


class LosslessEngine:
    """Engine for lossless video operations preserving source quality"""

    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = Path(output_dir or tempfile.gettempdir()) / "jarvis_lossless"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def _run_cmd(self, cmd: List[str], timeout: int = 600) -> Dict[str, Any]:
        """Safely execute command without shell injection"""
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
                "returncode": result.returncode,
                "error": None if result.returncode == 0 else result.stderr
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": f"Command timed out after {timeout}s"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def inspect_media(self, file_path: str) -> Dict[str, Any]:
        """Comprehensive media analysis for lossless operations"""
        if not os.path.exists(file_path):
            return {"success": False, "error": f"File not found: {file_path}"}

        cmd = [
            FFPROBE_BIN, "-v", "quiet",
            "-print_format", "json",
            "-show_format", "-show_streams",
            str(file_path)
        ]
        res = self._run_cmd(cmd, timeout=30)
        if not res["success"]:
            return {"success": False, "error": res["error"]}

        try:
            data = json.loads(res["stdout"])
            fmt = data.get("format", {})
            streams = data.get("streams", [])

            video_streams = [s for s in streams if s.get("codec_type") == "video"]
            audio_streams = [s for s in streams if s.get("codec_type") == "audio"]
            sub_streams = [s for s in streams if s.get("codec_type") == "subtitle"]

            primary_v = video_streams[0] if video_streams else {}
            primary_a = audio_streams[0] if audio_streams else {}

            fps = 0.0
            r_fps = primary_v.get("r_frame_rate", "0/1")
            if "/" in r_fps:
                num, den = r_fps.split("/")
                fps = round(float(num) / float(den), 3) if float(den) > 0 else 0.0

            return {
                "success": True,
                "path": str(file_path),
                "filename": Path(file_path).name,
                "duration": float(fmt.get("duration", 0.0)),
                "size_bytes": int(fmt.get("size", 0)),
                "bitrate": int(fmt.get("bit_rate", 0)),
                "format_name": fmt.get("format_name", ""),
                "video": {
                    "codec": primary_v.get("codec_name"),
                    "codec_long": primary_v.get("codec_long_name"),
                    "width": primary_v.get("width"),
                    "height": primary_v.get("height"),
                    "aspect_ratio": primary_v.get("display_aspect_ratio", f"{primary_v.get('width')}:{primary_v.get('height')}"),
                    "pix_fmt": primary_v.get("pix_fmt"),
                    "fps": fps,
                    "time_base": primary_v.get("time_base"),
                    "profile": primary_v.get("profile"),
                    "level": primary_v.get("level"),
                    "rotation": primary_v.get("tags", {}).get("rotate") or primary_v.get("side_data_list", [{}])[0].get("rotation", 0)
                } if primary_v else None,
                "audio": {
                    "codec": primary_a.get("codec_name"),
                    "channels": primary_a.get("channels"),
                    "sample_rate": primary_a.get("sample_rate"),
                    "bitrate": primary_a.get("bit_rate")
                } if primary_a else None,
                "stream_counts": {
                    "video": len(video_streams),
                    "audio": len(audio_streams),
                    "subtitle": len(sub_streams)
                },
                "all_streams": streams
            }
        except Exception as e:
            return {"success": False, "error": f"Failed to parse media format: {e}"}

    def get_keyframes(self, file_path: str, max_frames: int = 500) -> List[Dict[str, Any]]:
        """Extracts keyframe (I-frame) timestamps for GOP-aligned, glitch-free cuts"""
        cmd = [
            FFPROBE_BIN, "-v", "quiet",
            "-select_streams", "v:0",
            "-show_frames",
            "-show_entries", "frame=pict_type,pts_time,key_frame",
            "-read_intervals", "%+300",  # inspect up to 5 min or full
            "-print_format", "json",
            str(file_path)
        ]
        res = self._run_cmd(cmd, timeout=45)
        keyframes = []
        if res["success"]:
            try:
                frames_data = json.loads(res["stdout"]).get("frames", [])
                for f in frames_data:
                    if f.get("key_frame") == 1 or f.get("pict_type") == "I":
                        pts = f.get("pts_time")
                        if pts is not None:
                            keyframes.append({
                                "time": float(pts),
                                "type": f.get("pict_type", "I")
                            })
                            if len(keyframes) >= max_frames:
                                break
            except Exception as e:
                logger.warning("Keyframe extraction failed: %s", e)
        return keyframes

    def check_stream_compatibility(self, file_paths: List[str]) -> Dict[str, Any]:
        """
        Validates whether multiple files can be losslessly concatenated.
        Returns compatibility status and detailed breakdown.
        """
        if len(file_paths) < 2:
            return {"compatible": True, "reason": "Single or zero files provided"}

        inspections = []
        for p in file_paths:
            insp = self.inspect_media(p)
            if not insp.get("success"):
                return {
                    "compatible": False,
                    "reason": f"Cannot inspect file {p}: {insp.get('error')}",
                    "details": []
                }
            inspections.append(insp)

        base = inspections[0]
        base_v = base.get("video") or {}
        base_a = base.get("audio") or {}

        issues = []
        for idx, insp in enumerate(inspections[1:], start=2):
            cur_v = insp.get("video") or {}
            cur_a = insp.get("audio") or {}

            # Video codec
            if cur_v.get("codec") != base_v.get("codec"):
                issues.append(f"Clip {idx} video codec ({cur_v.get('codec')}) differs from Clip 1 ({base_v.get('codec')})")
            # Resolution
            if (cur_v.get("width"), cur_v.get("height")) != (base_v.get("width"), base_v.get("height")):
                issues.append(f"Clip {idx} resolution ({cur_v.get('width')}x{cur_v.get('height')}) differs from Clip 1 ({base_v.get('width')}x{base_v.get('height')})")
            # Pixel format
            if cur_v.get("pix_fmt") != base_v.get("pix_fmt"):
                issues.append(f"Clip {idx} pixel format ({cur_v.get('pix_fmt')}) differs from Clip 1 ({base_v.get('pix_fmt')})")
            # Audio codec
            if cur_a.get("codec") != base_a.get("codec"):
                issues.append(f"Clip {idx} audio codec ({cur_a.get('codec')}) differs from Clip 1 ({base_a.get('codec')})")
            # Audio sample rate
            if cur_a.get("sample_rate") != base_a.get("sample_rate"):
                issues.append(f"Clip {idx} audio sample rate ({cur_a.get('sample_rate')}) differs from Clip 1 ({base_a.get('sample_rate')})")

        is_lossless_possible = len(issues) == 0
        return {
            "compatible": is_lossless_possible,
            "operation_type": "lossless_stream_copy" if is_lossless_possible else "requires_reencoding",
            "reason": "All video and audio streams are identical in codec, resolution, and format." if is_lossless_possible else "; ".join(issues),
            "issues": issues,
            "clips": [
                {
                    "path": insp["path"],
                    "filename": insp["filename"],
                    "duration": insp["duration"],
                    "codec": insp.get("video", {}).get("codec"),
                    "resolution": f"{insp.get('video', {}).get('width')}x{insp.get('video', {}).get('height')}"
                } for insp in inspections
            ]
        }

    def lossless_trim(self, input_path: str, start: float, end: float,
                       output_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes a zero-reencode lossless stream-copy trim (-c copy).
        Uses -avoid_negative_ts make_zero and -fflags +genpts for clean keyframe start.
        """
        if not os.path.exists(input_path):
            return {"success": False, "error": f"Input not found: {input_path}"}

        duration = end - start
        if duration <= 0:
            return {"success": False, "error": "End time must be greater than start time"}

        inp = Path(input_path)
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = str(self.output_dir / f"{inp.stem}_lossless_trim_{timestamp}{inp.suffix}")

        cmd = [
            FFMPEG_BIN, "-y",
            "-ss", str(round(start, 4)),
            "-i", str(input_path),
            "-t", str(round(duration, 4)),
            "-c", "copy",
            "-avoid_negative_ts", "make_zero",
            "-fflags", "+genpts",
            "-movflags", "+faststart",
            str(output_path)
        ]

        res = self._run_cmd(cmd, timeout=300)
        if res["success"] and os.path.exists(output_path):
            out_info = self.inspect_media(output_path)
            return {
                "success": True,
                "operation": "lossless_trim",
                "method": "stream_copy",
                "is_lossless": True,
                "input_path": input_path,
                "output_path": output_path,
                "start": start,
                "end": end,
                "duration": out_info.get("duration", duration),
                "size_bytes": os.path.getsize(output_path)
            }
        else:
            return {
                "success": False,
                "error": res.get("error") or "Lossless trim failed",
                "stderr": res.get("stderr")
            }

    def lossless_merge(self, input_paths: List[str],
                        output_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Merges multiple compatible media files without re-encoding using the concat demuxer.
        Automatically verifies stream compatibility beforehand.
        """
        if len(input_paths) < 2:
            return {"success": False, "error": "At least 2 files required to merge"}

        compat = self.check_stream_compatibility(input_paths)
        if not compat["compatible"]:
            return {
                "success": False,
                "is_lossless": False,
                "can_lossless": False,
                "error": "Files are not stream-compatible for lossless merging.",
                "reason": compat["reason"],
                "issues": compat["issues"],
                "suggestion": "Use re-encoding merge to normalize different video codecs/resolutions."
            }

        inp0 = Path(input_paths[0])
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = str(self.output_dir / f"lossless_merged_{timestamp}{inp0.suffix}")

        concat_file = self.output_dir / f"concat_{uuid.uuid4().hex}.txt"
        try:
            with open(concat_file, "w", encoding="utf-8") as f:
                for p in input_paths:
                    # Escape single quotes in path for FFmpeg concat demuxer
                    escaped = str(Path(p).resolve()).replace("'", "'\\''")
                    f.write(f"file '{escaped}'\n")

            cmd = [
                FFMPEG_BIN, "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", str(concat_file),
                "-c", "copy",
                "-movflags", "+faststart",
                str(output_path)
            ]

            res = self._run_cmd(cmd, timeout=600)
            if res["success"] and os.path.exists(output_path):
                out_info = self.inspect_media(output_path)
                return {
                    "success": True,
                    "operation": "lossless_merge",
                    "method": "concat_demuxer_stream_copy",
                    "is_lossless": True,
                    "input_paths": input_paths,
                    "output_path": output_path,
                    "duration": out_info.get("duration", 0),
                    "size_bytes": os.path.getsize(output_path)
                }
            return {
                "success": False,
                "error": res.get("error") or "Lossless concat failed",
                "stderr": res.get("stderr")
            }
        finally:
            if concat_file.exists():
                concat_file.unlink()

    def remux_container(self, input_path: str, target_format: str = "mp4",
                        output_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Losslessly transfers audio and video streams into a new container format
        (e.g. MKV -> MP4 or WebM -> MKV) without quality loss.
        """
        if not os.path.exists(input_path):
            return {"success": False, "error": f"Input not found: {input_path}"}

        inp = Path(input_path)
        target_ext = f".{target_format.lstrip('.')}"
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = str(self.output_dir / f"{inp.stem}_remux_{timestamp}{target_ext}")

        cmd = [
            FFMPEG_BIN, "-y",
            "-i", str(input_path),
            "-c", "copy",
            "-map", "0",
            "-movflags", "+faststart",
            str(output_path)
        ]

        res = self._run_cmd(cmd, timeout=300)
        if res["success"] and os.path.exists(output_path):
            return {
                "success": True,
                "operation": "remux",
                "method": "stream_copy",
                "is_lossless": True,
                "input_path": input_path,
                "output_path": output_path,
                "target_format": target_format,
                "size_bytes": os.path.getsize(output_path)
            }
        return {"success": False, "error": res.get("error"), "stderr": res.get("stderr")}

    def extract_stream(self, input_path: str, stream_type: str = "audio",
                       output_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Extracts raw audio track or subtitle track losslessly.
        """
        if not os.path.exists(input_path):
            return {"success": False, "error": f"Input not found: {input_path}"}

        insp = self.inspect_media(input_path)
        inp = Path(input_path)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if stream_type == "audio":
            codec = insp.get("audio", {}).get("codec", "aac")
            ext = ".mp3" if codec == "mp3" else (".m4a" if codec == "aac" else (".flac" if codec == "flac" else ".wav"))
            if not output_path:
                output_path = str(self.output_dir / f"{inp.stem}_audio_{timestamp}{ext}")

            cmd = [
                FFMPEG_BIN, "-y",
                "-i", str(input_path),
                "-vn",
                "-c:a", "copy" if ext != ".wav" else "pcm_s16le",
                str(output_path)
            ]
        elif stream_type == "subtitles":
            if not output_path:
                output_path = str(self.output_dir / f"{inp.stem}_subs_{timestamp}.srt")

            cmd = [
                FFMPEG_BIN, "-y",
                "-i", str(input_path),
                "-vn", "-an",
                "-c:s", "copy",
                str(output_path)
            ]
        else:
            return {"success": False, "error": f"Unsupported stream type: {stream_type}"}

        res = self._run_cmd(cmd, timeout=120)
        if res["success"] and os.path.exists(output_path):
            return {
                "success": True,
                "operation": f"extract_{stream_type}",
                "input_path": input_path,
                "output_path": output_path,
                "size_bytes": os.path.getsize(output_path)
            }
        return {"success": False, "error": res.get("error"), "stderr": res.get("stderr")}


# Global lossless engine instance
lossless_engine = LosslessEngine()

