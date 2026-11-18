# NEXORA AI — Video Studio API Reference

All video studio endpoints are prefixed with `/api/jarvis/video`.

---

## 1. Project Management

### `POST /project/create`
Creates a new project manifest.
* **Body:**
  ```json
  {
    "name": "My New Project",
    "aspectRatio": "16:9",
    "fps": 30
  }
  ```
* **Response:** `{ "success": true, "project": { ... } }`

### `GET /project/<project_id>`
Retrieves a project by ID.
* **Response:** `{ "success": true, "project": { ... } }`

### `POST /project/save`
Persists project changes to disk.
* **Body:** `{ "project": { ... } }`
* **Response:** `{ "success": true, "updatedAt": "..." }`

### `GET /projects`
Lists all available editing projects.
* **Response:** `{ "success": true, "projects": [ ... ] }`

### `POST /project/duplicate`
Duplicates an existing project with a new ID.
* **Body:** `{ "projectId": "...", "name": "..." }`

### `DELETE /project/<project_id>`
Deletes a project file.

---

## 2. Lossless Operations (Stream Copy)

### `POST /lossless/inspect`
Deeply analyzes video and audio streams via ffprobe.
* **Body:** `{ "path": "D:/Videos/clip.mp4" }`
* **Response:** `{ "success": true, "duration": 12.4, "video": { "codec": "h264", "width": 1920, ... }, "audio": { ... } }`

### `POST /lossless/keyframes`
Retrieves I-frame (keyframe) timestamps for GOP-aligned cuts.
* **Body:** `{ "path": "D:/Videos/clip.mp4" }`
* **Response:** `{ "success": true, "keyframes": [ { "time": 0.0, "type": "I" }, ... ] }`

### `POST /lossless/compatibility`
Checks whether multiple video files share identical codecs, dimensions, and formats for zero-reencode merging.
* **Body:** `{ "paths": ["clip1.mp4", "clip2.mp4"] }`
* **Response:** `{ "compatible": true, "operation_type": "lossless_stream_copy", "issues": [] }`

### `POST /lossless/trim`
Executes instant zero-reencode cutting.
* **Body:** `{ "path": "clip.mp4", "start": 5.0, "end": 15.0 }`

### `POST /lossless/merge`
Concatenates compatible video clips via FFmpeg demuxer without re-encoding.
* **Body:** `{ "paths": ["clip1.mp4", "clip2.mp4"] }`

### `POST /lossless/remux`
Remuxes audio/video into a different container format without quality loss.
* **Body:** `{ "path": "clip.mkv", "format": "mp4" }`

---

## 3. Real Rendering & Export Queue

### `POST /render/timeline`
Starts asynchronous background multitrack rendering with real FFmpeg progress piping.
* **Body:**
  ```json
  {
    "project": { ... },
    "settings": {
      "format": "mp4",
      "resolution": "1080p",
      "codec": "h264",
      "quality": "high",
      "hwAccel": true
    }
  }
  ```
* **Response:** `{ "success": true, "job_id": "...", "status": "queued" }`

### `GET /render/jobs`
Lists all export jobs in history.

### `GET /render/status/<job_id>`
Retrieves live progress (percentage, fps, speed, status).

### `POST /render/cancel/<job_id>`
Cancels an active render job.

---

## 4. AI Content Analysis & Subtitles

### `POST /ai/scenes`
Detects visual shot boundaries and timestamps.
* **Body:** `{ "path": "clip.mp4", "threshold": 0.3 }`

### `POST /ai/silence`
Detects silent audio spans for automatic ripple cutting.
* **Body:** `{ "path": "clip.mp4", "noiseDb": -30, "minDuration": 0.5 }`

### `POST /ai/plan`
Translates natural language instructions into a structured video editing plan.
* **Body:** `{ "instruction": "Remove silence and export vertical 9:16 video", "projectId": "..." }`

### `POST /subtitles/generate`
Transcribes audio into synchronized SubRip (.srt) subtitles.
* **Body:** `{ "path": "clip.mp4", "language": "en" }` (Supports: en, kn, hi, te, ta, ml, bn, mr, gu, pa)

---

## 5. Storage & Drive Indexing

### `GET /drives`
Returns all mounted system drives (`C:`, `D:`, USB drives) with storage utilization.

### `POST /drives/scan`
Recursively indexes video, audio, image, and subtitle assets in the directory.
* **Body:** `{ "path": "D:/Videos", "maxDepth": 3 }`

### `GET /drives/search?q=drone&type=video`
Searches indexed media by filename and type.

