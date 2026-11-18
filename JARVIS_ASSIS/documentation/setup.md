# NEXORA AI — Video Studio Setup & Installation

## Prerequisites
* **Operating System:** Windows 10/11, macOS, or Linux
* **Node.js:** v18+ (tested with v24.15)
* **Python:** 3.10+ (tested with 3.14.4)
* **FFmpeg & FFprobe:** Installed and available on system `PATH` (FFmpeg 9.0+ recommended)

---

## 1. Backend Setup
1. Open terminal in the project directory:
   ```powershell
   cd d:\JARVIS_ASSIS\backend
   ```
2. Activate your virtual environment:
   ```powershell
   .\venv\Scripts\activate
   ```
3. Install required Python packages (if not already installed):
   ```powershell
   pip install -r requirements.txt
   ```
4. Verify environment variables in `backend/.env`:
   - `GEMINI_API_KEY`: For AI video planning and assistance.
   - `FLASK_SECRET_KEY` & `JWT_SECRET_KEY`: For security tokens.
5. Start the Flask backend server:
   ```powershell
   python app.py
   ```
   The backend will start at `http://127.0.0.1:5000`.

---

## 2. Frontend Setup
1. In the project root directory:
   ```powershell
   cd d:\JARVIS_ASSIS
   ```
2. Install frontend dependencies:
   ```powershell
   npm install
   ```
3. Run the development server:
   ```powershell
   npm run dev
   ```
4. Build for production:
   ```powershell
   npm run build
   ```

---

## 3. Running Backend Tests
Execute the comprehensive test suite:
```powershell
backend\venv\Scripts\python.exe -m pytest backend\tests
```
All 45 tests verify security, intruder alerts, hardware, lossless operations, multitrack compositing, real rendering, audio waveforms, scene detection, and adapters.

