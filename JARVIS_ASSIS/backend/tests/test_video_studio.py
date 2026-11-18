"""
test_video_studio.py — Unit & Integration Tests for NEXORA AI Video Studio
Tests project lifecycle, lossless media operations, multitrack compositor,
real render queue, audio waveforms, scene detection, drive indexer, and Concat adapter.
"""
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
import pytest

from modules.video_engine import (
    timeline_service, lossless_engine, timeline_compositor,
    video_exporter, ai_analysis_engine, subtitle_service,
    audio_studio_engine, remotion_generator, drive_indexer
)
from adapters.concat_adapter import concat_adapter


@pytest.fixture(scope="session")
def sample_video():
    """Generates a small valid test MP4 video using FFmpeg"""
    temp_dir = Path(tempfile.gettempdir()) / "nexora_test_media"
    temp_dir.mkdir(parents=True, exist_ok=True)
    video_path = temp_dir / "test_clip_1.mp4"

    # Generate 3-second test clip with test pattern and sine wave audio
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "testsrc=size=640x360:rate=30",
        "-f", "lavfi", "-i", "sine=frequency=440:duration=3",
        "-t", "3",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        str(video_path)
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    assert res.returncode == 0, f"Failed to generate test video: {res.stderr}"
    assert video_path.exists()
    return str(video_path)


@pytest.fixture(scope="session")
def sample_video_2(sample_video):
    """Generates a second compatible test MP4 video"""
    temp_dir = Path(tempfile.gettempdir()) / "nexora_test_media"
    video_path = temp_dir / "test_clip_2.mp4"

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "testsrc=size=640x360:rate=30",
        "-f", "lavfi", "-i", "sine=frequency=880:duration=2",
        "-t", "2",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        str(video_path)
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    assert res.returncode == 0
    return str(video_path)


def test_timeline_service_crud():
    """Verify project creation, retrieval, listing, saving, and deletion"""
    proj = timeline_service.create_project(name="Test Automation Proj", aspect_ratio="16:9", fps=30)
    assert proj["id"] is not None
    assert proj["name"] == "Test Automation Proj"
    assert len(proj["tracks"]) == 7  # V3, V2, V1, T1, A1, A2, A3

    loaded = timeline_service.get_project(proj["id"])
    assert loaded is not None
    assert loaded["id"] == proj["id"]

    proj_list = timeline_service.list_projects()
    assert any(p["id"] == proj["id"] for p in proj_list)

    # Clean up
    deleted = timeline_service.delete_project(proj["id"])
    assert deleted is True
    assert timeline_service.get_project(proj["id"]) is None


def test_lossless_inspect(sample_video):
    """Verify deep media inspection of video and audio streams"""
    info = lossless_engine.inspect_media(sample_video)
    assert info["success"] is True
    assert info["video"]["codec"] == "h264"
    assert info["video"]["width"] == 640
    assert info["video"]["height"] == 360
    assert info["audio"]["codec"] == "aac"
    assert info["duration"] > 2.8


def test_lossless_trim(sample_video):
    """Verify zero-reencode stream-copy cutting"""
    out = lossless_engine.lossless_trim(sample_video, start=0.5, end=2.0)
    assert out["success"] is True
    assert out["is_lossless"] is True
    assert os.path.exists(out["output_path"])
    assert os.path.getsize(out["output_path"]) > 0

    # Verify trimmed output with ffprobe
    val = lossless_engine.inspect_media(out["output_path"])
    assert val["success"] is True
    assert val["duration"] > 1.0


def test_stream_compatibility_and_lossless_merge(sample_video, sample_video_2):
    """Verify stream compatibility inspection and zero-reencode concatenation"""
    compat = lossless_engine.check_stream_compatibility([sample_video, sample_video_2])
    assert compat["compatible"] is True
    assert len(compat["issues"]) == 0

    merged = lossless_engine.lossless_merge([sample_video, sample_video_2])
    assert merged["success"] is True
    assert merged["is_lossless"] is True
    assert os.path.exists(merged["output_path"])

    val = lossless_engine.inspect_media(merged["output_path"])
    assert val["success"] is True
    # Combined duration ~ 5s (3s + 2s)
    assert val["duration"] >= 4.5


def test_remux_container(sample_video):
    """Verify lossless container transfer without re-encoding"""
    remuxed = lossless_engine.remux_container(sample_video, target_format="mkv")
    assert remuxed["success"] is True
    assert remuxed["is_lossless"] is True
    assert Path(remuxed["output_path"]).suffix == ".mkv"
    assert os.path.exists(remuxed["output_path"])


def test_extract_audio(sample_video):
    """Verify lossless audio stream separation"""
    extracted = lossless_engine.extract_stream(sample_video, stream_type="audio")
    assert extracted["success"] is True
    assert os.path.exists(extracted["output_path"])


def test_audio_waveform(sample_video):
    """Verify waveform downsampled peak extraction for timeline rendering"""
    wf = audio_studio_engine.generate_waveform(sample_video, points=100)
    assert wf["success"] is True
    assert len(wf["peaks"]) == 100
    assert any(p > 0 for p in wf["peaks"])


