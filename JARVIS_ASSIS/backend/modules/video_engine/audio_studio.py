"""
audio_studio.py — Multitrack Audio Mixing, Waveform Extraction & TTS Engine
Provides waveform peaks visualization for the timeline, volume normalization,
audio ducking, and offline text-to-speech voiceover generation.
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
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

FFMPEG_BIN = shutil.which("ffmpeg") or "ffmpeg"
FFPROBE_BIN = shutil.which("ffprobe") or "ffprobe"


class AudioStudioEngine:
    """Manages audio processing, waveform analysis, and speech synthesis"""

    def __init__(self, work_dir: Optional[str] = None):
        self.work_dir = Path(work_dir or tempfile.gettempdir()) / "jarvis_audio"
        self.work_dir.mkdir(parents=True, exist_ok=True)

    def generate_waveform(self, media_path: str, points: int = 200) -> Dict[str, Any]:
        """
        Extracts downsampled peak amplitudes (0.0 to 1.0) for visual waveform rendering
        on the timeline canvas. Uses librosa or FFprobe peak extraction.
        """
        if not os.path.exists(media_path):
            return {"success": False, "error": f"File not found: {media_path}"}

        # Step 1: Export low-res mono wav
        wav_path = str(self.work_dir / f"wf_{uuid.uuid4().hex[:8]}.wav")
        cmd = [
            FFMPEG_BIN, "-y",
            "-i", str(media_path),
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "8000",
            "-ac", "1",
            wav_path
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if res.returncode != 0 or not os.path.exists(wav_path):
                return {"success": False, "error": "Could not decode audio track"}

            # Read raw 16-bit PCM samples
            import wave
            with wave.open(wav_path, "rb") as wf:
                n_frames = wf.getnframes()
                sample_rate = wf.getframerate()
                raw_data = wf.readframes(n_frames)

            import struct
            total_samples = len(raw_data) // 2
            if total_samples == 0:
                return {"success": True, "peaks": [0.0] * points, "duration": 0.0}

            # Unpack samples and downsample to requested points
            chunk_size = max(1, total_samples // points)
            peaks = []
            for i in range(0, min(total_samples, points * chunk_size), chunk_size):
                chunk_bytes = raw_data[i * 2: (i + chunk_size) * 2]
                if not chunk_bytes:
                    break
                sample_count = len(chunk_bytes) // 2
                samples = struct.unpack(f"{sample_count}h", chunk_bytes)
                max_val = max(abs(s) for s in samples) if samples else 0
                peaks.append(round(min(1.0, max_val / 32768.0), 3))

            while len(peaks) < points:
                peaks.append(0.0)

            duration = round(n_frames / float(sample_rate), 3) if sample_rate > 0 else 0.0
            return {
                "success": True,
                "media_path": media_path,
                "duration": duration,
                "points": len(peaks),
                "peaks": peaks
            }
        except Exception as e:
            logger.error("Waveform generation error: %s", e)
            return {"success": False, "error": str(e)}
        finally:
            if os.path.exists(wav_path):
                try:
                    os.unlink(wav_path)
                except Exception:
                    pass

    def generate_voiceover(self, text: str, voice: str = "en-US",
                           rate: int = 175, volume: float = 1.0) -> Dict[str, Any]:
        """
        Generates spoken voiceover audio using pyttsx3 offline TTS engine.
        Saves as WAV/MP3 asset ready to drop directly into timeline audio tracks.
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        audio_path = str(self.work_dir / f"tts_voiceover_{timestamp}.wav")

        try:
            import pyttsx3
            engine = pyttsx3.init()
            engine.setProperty("rate", rate)
            engine.setProperty("volume", max(0.0, min(1.0, volume)))

            # Select voice if requested
            voices = engine.getProperty("voices")
            for v in voices:
                if voice.lower() in v.id.lower() or voice.lower() in v.name.lower():
                    engine.setProperty("voice", v.id)
                    break

            engine.save_to_file(text, audio_path)
            engine.runAndWait()

            if os.path.exists(audio_path) and os.path.getsize(audio_path) > 0:
                # Get duration
                from .lossless_engine import lossless_engine
                meta = lossless_engine.inspect_media(audio_path)
                dur = meta.get("duration", 3.0)

                return {
                    "success": True,
                    "text": text,
                    "audio_path": audio_path,
                    "duration": dur,
                    "voice": voice,
                    "file_size": os.path.getsize(audio_path)
                }
            return {"success": False, "error": "TTS engine produced empty file"}
        except Exception as e:
            logger.error("TTS generation error: %s", e)
            return {"success": False, "error": str(e)}

    def normalize_audio(self, audio_path: str,
                        output_path: Optional[str] = None) -> Dict[str, Any]:
        """Normalizes audio volume to standard broadcast loudness (EBU R128)"""
        if not os.path.exists(audio_path):
            return {"success": False, "error": f"File not found: {audio_path}"}

        inp = Path(audio_path)
        if not output_path:
            output_path = str(self.work_dir / f"{inp.stem}_normalized{inp.suffix}")

        cmd = [
            FFMPEG_BIN, "-y",
            "-i", str(audio_path),
            "-filter:a", "loudnorm=I=-16:TP=-1.5:LRA=11",
            str(output_path)
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
            if res.returncode == 0 and os.path.exists(output_path):
                return {
                    "success": True,
                    "input_path": audio_path,
                    "output_path": output_path
                }
            return {"success": False, "error": res.stderr}
        except Exception as e:
            return {"success": False, "error": str(e)}


# Global audio studio instance
audio_studio_engine = AudioStudioEngine()

