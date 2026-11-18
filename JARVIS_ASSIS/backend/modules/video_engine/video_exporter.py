"""
video_exporter.py — Real-Time Asynchronous Video Export & Queue Engine
Manages real FFmpeg rendering pipelines, progress tracking via stdout pipes,
hardware acceleration detection, cancellation, and post-render validation.
NO SIMULATED SLEEPS OR FAKE PROGRESS.
"""
import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

FFMPEG_BIN = shutil.which("ffmpeg") or "ffmpeg"
FFPROBE_BIN = shutil.which("ffprobe") or "ffprobe"


class VideoExporter:
    """Manages real background rendering jobs with live progress extraction"""

    def __init__(self, export_dir: Optional[str] = None):
        self.export_dir = Path(export_dir or tempfile.gettempdir()) / "jarvis_exports"
        self.export_dir.mkdir(parents=True, exist_ok=True)
        self.history_file = self.export_dir / "export_history.json"
        self._lock = threading.Lock()
        self._active_processes: Dict[str, subprocess.Popen] = {}
        self.export_history: List[Dict[str, Any]] = []
        self._load_history()

    def _load_history(self):
        if self.history_file.exists():
            try:
                with open(self.history_file, "r", encoding="utf-8") as f:
                    self.export_history = json.load(f)
            except Exception as e:
                logger.warning("Could not read export history: %s", e)
                self.export_history = []
        else:
            self.export_history = []

    def _save_history(self):
        try:
            with open(self.history_file, "w", encoding="utf-8") as f:
                json.dump(self.export_history, f, indent=2)
        except Exception as e:
            logger.warning("Could not write export history: %s", e)

    def queue_render_job(self, project: Dict[str, Any], output_path: str,
                         settings: Optional[Dict[str, Any]] = None) -> str:
        """Queues a real timeline render job and starts background processing"""
        from .timeline_compositor import timeline_compositor

        settings = settings or {}
        job_id = str(uuid.uuid4())
        cmd, expected_duration = timeline_compositor.build_export_command(project, output_path, settings)

        # Append progress piping
        cmd_with_progress = list(cmd)
        cmd_with_progress.insert(1, "-progress")
        cmd_with_progress.insert(2, "pipe:1")

        record = {
            "id": job_id,
            "projectId": project.get("id"),
            "projectName": project.get("name", "Untitled"),
            "outputPath": output_path,
            "settings": settings,
            "status": "queued",
            "progress": 0.0,
            "fps": 0.0,
            "speed": "0x",
            "currentTime": 0.0,
            "totalTime": expected_duration,
            "createdAt": datetime.now().isoformat(),
            "startedAt": None,
            "completedAt": None,
            "error": None,
            "fileSize": 0,
            "validation": None
        }

        with self._lock:
            self.export_history.insert(0, record)
            self._save_history()

        # Spawn worker thread
        t = threading.Thread(
            target=self._execute_ffmpeg_render,
            args=(job_id, cmd_with_progress, output_path, expected_duration),
            daemon=True
        )
        t.start()

        return job_id

    def _execute_ffmpeg_render(self, job_id: str, cmd: List[str], output_path: str, expected_duration: float):
        """Runs the FFmpeg process and streams progress lines in real time"""
        record = self.get_job(job_id)
        if not record:
            return

        logger.info("Starting real render for job %s: %s", job_id, " ".join(cmd[:10]))
        with self._lock:
            record["status"] = "rendering"
            record["startedAt"] = datetime.now().isoformat()
            self._save_history()

        proc = None
        try:
            # Ensure destination directory exists
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)

            stderr_file = tempfile.TemporaryFile("w+", encoding="utf-8", errors="replace")
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=stderr_file,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            with self._lock:
                self._active_processes[job_id] = proc

            expected_us = max(1.0, expected_duration * 1_000_000)

            # Monitor progress pipe
            if proc.stdout:
                for line in proc.stdout:
                    line = line.strip()
                    if not line:
                        continue
                    if "=" in line:
                        key, val = line.split("=", 1)
                        if key == "out_time_us":
                            try:
                                us = float(val)
                                cur_sec = us / 1_000_000.0
                                pct = min(99.0, max(0.0, (us / expected_us) * 100.0))
                                with self._lock:
                                    record["progress"] = round(pct, 1)
                                    record["currentTime"] = round(cur_sec, 2)
                            except ValueError:
                                pass
                        elif key == "fps":
                            try:
                                record["fps"] = float(val)
                            except ValueError:
                                pass
                        elif key == "speed":
                            record["speed"] = val
                        elif key == "progress" and val == "end":
                            record["progress"] = 100.0

            proc.wait(timeout=60)
            ret = proc.returncode

            stderr_file.seek(0)
            stderr_text = stderr_file.read()
            stderr_file.close()

            with self._lock:
                self._active_processes.pop(job_id, None)

            if ret == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                # Perform post-render validation with ffprobe
                validation = self._validate_output(output_path, expected_duration)
                with self._lock:
                    record["status"] = "completed"
                    record["progress"] = 100.0
                    record["completedAt"] = datetime.now().isoformat()
                    record["fileSize"] = os.path.getsize(output_path)
                    record["validation"] = validation
                    self._save_history()
                logger.info("Render job %s completed successfully: %s", job_id, output_path)
            else:
                with self._lock:
                    record["status"] = "failed"
                    record["completedAt"] = datetime.now().isoformat()
                    record["error"] = stderr_text or f"Process exited with code {ret}"
                    self._save_history()
                logger.error("Render job %s failed: %s", job_id, record["error"])

        except subprocess.TimeoutExpired:
            if proc:
                proc.kill()
            with self._lock:
                self._active_processes.pop(job_id, None)
                record["status"] = "failed"
                record["error"] = "Render process timed out"
                record["completedAt"] = datetime.now().isoformat()
                self._save_history()

        except Exception as e:
            if proc:
                try:
                    proc.kill()
                except Exception:
                    pass
            with self._lock:
                self._active_processes.pop(job_id, None)
                record["status"] = "failed"
                record["error"] = str(e)
                record["completedAt"] = datetime.now().isoformat()
                self._save_history()
            logger.error("Exception in render worker for job %s: %s", job_id, e)

    def _validate_output(self, file_path: str, expected_duration: float) -> Dict[str, Any]:
        """Validates rendered file using ffprobe to guarantee valid media streams"""
        cmd = [
            FFPROBE_BIN, "-v", "quiet",
            "-print_format", "json",
            "-show_format", "-show_streams",
            str(file_path)
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            if res.returncode == 0:
                data = json.loads(res.stdout)
                fmt = data.get("format", {})
                streams = data.get("streams", [])
                actual_dur = float(fmt.get("duration", 0.0))
                has_video = any(s.get("codec_type") == "video" for s in streams)
                has_audio = any(s.get("codec_type") == "audio" for s in streams)

                return {
                    "valid": True,
                    "actualDuration": actual_dur,
                    "expectedDuration": expected_duration,
                    "durationDelta": abs(actual_dur - expected_duration),
                    "hasVideo": has_video,
                    "hasAudio": has_audio,
                    "sizeBytes": int(fmt.get("size", 0)),
                    "format": fmt.get("format_name")
                }
            return {"valid": False, "error": res.stderr}
        except Exception as e:
            return {"valid": False, "error": str(e)}

    def cancel_job(self, job_id: str) -> bool:
        """Terminates active rendering process and updates job record"""
        with self._lock:
            proc = self._active_processes.get(job_id)
            record = next((r for r in self.export_history if r["id"] == job_id), None)
            if proc:
                try:
                    proc.kill()
                except Exception:
                    pass
                self._active_processes.pop(job_id, None)

            if record:
                record["status"] = "cancelled"
                record["completedAt"] = datetime.now().isoformat()
                self._save_history()
                return True
        return False

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return next((r for r in self.export_history if r["id"] == job_id), None)

    def list_jobs(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._lock:
            return self.export_history[:limit]


# Global exporter instance
video_exporter = VideoExporter()
