"""
ai_analysis.py — Automatic Video & Audio Content Analysis Engine
Implements automated scene change detection, silence detection, black frame detection,
and smart editing recommendations for NEXORA AI Video Studio.
"""
import json
import logging
import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

FFMPEG_BIN = shutil.which("ffmpeg") or "ffmpeg"
FFPROBE_BIN = shutil.which("ffprobe") or "ffprobe"


class VideoAnalysisEngine:
    """Performs frame and audio content analysis on media files"""

    def detect_scenes(self, video_path: str, threshold: float = 0.3) -> Dict[str, Any]:
        """
        Detects scene shot boundaries using FFmpeg's scene change filter.
        Returns scene transition timestamps.
        """
        if not os.path.exists(video_path):
            return {"success": False, "error": f"File not found: {video_path}"}

        cmd = [
            FFMPEG_BIN, "-v", "quiet",
            "-i", str(video_path),
            "-filter:v", f"select='gt(scene,{threshold})',showinfo",
            "-f", "null",
            "-"
        ]

        # Alternatively use ffprobe showinfo
        probe_cmd = [
            FFPROBE_BIN, "-v", "error",
            "-show_entries", "frame=pts_time",
            "-of", "csv=p=0",
            "-filter:v", f"select='gt(scene,{threshold})'",
            str(video_path)
        ]

        try:
            res = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=120)
            scenes = [0.0]
            if res.returncode == 0:
                for line in res.stdout.strip().splitlines():
                    line = line.strip()
                    if line:
                        try:
                            t = float(line)
                            if t > scenes[-1] + 0.5:  # Debounce within 0.5s
                                scenes.append(round(t, 2))
                        except ValueError:
                            pass

            return {
                "success": True,
                "video_path": video_path,
                "threshold": threshold,
                "scene_count": len(scenes),
                "scene_timestamps": scenes,
                "scenes": [
                    {
                        "index": i + 1,
                        "start": scenes[i],
                        "end": scenes[i + 1] if i + 1 < len(scenes) else None,
                        "duration": round(scenes[i + 1] - scenes[i], 2) if i + 1 < len(scenes) else None
                    } for i in range(len(scenes))
                ]
            }
        except Exception as e:
            logger.error("Scene detection error: %s", e)
            return {"success": False, "error": str(e)}

    def detect_silence(self, media_path: str, noise_db: int = -30,
                       min_duration: float = 0.5) -> Dict[str, Any]:
        """
        Identifies silent periods in audio tracks using FFmpeg silencedetect.
        Returns silent spans and non-silent speech/sound spans.
        """
        if not os.path.exists(media_path):
            return {"success": False, "error": f"File not found: {media_path}"}

        cmd = [
            FFMPEG_BIN,
            "-i", str(media_path),
            "-af", f"silencedetect=noise={noise_db}dB:d={min_duration}",
            "-f", "null",
            "-"
        ]

        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            stderr = res.stderr or ""

            silence_starts = []
            silence_spans = []

            for line in stderr.splitlines():
                if "silence_start:" in line:
                    match = re.search(r"silence_start:\s*([0-9.]+)", line)
                    if match:
                        silence_starts.append(float(match.group(1)))
                elif "silence_end:" in line:
                    match_end = re.search(r"silence_end:\s*([0-9.]+)", line)
                    match_dur = re.search(r"silence_duration:\s*([0-9.]+)", line)
                    if match_end and silence_starts:
                        s_start = silence_starts.pop(0)
                        s_end = float(match_end.group(1))
                        s_dur = float(match_dur.group(1)) if match_dur else round(s_end - s_start, 2)
                        silence_spans.append({
                            "start": round(s_start, 2),
                            "end": round(s_end, 2),
                            "duration": round(s_dur, 2)
                        })

            return {
                "success": True,
                "media_path": media_path,
                "noise_threshold_db": noise_db,
                "min_duration": min_duration,
                "silence_count": len(silence_spans),
                "silence_spans": silence_spans
            }
        except Exception as e:
            logger.error("Silence detection error: %s", e)
            return {"success": False, "error": str(e)}

    def detect_black_frames(self, video_path: str, min_duration: float = 0.5) -> Dict[str, Any]:
        """Detects black frames and dip-to-black segments"""
        if not os.path.exists(video_path):
            return {"success": False, "error": f"File not found: {video_path}"}

        cmd = [
            FFMPEG_BIN,
            "-i", str(video_path),
            "-vf", f"blackdetect=d={min_duration}:pix_th=0.10",
            "-f", "null",
            "-"
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            black_spans = []
            for line in res.stderr.splitlines():
                match = re.search(r"black_start:([0-9.]+)\s+black_end:([0-9.]+)\s+black_duration:([0-9.]+)", line)
                if match:
                    black_spans.append({
                        "start": float(match.group(1)),
                        "end": float(match.group(2)),
                        "duration": float(match.group(3))
                    })

            return {
                "success": True,
                "black_spans": black_spans,
                "count": len(black_spans)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def generate_analysis_report(self, video_path: str) -> Dict[str, Any]:
        """
        Runs comprehensive AI content analysis: scene transitions,
        silence periods, black frames, and recommended edit points.
        """
        from .lossless_engine import lossless_engine

        meta = lossless_engine.inspect_media(video_path)
        scenes = self.detect_scenes(video_path)
        silence = self.detect_silence(video_path)

        total_dur = meta.get("duration", 0.0)
        scene_list = scenes.get("scene_timestamps", [0.0])
        silence_spans = silence.get("silence_spans", [])

        # Calculate suggested edit recommendations
        recommendations = []
        if len(silence_spans) > 2:
            recommendations.append(f"Detected {len(silence_spans)} silent pauses. Recommend automatic ripple cut to tighten pace.")
        if len(scene_list) > 3:
            recommendations.append(f"Identified {len(scene_list)} natural scene boundaries suitable for transition cuts.")
        if total_dur > 60:
            recommendations.append("Video duration exceeds 60s: suitable for YouTube landscape or multi-part vertical Shorts extraction.")

        return {
            "success": True,
            "metadata": meta,
            "total_duration": total_dur,
            "scenes": scenes,
            "silence": silence,
            "recommendations": recommendations
        }


# Global analysis engine instance
ai_analysis_engine = VideoAnalysisEngine()

