"""
screen_tools.py — JARVIS Screen & Clipboard Tools
Screenshot, Screen Recording, OCR, QR Scanner, Clipboard Manager
"""
import os
import subprocess
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

# ── Paths ─────────────────────────────────────────────────────────────────────
SCREENSHOTS_DIR = Path.home() / "Pictures" / "JARVIS Screenshots"
RECORDINGS_DIR  = Path.home() / "Videos"  / "JARVIS Recordings"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

# Clipboard history (in-memory, last 50)
_clipboard_history: list[str] = []
_recording_proc: Optional[subprocess.Popen] = None


# ── Screenshot ────────────────────────────────────────────────────────────────
def take_screenshot(filename: Optional[str] = None) -> dict:
    try:
        import pyautogui
        from PIL import Image
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        fname = filename or f"screenshot_{ts}.png"
        fpath = SCREENSHOTS_DIR / fname
        img = pyautogui.screenshot()
        img.save(str(fpath))
        return {
            "success": True,
            "path": str(fpath),
            "filename": fname,
            "message": f"Screenshot saved to {fpath}",
            "size": f"{img.width}x{img.height}",
        }
    except Exception as e:
        # PowerShell fallback
        try:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            fpath = SCREENSHOTS_DIR / f"screenshot_{ts}.png"
            script = f"""
Add-Type -AssemblyName System.Windows.Forms
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bmp.Save('{str(fpath)}')
$g.Dispose()
$bmp.Dispose()
"""
            subprocess.run(["powershell", "-Command", script], capture_output=True, timeout=10)
            return {"success": True, "path": str(fpath), "filename": fpath.name,
                    "message": f"Screenshot saved via PowerShell to {fpath}"}
        except Exception as e2:
            return {"success": False, "message": f"Screenshot failed: {str(e)} | {str(e2)}"}


