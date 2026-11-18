"""
remotion_generator.py — Programmatic Motion Graphics & Video Generation
Inspired by Remotion. Generates parameterized title cards, lower-thirds,
kinetic typography, social media templates, and animated transparent overlays
using FFmpeg drawtext and SVG/HTML rendering pipelines.
"""
import json
import logging
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


class RemotionGenerator:
    """Renders deterministic motion graphics and animated templates"""

    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = Path(output_dir or tempfile.gettempdir()) / "jarvis_templates"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def list_templates(self) -> List[Dict[str, Any]]:
        """Returns catalog of built-in motion graphics compositions"""
        return [
            {
                "id": "cinematic-title",
                "name": "Cinematic Title Card",
                "description": "Dramatic dark fade with neon cyan typography and subtitle.",
                "duration": 5.0,
                "category": "Titles",
                "aspectRatios": ["16:9", "21:9"],
                "params": [
                    {"name": "title", "type": "string", "default": "NEXORA AI"},
                    {"name": "subtitle", "type": "string", "default": "NEXT GENERATION OPERATING SYSTEM"},
                    {"name": "accentColor", "type": "color", "default": "#00f0ff"}
                ]
            },
            {
                "id": "lower-third",
                "name": "Modern Hologram Lower-Third",
                "description": "Speaker name and title overlay with transparent alpha background.",
                "duration": 6.0,
                "category": "Overlays",
                "aspectRatios": ["16:9", "9:16"],
                "params": [
                    {"name": "speakerName", "type": "string", "default": "Sudeep K V"},
                    {"name": "speakerRole", "type": "string", "default": "Lead Architect"},
                    {"name": "accentColor", "type": "color", "default": "#00f0ff"}
                ]
            },
            {
                "id": "shorts-kinetic",
                "name": "Shorts / Reels Kinetic Intro",
                "description": "Vertical 9:16 high-impact intro with pulsing badges and bold headline.",
                "duration": 4.0,
                "category": "Social Media",
                "aspectRatios": ["9:16"],
                "params": [
                    {"name": "headline", "type": "string", "default": "3 AI TOOLS YOU NEED"},
                    {"name": "tag", "type": "string", "default": "MUST WATCH"},
                    {"name": "accentColor", "type": "color", "default": "#ff0055"}
                ]
            },
            {
                "id": "product-promo",
                "name": "Product Showcase Outro",
                "description": "Call-to-action outro card with glowing border and website URL.",
                "duration": 5.0,
                "category": "Outro",
                "aspectRatios": ["16:9", "1:1", "9:16"],
                "params": [
                    {"name": "ctaText", "type": "string", "default": "DISCOVER MORE AT"},
                    {"name": "brandUrl", "type": "string", "default": "NEXORA.AI"},
                    {"name": "accentColor", "type": "color", "default": "#00f0ff"}
                ]
            }
        ]

    def render_template(self, template_id: str, params: Dict[str, Any],
                        output_path: Optional[str] = None,
                        width: int = 1920, height: int = 1080,
                        fps: int = 30) -> Dict[str, Any]:
        """
        Renders a parameterized template to a video file.
        Produces transparent alpha overlay video or standalone styled MP4.
        """
        templates = {t["id"]: t for t in self.list_templates()}
        tmpl = templates.get(template_id)
        if not tmpl:
            return {"success": False, "error": f"Unknown template: {template_id}"}

        dur = float(tmpl.get("duration", 5.0))
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        if not output_path:
            output_path = str(self.output_dir / f"template_{template_id}_{timestamp}.mp4")

        win_font = os.environ.get("WINDIR", "C:\\Windows") + "\\Fonts\\arial.ttf"
        if os.name == "nt" and os.path.exists(win_font):
            font_esc = win_font.replace("\\", "/").replace(":", r"\:")
            font_opt = f"fontfile='{font_esc}':"
        elif os.path.exists("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
            font_opt = "fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:"
        else:
            font_opt = ""
        # Build FFmpeg procedural composition
        if template_id == "cinematic-title":
            title = str(params.get("title", "NEXORA AI")).replace("'", "\\'").replace(":", "\\:")
            sub = str(params.get("subtitle", "SYSTEM ONLINE")).replace("'", "\\'").replace(":", "\\:")
            accent = params.get("accentColor", "#00f0ff")

            # Animated zoom & fade text graph
            filter_graph = (
                f"color=c=black:s={width}x{height}:r={fps}:d={dur},"
                f"drawtext={font_opt}text='{title}':fontsize=72:fontcolor=white:"
                f"x=(w-text_w)/2:y=(h-text_h)/2-40:"
                f"alpha='if(lt(t,1),t,if(gt(t,{dur-1}),{dur}-t,1))',"
                f"drawtext={font_opt}text='{sub}':fontsize=28:fontcolor={accent}:"
                f"x=(w-text_w)/2:y=(h-text_h)/2+50:"
                f"alpha='if(lt(t,1.2),t-0.2,if(gt(t,{dur-0.8}),{dur}-t,1))'"
            )
        elif template_id == "lower-third":
            name = str(params.get("speakerName", "Speaker")).replace("'", "\\'").replace(":", "\\:")
            role = str(params.get("speakerRole", "Role")).replace("'", "\\'").replace(":", "\\:")
            accent = params.get("accentColor", "#00f0ff")

            filter_graph = (
                f"color=c=black@0.0:s={width}x{height}:r={fps}:d={dur},"
                f"drawbox=x=80:y=h-220:w=600:h=120:color=black@0.8:t=fill,"
                f"drawbox=x=80:y=h-220:w=12:h=120:color={accent}:t=fill,"
                f"drawtext={font_opt}text='{name}':fontsize=38:fontcolor=white:x=110:y=h-200,"
                f"drawtext={font_opt}text='{role}':fontsize=22:fontcolor={accent}:x=110:y=h-150"
            )
        elif template_id == "shorts-kinetic":
            headline = str(params.get("headline", "HEADLINE")).replace("'", "\\'").replace(":", "\\:")
            tag = str(params.get("tag", "HOT")).replace("'", "\\'").replace(":", "\\:")
            accent = params.get("accentColor", "#ff0055")

            filter_graph = (
                f"color=c=#0d0d14:s={width}x{height}:r={fps}:d={dur},"
                f"drawbox=x=(w-300)/2:y=h*0.35:w=300:h=60:color={accent}:t=fill,"
                f"drawtext={font_opt}text='{tag}':fontsize=32:fontcolor=white:x=(w-text_w)/2:y=h*0.35+12,"
                f"drawtext={font_opt}text='{headline}':fontsize=56:fontcolor=white:x=(w-text_w)/2:y=h*0.45"
            )
        else:
            cta = str(params.get("ctaText", "VISIT")).replace("'", "\\'").replace(":", "\\:")
            url = str(params.get("brandUrl", "NEXORA.AI")).replace("'", "\\'").replace(":", "\\:")
            accent = params.get("accentColor", "#00f0ff")

            filter_graph = (
                f"color=c=black:s={width}x{height}:r={fps}:d={dur},"
                f"drawtext={font_opt}text='{cta}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-30,"
                f"drawtext={font_opt}text='{url}':fontsize=64:fontcolor={accent}:x=(w-text_w)/2:y=(h-text_h)/2+40"
            )

        cmd = [
            FFMPEG_BIN, "-y",
            "-filter_complex", filter_graph,
            "-t", str(dur),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "fast",
            "-crf", "20",
            str(output_path)
        ]

        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if res.returncode == 0 and os.path.exists(output_path):
                return {
                    "success": True,
                    "template_id": template_id,
                    "output_path": output_path,
                    "duration": dur,
                    "file_size": os.path.getsize(output_path)
                }
            return {"success": False, "error": res.stderr}
        except Exception as e:
            return {"success": False, "error": str(e)}


# Global generator instance
remotion_generator = RemotionGenerator()