def test_ai_scene_detection(sample_video):
    """Verify scene boundary analysis"""
    scenes = ai_analysis_engine.detect_scenes(sample_video)
    assert scenes["success"] is True
    assert len(scenes["scene_timestamps"]) >= 1


def test_ai_silence_detection(sample_video):
    """Verify silence span analysis"""
    silence = ai_analysis_engine.detect_silence(sample_video)
    assert silence["success"] is True
    assert "silence_spans" in silence


def test_drive_indexer():
    """Verify authorized drive discovery and search"""
    drives = drive_indexer.get_authorized_drives()
    assert len(drives) > 0
    assert any(d.get("name") for d in drives)


def test_remotion_templates():
    """Verify motion graphics template list"""
    tmpls = remotion_generator.list_templates()
    assert len(tmpls) >= 4
    assert any(t["id"] == "cinematic-title" for t in tmpls)


def test_concat_adapter_crud(sample_video):
    """Verify Concat adapter standardized operations"""
    proj = concat_adapter.create_project(name="Adapter Test")
    assert proj["id"] is not None

    add_res = concat_adapter.add_clip(proj["id"], "track-v1", sample_video, timeline_start=0.0)
    assert add_res["success"] is True
    clip_id = add_res["clip"]["id"]

    trim_res = concat_adapter.trim_clip(proj["id"], "track-v1", clip_id, source_start=0.5, source_end=2.0)
    assert trim_res["success"] is True

    cap_res = concat_adapter.add_caption(proj["id"], "Test Subtitle", start_time=0.5, duration=2.0)
    assert cap_res["success"] is True

    timeline_service.delete_project(proj["id"])


def test_real_timeline_render_and_validation(sample_video, sample_video_2):
    """Verify end-to-end real multitrack timeline export with FFmpeg progress tracking and FFprobe validation"""
    import time
    proj = timeline_service.create_project(name="Full Composited Video", aspect_ratio="16:9", fps=30)
    v1_track = next(t for t in proj["tracks"] if t["id"] == "track-v1")
    t1_track = next(t for t in proj["tracks"] if t["id"] == "track-t1")
    a3_track = next(t for t in proj["tracks"] if t["id"] == "track-a3")

    # Add clip 1 on V1 (0s to 2s)
    v1_track["clips"].append({
        "id": "clip-v1-1",
        "sourcePath": sample_video,
        "name": "Clip 1",
        "timelineStart": 0.0,
        "duration": 2.0,
        "sourceStart": 0.0,
        "sourceEnd": 2.0,
        "speed": 1.0,
        "volume": 1.0,
        "opacity": 1.0,
        "transform": {"x": 0, "y": 0, "scale": 1.0, "rotation": 0}
    })

    # Add clip 2 on V1 (2s to 3.5s)
    v1_track["clips"].append({
        "id": "clip-v1-2",
        "sourcePath": sample_video_2,
        "name": "Clip 2",
        "timelineStart": 2.0,
        "duration": 1.5,
        "sourceStart": 0.0,
        "sourceEnd": 1.5,
        "speed": 1.0,
        "volume": 1.0,
        "opacity": 1.0,
        "transform": {"x": 0, "y": 0, "scale": 1.0, "rotation": 0}
    })

    # Add text overlay on T1
    t1_track["clips"].append({
        "id": "clip-t1-1",
        "name": "Title",
        "timelineStart": 0.5,
        "duration": 2.0,
        "textData": {
            "text": "NEXORA AI STUDIO",
            "fontSize": 48,
            "color": "cyan",
            "position": "center"
        }
    })

    # Add audio clip on A3 (BGM)
    a3_track["clips"].append({
        "id": "clip-a3-1",
        "sourcePath": sample_video,
        "name": "BGM Audio",
        "timelineStart": 0.0,
        "duration": 3.5,
        "sourceStart": 0.0,
        "sourceEnd": 3.5,
        "volume": 0.6
    })

    out_file = str(Path(tempfile.gettempdir()) / "nexora_test_media" / "final_composited_export.mp4")
    job_id = video_exporter.queue_render_job(proj, out_file, {"codec": "h264", "hwAccel": False})
    assert job_id is not None

    # Poll job until completed or max 30s
    start_wait = time.time()
    final_job = None
    while time.time() - start_wait < 30:
        job_info = video_exporter.get_job(job_id)
        if job_info and job_info.get("status") in ("completed", "failed"):
            final_job = job_info
            break
        time.sleep(0.3)

    assert final_job is not None, "Render job timed out"
    assert final_job["status"] == "completed", f"Render failed: {final_job.get('error')}"
    assert os.path.exists(out_file)
    assert os.path.getsize(out_file) > 0

    val = final_job.get("validation") or {}
    assert val.get("valid") is True
    assert val.get("hasVideo") is True
    assert val.get("hasAudio") is True
    assert abs(val.get("actualDuration", 0) - 3.5) < 0.5  # within 0.5s tolerance

    timeline_service.delete_project(proj["id"])
