"""
timeline_compositor.py — Multitrack Timeline Compositor & FFmpeg Graph Builder
Assembles complex non-linear timeline edits into optimized FFmpeg commands
with video layering, audio mixing, transforms, color adjustments, text, and transitions.
"""
import logging
import math
import os
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

FFMPEG_BIN = shutil.which("ffmpeg") or "ffmpeg"


class TimelineCompositor:
    """Translates high-level project manifests into executable FFmpeg pipelines"""

    def __init__(self):
        pass

    def build_export_command(self, project: Dict[str, Any], output_path: str,
                             export_settings: Optional[Dict[str, Any]] = None) -> Tuple[List[str], float]:
        """
        Constructs the FFmpeg command argument array for rendering the timeline.
        Returns: (ffmpeg_args_list, total_expected_duration_seconds)
        """
        settings = project.get("settings", {})
        width = int(settings.get("width", 1920))
        height = int(settings.get("height", 1080))
        fps = int(settings.get("fps", 30))
        tracks = project.get("tracks", [])

        export_settings = export_settings or {}
        codec = export_settings.get("codec", "h264")  # h264, hevc, av1, vp9
        hw_accel = export_settings.get("hwAccel", True)
        quality = export_settings.get("quality", "high")  # low, medium, high, ultra
        bitrate = export_settings.get("bitrate", "auto")

        # Collect all active clips and determine total timeline duration
        video_clips = []
        audio_clips = []
        text_clips = []
        max_duration = 0.0

        for track in tracks:
            t_type = track.get("type")
            is_muted = track.get("muted", False)
            track_vol = float(track.get("volume", 1.0))

            for clip in track.get("clips", []):
                t_start = float(clip.get("timelineStart", 0.0))
                dur = float(clip.get("duration", 0.0))
                t_end = t_start + dur
                if t_end > max_duration:
                    max_duration = t_end

                c_copy = dict(clip)
                c_copy["trackType"] = t_type
                c_copy["trackMuted"] = is_muted
                c_copy["trackVolume"] = track_vol

                if t_type == "video":
                    video_clips.append(c_copy)
                elif t_type == "audio":
                    audio_clips.append(c_copy)
                elif t_type == "text":
                    text_clips.append(c_copy)

        if max_duration <= 0.0:
            max_duration = 5.0  # Fallback duration if empty

        # Map input files to input indices
        input_files = []
        input_indices = {}

        for clip in video_clips + audio_clips:
            src = clip.get("sourcePath")
            if src and os.path.exists(src) and src not in input_indices:
                input_indices[src] = len(input_files)
                input_files.append(src)

        cmd = [FFMPEG_BIN, "-y"]

        # Hardware acceleration decoding flags if requested
        if hw_accel:
            cmd.extend(["-hwaccel", "auto"])

        # Add all unique input files
        for src in input_files:
            cmd.extend(["-i", str(src)])

        filter_complex_parts = []

        # ── Video Compositing ──────────────────────────────────────────────
        # Base background canvas
        filter_complex_parts.append(
            f"color=c=black:s={width}x{height}:r={fps}:d={round(max_duration, 4)}[base_canvas]"
        )
        prev_video_node = "[base_canvas]"

        # Process video clips in order of timeline start
        video_clips.sort(key=lambda c: float(c.get("timelineStart", 0.0)))

        for idx, clip in enumerate(video_clips):
            src = clip.get("sourcePath")
            in_idx = input_indices.get(src)
            if in_idx is None:
                continue

            t_start = float(clip.get("timelineStart", 0.0))
            dur = float(clip.get("duration", 1.0))
            src_start = float(clip.get("sourceStart", 0.0))
            speed = float(clip.get("speed", 1.0))
            opacity = float(clip.get("opacity", 1.0))
            tf = clip.get("transform", {})
            scale_val = float(tf.get("scale", 1.0))
            pos_x = int(tf.get("x", 0))
            pos_y = int(tf.get("y", 0))
            color_adj = clip.get("colorAdjustments", {})
            bri = float(color_adj.get("brightness", 0.0))
            con = float(color_adj.get("contrast", 1.0))
            sat = float(color_adj.get("saturation", 1.0))

            clip_v_in = f"[{in_idx}:v]"
            node_name = f"clip_{idx}_v"

            # Apply trim, speed, scale, color adjustments
            filters = [
                f"trim=start={round(src_start, 4)}:duration={round(dur, 4)}",
                f"setpts=PTS-STARTPTS",
                f"scale={width}:{height}:force_original_aspect_ratio=decrease",
                f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2"
            ]

            if abs(speed - 1.0) > 0.01:
                filters.append(f"setpts=N/({speed}*TB)")

            if abs(bri) > 0.01 or abs(con - 1.0) > 0.01 or abs(sat - 1.0) > 0.01:
                filters.append(f"eq=brightness={bri}:contrast={con}:saturation={sat}")

            if opacity < 0.99:
                filters.append(f"format=rgba,colorchannelmixer=aa={opacity}")

            filter_complex_parts.append(
                f"{clip_v_in}{','.join(filters)}[{node_name}]"
            )

            # Overlay onto accumulator canvas
            next_video_node = f"[comp_v_{idx}]"
            enable_expr = f"between(t,{round(t_start, 4)},{round(t_start + dur, 4)})"
            filter_complex_parts.append(
                f"{prev_video_node}[{node_name}]overlay={pos_x}:{pos_y}:enable='{enable_expr}'{next_video_node}"
            )
            prev_video_node = next_video_node

        # Add text overlays if any
        for idx, tclip in enumerate(text_clips):
            t_data = tclip.get("textData", {})
            text_str = t_data.get("text", "").replace("'", "\\'").replace(":", "\\:")
            if not text_str:
                continue

            t_start = float(tclip.get("timelineStart", 0.0))
            dur = float(tclip.get("duration", 2.0))
            font_size = int(t_data.get("fontSize", 42))
            font_color = t_data.get("color", "white")
            bg_color = t_data.get("backgroundColor", "")
            pos = t_data.get("position", "bottom")

            y_expr = "h-(text_h+50)" if pos == "bottom" else ("(h-text_h)/2" if pos == "center" else "50")
            enable_expr = f"between(t,{round(t_start, 4)},{round(t_start + dur, 4)})"

            font_opt = "fontfile=C\\\\:/Windows/Fonts/arial.ttf:" if os.name == "nt" else ""
            draw_opts = [
                f"text='{text_str}'",
                f"fontsize={font_size}",
                f"fontcolor={font_color}",
                f"x=(w-text_w)/2",
                f"y={y_expr}",
                f"enable='{enable_expr}'"
            ]
            if bg_color:
                draw_opts.extend(["box=1", f"boxcolor={bg_color}@0.6", "boxborderw=10"])

            next_text_node = f"[text_comp_{idx}]"
            filter_complex_parts.append(
                f"{prev_video_node}drawtext={font_opt}{':'.join(draw_opts)}{next_text_node}"
            )
            prev_video_node = next_text_node

        final_video_node = prev_video_node

        # ── Audio Compositing ──────────────────────────────────────────────
        audio_nodes = []
        for idx, aclip in enumerate(audio_clips):
            if aclip.get("trackMuted", False):
                continue

            src = aclip.get("sourcePath")
            in_idx = input_indices.get(src)
            if in_idx is None:
                continue

            t_start = float(aclip.get("timelineStart", 0.0))
            dur = float(aclip.get("duration", 1.0))
            src_start = float(aclip.get("sourceStart", 0.0))
            clip_vol = float(aclip.get("volume", 1.0))
            trk_vol = float(aclip.get("trackVolume", 1.0))
            final_vol = max(0.0, clip_vol * trk_vol)

            delay_ms = int(round(t_start * 1000))
            a_node = f"[a_clip_{idx}]"

            filter_complex_parts.append(
                f"[{in_idx}:a]atrim=start={round(src_start, 4)}:duration={round(dur, 4)},asetpts=PTS-STARTPTS,volume={final_vol},adelay={delay_ms}|{delay_ms}{a_node}"
            )
            audio_nodes.append(a_node)

        final_audio_node = None
        if audio_nodes:
            if len(audio_nodes) == 1:
                final_audio_node = audio_nodes[0]
            else:
                final_audio_node = "[a_mix_out]"
                filter_complex_parts.append(
                    f"{''.join(audio_nodes)}amix=inputs={len(audio_nodes)}:duration=longest:normalize=0{final_audio_node}"
                )
        else:
            # Generate silent audio track matching video duration
            final_audio_node = "[silent_a]"
            filter_complex_parts.append(
                f"anullsrc=r=48000:cl=stereo:d={round(max_duration, 4)}{final_audio_node}"
            )

        # Assemble filter_complex string
        cmd.extend(["-filter_complex", ";".join(filter_complex_parts)])
        cmd.extend(["-map", final_video_node])
        cmd.extend(["-map", final_audio_node])

        # Video encoding settings & Codec selection
        if codec == "h264":
            if hw_accel and self._check_nvenc_available():
                cmd.extend(["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "22"])
            else:
                cmd.extend(["-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p"])
        elif codec == "hevc" or codec == "h265":
            if hw_accel and self._check_nvenc_available():
                cmd.extend(["-c:v", "hevc_nvenc", "-preset", "p4", "-cq", "26"])
            else:
                cmd.extend(["-c:v", "libx265", "-preset", "medium", "-crf", "25", "-pix_fmt", "yuv420p"])
        elif codec == "vp9":
            cmd.extend(["-c:v", "libvpx-vp9", "-crf", "30", "-b:v", "0"])
        elif codec == "av1":
            cmd.extend(["-c:v", "libsvtav1", "-crf", "30"])
        else:
            cmd.extend(["-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p"])

        # Audio encoding
        cmd.extend(["-c:a", "aac", "-b:a", "192k", "-ar", "48000"])

        # Format-specific container flags
        cmd.extend(["-movflags", "+faststart", "-t", str(round(max_duration, 4))])
        cmd.append(str(output_path))

        return cmd, max_duration

    def _check_nvenc_available(self) -> bool:
        """Checks if NVIDIA NVENC encoder is usable in current FFmpeg build"""
        try:
            res = subprocess.run([FFMPEG_BIN, "-encoders"], capture_output=True, text=True, timeout=5)
            return "h264_nvenc" in res.stdout
        except Exception:
            return False


# Global compositor instance
timeline_compositor = TimelineCompositor()
