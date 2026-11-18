# NEXORA AI — Video Studio Troubleshooting Guide

---

## 1. FFmpeg & Hardware Acceleration

### Issue: "FFmpeg not found"
* **Cause:** FFmpeg or FFprobe binaries are missing from the system `PATH`.
* **Fix:** Download FFmpeg from Gyan.dev or install via winget:
  ```powershell
  winget install Gyan.FFmpeg
  ```
  Restart your terminal and verify with:
  ```powershell
  ffmpeg -version; ffprobe -version
  ```

### Issue: "Fontconfig error: Cannot load default config file"
* **Cause:** Windows systems do not have Linux fontconfig default directories when rendering `drawtext` filters.
* **Fix:** NEXORA AI automatically provides `fontfile=C\\:/Windows/Fonts/arial.ttf` for text rendering on Windows. Verify that `C:\Windows\Fonts\arial.ttf` exists.

### Issue: GPU encoding fails
* **Cause:** `h264_nvenc` was requested but no compatible NVIDIA GPU driver is installed.
* **Fix:** NEXORA AI automatically falls back to software `libx264` if hardware acceleration is unavailable. In the Export Modal, uncheck "Hardware Acceleration" to force CPU encoding.

---

## 2. Lossless Merging & Concat

### Issue: "Files are not stream-compatible for lossless merging"
* **Cause:** The input clips have different video codecs, resolutions (e.g. 1080p vs 720p), framerates, or audio channel layouts.
* **Fix:** Lossless merging via `-c copy` requires matching bitstream parameters. Use the Timeline Editor or regular export to re-encode and normalize different clips into a unified video format.

---

## 3. Subtitles & Audio

### Issue: Speech-to-text fails to transcribe
* **Cause:** Missing audio track in source media or network timeout when connecting to speech recognition endpoints.
* **Fix:** Ensure the clip contains an active audio stream. You can also manually add or edit caption clips directly on the Text Track ($T_1$) in the Video Studio.

---

## 4. Frontend Workspace Navigation

### Issue: Switching between Full Studio Workspace and Quick HUD Form
* **Fix:** The Video Studio route (`/video-studio`) defaults to the full professional NLE workspace. If you ever need the legacy single-file form, click "Quick HUD Mode" in the bottom-right corner. To return, click "Switch to Full Studio NLE Workspace" at the top of the HUD panel.

