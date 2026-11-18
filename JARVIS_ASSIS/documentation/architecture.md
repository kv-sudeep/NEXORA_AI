# NEXORA AI — Video Studio Architecture

## 1. Overview
The NEXORA AI Video Studio is an integrated, professional-grade non-linear editing (NLE), lossless processing, programmatic generation, and AI automation suite housed within the existing NEXORA AI (formerly JARVIS 2.0) ecosystem.

It bridges modern web timeline ergonomics (inspired by OpenCut) with native media processing capabilities (LosslessCut), local AI and automation interfaces (Concat), and programmatic motion graphics (Remotion).

---

## 2. System Architecture

```
+────────────────────────────────────────────────────────────────────────────+
|                           FRONTEND LAYER (React 19)                        |
|   • StudioNavbar (Project name, autosave, undo/redo, aspect ratio switcher)|
|   • StudioSidebar (14 tools: Media, Explorer, Audio, Captions, AI, etc.)   |
|   • StudioPreview (HTML5 Canvas, SMPTE timecode, frame stepping, guides)   |
|   • StudioTimeline (V1-V3, A1-A3, T1 multitracks, drag/trim/split/snap)    |
|   • StudioInspector (Context-sensitive transforms, volume, grading, text)  |
|   • StudioStatusBar (Live telemetry: CPU, GPU, render speed & progress)    |
+────────────────────────────────────────────────────────────────────────────+
                                      │
                        HTTP REST / SSE / WebSockets
                                      │
+────────────────────────────────────────────────────────────────────────────+
|                           BACKEND LAYER (Flask 3.0)                        |
|   • video_routes.py (/api/jarvis/video/...)                                |
|   • timeline_service.py (Project CRUD, autosave manifests, versioning)      |
|   • lossless_engine.py (Zero-reencode cutting, remuxing, stream check)     |
|   • timeline_compositor.py (Multitrack filter_complex graph generator)     |
|   • video_exporter.py (Threaded render workers, progress pipe, validation) |
|   • ai_analysis.py (Scene change & silence detection, smart edit plans)    |
|   • subtitle_service.py (Speech-to-text, multilingual captions, burn-in)   |
|   • audio_studio.py (Waveform peak points, EBU R128 normalization, TTS)    |
|   • remotion_generator.py (Programmatic motion graphics & title templates) |
|   • drive_indexer.py (Authorized system drive discovery & media search)    |
|   • concat_adapter.py (Clean JSON-RPC & MCP tool adapter layer)            |
+────────────────────────────────────────────────────────────────────────────+
                                      │
                          Subprocess Execution Array
                                      │
+────────────────────────────────────────────────────────────────────────────+
|                    HARDWARE & PROCESSING ACCELERATION                      |
|   • Native FFmpeg 9.0 & FFprobe 9.0 (Gyan full build)                      |
|   • NVIDIA NVENC (h264_nvenc, hevc_nvenc)                                  |
|   • Windows MediaFoundation & D3D11VA                                      |
|   • CPU fallback (libx264, libx265, libvpx-vp9)                            |
+────────────────────────────────────────────────────────────────────────────+
```

---

## 3. Data Flow & Project Manifest
Projects are saved as structured, non-destructive JSON manifests in `backend/data/video_projects/`:
- **Tracks:** Maintained in explicit rendering order ($V_3$ over $V_2$ over $V_1$).
- **Clips:** Store relative timeline position, duration, source trim points, transforms, color adjustments, and text properties.
- **Rendering:** Translated by `timeline_compositor.py` into a single, highly-optimized FFmpeg `filter_complex` execution graph, preserving source files while rendering real composited video.