# ── Screen Recording ──────────────────────────────────────────────────────────
def start_screen_recording(filename: Optional[str] = None) -> dict:
    global _recording_proc
    if _recording_proc and _recording_proc.poll() is None:
        return {"success": False, "message": "Screen recording already in progress"}
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    fname = filename or f"recording_{ts}.mp4"
    fpath = RECORDINGS_DIR / fname
    try:
        _recording_proc = subprocess.Popen(
            ["ffmpeg", "-y", "-f", "gdigrab", "-framerate", "30",
             "-i", "desktop", "-c:v", "libx264", "-preset", "ultrafast",
             "-crf", "28", str(fpath)],
            stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        return {"success": True, "path": str(fpath), "filename": fname,
                "message": f"Recording started → {fpath}"}
    except FileNotFoundError:
        return {"success": False, "message": "ffmpeg not found. Install from https://ffmpeg.org"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def stop_screen_recording() -> dict:
    global _recording_proc
    if not _recording_proc or _recording_proc.poll() is not None:
        return {"success": False, "message": "No active screen recording"}
    try:
        _recording_proc.communicate(input=b"q", timeout=10)
        path = "See JARVIS Recordings folder"
        _recording_proc = None
        return {"success": True, "message": f"Recording stopped and saved. {path}"}
    except Exception as e:
        _recording_proc.kill()
        _recording_proc = None
        return {"success": True, "message": f"Recording stopped forcefully: {e}"}


def is_recording() -> bool:
    return _recording_proc is not None and _recording_proc.poll() is None


# ── OCR ───────────────────────────────────────────────────────────────────────
def ocr_region(x: int = 0, y: int = 0, w: int = 0, h: int = 0) -> dict:
    """OCR text from screen region. If w=h=0, captures full screen."""
    try:
        import pyautogui
        from PIL import Image
        if w > 0 and h > 0:
            img = pyautogui.screenshot(region=(x, y, w, h))
        else:
            img = pyautogui.screenshot()
    except Exception as e:
        return {"success": False, "text": "", "message": f"Screen capture failed: {e}"}

    # Try pytesseract
    try:
        import pytesseract
        text = pytesseract.image_to_string(img).strip()
        return {"success": True, "text": text, "engine": "tesseract"}
    except ImportError:
        pass

    # Windows OCR fallback via PowerShell
    try:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        tmp = SCREENSHOTS_DIR / f"ocr_tmp_{ts}.png"
        img.save(str(tmp))
        script = f"""
Add-Type -AssemblyName Windows.Media
$file = [Windows.Storage.StorageFile]::GetFileFromPathAsync('{str(tmp)}').AsTask().Result
$stream = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read).AsTask().Result
$decoder = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream).AsTask().Result
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
$bitmap = $decoder.GetSoftwareBitmapAsync().AsTask().Result
$result = $engine.RecognizeAsync($bitmap).AsTask().Result
Write-Output $result.Text
"""
        res = subprocess.run(["powershell", "-Command", script], capture_output=True, text=True, timeout=15)
        text = res.stdout.strip()
        tmp.unlink(missing_ok=True)
        return {"success": bool(text), "text": text, "engine": "windows-ocr"}
    except Exception as e2:
        return {"success": False, "text": "", "message": f"OCR unavailable: {e2}"}


def ocr_from_clipboard() -> dict:
    """Try OCR on whatever is in the clipboard (if it is an image)."""
    try:
        import win32clipboard
        from PIL import Image
        import io
        win32clipboard.OpenClipboard()
        data = win32clipboard.GetClipboardData(win32clipboard.CF_DIB)
        win32clipboard.CloseClipboard()
        img = Image.open(io.BytesIO(data))
        try:
            import pytesseract
            text = pytesseract.image_to_string(img)
            return {"success": True, "text": text.strip(), "source": "clipboard"}
        except Exception:
            return {"success": False, "text": "", "message": "tesseract not installed"}
    except Exception as e:
        return {"success": False, "text": "", "message": str(e)}


# ── QR Scanner ────────────────────────────────────────────────────────────────
def scan_qr_from_screen() -> dict:
    """Screenshot the screen and decode any QR codes found."""
    try:
        import pyautogui
        from PIL import Image
        img = pyautogui.screenshot()
    except Exception as e:
        return {"success": False, "codes": [], "message": f"Screenshot failed: {e}"}
    try:
        from pyzbar import pyzbar
        codes = pyzbar.decode(img)
        results = [{"data": c.data.decode("utf-8"), "type": c.type} for c in codes]
        return {"success": True, "codes": results, "count": len(results),
                "message": f"Found {len(results)} QR/barcode(s)" if results else "No QR codes found on screen"}
    except ImportError:
        return {"success": False, "codes": [], "message": "pyzbar/libzbar not available. Install zbar DLL."}
    except Exception as e:
        return {"success": False, "codes": [], "message": str(e)}


# ── Clipboard Manager ─────────────────────────────────────────────────────────
def read_clipboard() -> dict:
    try:
        import pyperclip
        text = pyperclip.paste()
        if text and (not _clipboard_history or _clipboard_history[-1] != text):
            _clipboard_history.append(text)
            if len(_clipboard_history) > 50:
                _clipboard_history.pop(0)
        return {"success": True, "text": text, "length": len(text)}
    except Exception as e:
        return {"success": False, "text": "", "message": str(e)}


def write_clipboard(text: str) -> dict:
    try:
        import pyperclip
        pyperclip.copy(text)
        _clipboard_history.append(text)
        if len(_clipboard_history) > 50:
            _clipboard_history.pop(0)
        return {"success": True, "message": f"Copied {len(text)} characters to clipboard"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def get_clipboard_history() -> dict:
    return {"history": list(reversed(_clipboard_history)), "count": len(_clipboard_history)}


def clear_clipboard() -> dict:
    try:
        import pyperclip
        pyperclip.copy("")
        return {"success": True, "message": "Clipboard cleared"}
    except Exception as e:
        return {"success": False, "message": str(e)}


# ── Screen Reading (TTS) ───────────────────────────────────────────────────────
def read_screen_text(text: Optional[str] = None) -> dict:
    """Read text aloud using Windows SAPI. If text is None, reads clipboard."""
    if text is None:
        clip = read_clipboard()
        text = clip.get("text", "")
    if not text:
        return {"success": False, "message": "No text to read"}
    script = f"""
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = 1
$synth.Speak("{text[:1000].replace('"', "'")}")
"""
    ok, out = subprocess.run(
        ["powershell", "-Command", script],
        capture_output=True, text=True, timeout=30
    ), None
    return {"success": True, "text_length": len(text), "message": f"Reading {len(text)} characters aloud"}
