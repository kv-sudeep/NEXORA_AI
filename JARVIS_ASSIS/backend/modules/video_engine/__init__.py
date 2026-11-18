"""
Video Engine Module — NEXORA AI Video Editing, Production & Automation Studio
Provides:
- FFmpegEngine / ffmpeg_engine
- VideoEditor / video_editor
- VideoExporter / video_exporter
- TimelineService / timeline_service
- LosslessEngine / lossless_engine
- TimelineCompositor / timeline_compositor
- VideoAnalysisEngine / ai_analysis_engine
- SubtitleService / subtitle_service
- AudioStudioEngine / audio_studio_engine
- RemotionGenerator / remotion_generator
- DriveIndexer / drive_indexer
"""
from .ffmpeg_engine import FFmpegEngine, ffmpeg_engine

# Alias for backwards compatibility
FFmpegVideoEngine = FFmpegEngine

from .video_editor import VideoEditor, video_editor
from .video_exporter import VideoExporter, video_exporter
from .timeline_service import TimelineService, timeline_service
from .lossless_engine import LosslessEngine, lossless_engine
from .timeline_compositor import TimelineCompositor, timeline_compositor
from .ai_analysis import VideoAnalysisEngine, ai_analysis_engine
from .subtitle_service import SubtitleService, subtitle_service
from .audio_studio import AudioStudioEngine, audio_studio_engine
from .remotion_generator import RemotionGenerator, remotion_generator
from .drive_indexer import DriveIndexer, drive_indexer

__all__ = [
    "FFmpegEngine",
    "FFmpegVideoEngine",
    "ffmpeg_engine",
    "VideoEditor",
    "video_editor",
    "VideoExporter",
    "video_exporter",
    "TimelineService",
    "timeline_service",
    "LosslessEngine",
    "lossless_engine",
    "TimelineCompositor",
    "timeline_compositor",
    "VideoAnalysisEngine",
    "ai_analysis_engine",
    "SubtitleService",
    "subtitle_service",
    "AudioStudioEngine",
    "audio_studio_engine",
    "RemotionGenerator",
    "remotion_generator",
    "DriveIndexer",
    "drive_indexer"
]
