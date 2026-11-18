# NEXORA AI — Repository Integrations Guide

This document defines how the four reference open-source repositories are integrated, adapted, or clean-room implemented within NEXORA AI.

---

## 1. OpenCut (`OpenCut-app/OpenCut`)
* **Role:** UI & Ergonomics Reference.
* **Integration Strategy:** Adapted.
* **Details:** OpenCut's multitrack timeline layout, magnetic snapping, contextual inspector panel, and aspect ratio switching concepts have been implemented natively in React 19 and Tailwind CSS within `src/components/video-studio/`. This avoids relying on OpenCut's in-progress Rust rewrite, while delivering a modern, responsive editing experience tailored to NEXORA AI.

---

## 2. LosslessCut (`mifi/lossless-cut`)
* **Role:** High-Performance Lossless Media Operations.
* **Integration Strategy:** Clean-room implementation in Python.
* **Licensing Compliance:** Because LosslessCut is licensed under GPL-2.0-only, directly copying or linking its TypeScript codebase would impose copyleft requirements. NEXORA AI implements an independent `LosslessEngine` using native FFmpeg/FFprobe CLI primitives:
  - Zero-reencode stream-copy cutting (`-c copy -avoid_negative_ts make_zero -fflags +genpts`).
  - Keyframe analysis via `ffprobe` I-frame detection for glitch-free cuts.
  - Codec & stream compatibility validation before merging to guarantee true lossless concat.

---

## 3. Concat (`jub0t/Concat`)
* **Role:** Local AI & Automation Adapter.
* **Integration Strategy:** Decoupled Service Adapter Layer (`backend/adapters/concat_adapter.py`).
* **Supported Operations:**
  - `create_project`
  - `open_project`
  - `import_media`
  - `add_clip`
  - `trim_clip`
  - `split_clip`
  - `add_caption`
  - `add_title`
  - `apply_effect`
  - `add_audio`
  - `export_project`
  - `get_render_status`
  - `cancel_render`
* **Behavior:** When a local Concat instance or socket is configured (`CONCAT_RPC_PORT`), requests are forwarded via JSON-RPC. When running standalone, requests execute natively through NEXORA AI's Python video engines.

---

## 4. Remotion (`remotion-dev/remotion`)
* **Role:** Programmatic Motion Graphics Generation.
* **Integration Strategy:** Parameterized Template Engine (`backend/modules/video_engine/remotion_generator.py`).
* **Compositions Supported:**
  - `cinematic-title`: Title and subtitle with animated zoom and opacity fades.
  - `lower-third`: Hologram-style lower-third speaker identifier with transparent alpha channel.
  - `shorts-kinetic`: High-impact vertical kinetic text card for Reels and Shorts.
  - `product-promo`: Outro card with call-to-action text and branded URL.
* **Workflow:** Templates can be rendered programmatically or via UI and placed directly onto Video Track 3 (Overlay) or Video Track 1.

