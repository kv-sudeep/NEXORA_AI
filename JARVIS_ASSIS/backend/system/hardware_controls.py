"""
hardware_controls.py — JARVIS Windows Hardware Control Layer
Brightness, Volume, Wi-Fi, Bluetooth, Hotspot, Airplane Mode, Battery
"""
import subprocess
import sys
from typing import Optional

import psutil


# ── Helpers ───────────────────────────────────────────────────────────────────
def _ps(script: str, timeout: int = 10) -> tuple[bool, str]:
    """Run a PowerShell command and return (success, output)."""
    try:
        result = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", script],
            capture_output=True, text=True, timeout=timeout
        )
        out = (result.stdout + result.stderr).strip()
        return result.returncode == 0, out
    except subprocess.TimeoutExpired:
        return False, "Command timed out"
    except Exception as e:
        return False, str(e)


def _netsh(*args: str, timeout: int = 10) -> tuple[bool, str]:
    try:
        result = subprocess.run(
            ["netsh"] + list(args), capture_output=True, text=True, timeout=timeout
        )
        return result.returncode == 0, (result.stdout + result.stderr).strip()
    except Exception as e:
        return False, str(e)


# ── Brightness ─────────────────────────────────────────────────────────────────
def get_brightness() -> dict:
    ok, out = _ps(
        "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness).CurrentBrightness"
    )
    try:
        level = int(out.strip()) if ok and out.strip().isdigit() else -1
    except Exception:
        level = -1
    return {"brightness": level, "available": level >= 0}


def set_brightness(level: int) -> dict:
    level = max(0, min(100, int(level)))
    script = (
        f"(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods)"
        f".WmiSetBrightness(1, {level})"
    )
    ok, out = _ps(script)
    return {"success": ok, "brightness": level, "message": out if not ok else f"Brightness set to {level}%"}


# ── Volume ────────────────────────────────────────────────────────────────────
def get_volume() -> dict:
    """Get system master volume (0–100) and mute state."""
    try:
        from ctypes import cast, POINTER
        from comtypes import CLSCTX_ALL
        from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
        devices = AudioUtilities.GetSpeakers()
        interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
        volume = cast(interface, POINTER(IAudioEndpointVolume))
        scalar = volume.GetMasterVolumeLevelScalar()
        muted = bool(volume.GetMute())
        return {"volume": round(scalar * 100), "muted": muted, "available": True}
    except Exception as e:
        # Fallback: nircmd / powershell
        return {"volume": -1, "muted": False, "available": False, "error": str(e)}


def set_volume(level: int) -> dict:
    level = max(0, min(100, int(level)))
    try:
        from ctypes import cast, POINTER
        from comtypes import CLSCTX_ALL
        from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
        devices = AudioUtilities.GetSpeakers()
        interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
        volume = cast(interface, POINTER(IAudioEndpointVolume))
        volume.SetMasterVolumeLevelScalar(level / 100.0, None)
        return {"success": True, "volume": level, "message": f"Volume set to {level}%"}
    except Exception as e:
        # PowerShell fallback
        ok, out = _ps(f"[audio]::Volume = {level / 100.0}")
        return {"success": ok, "volume": level, "message": str(e)}


def toggle_mute() -> dict:
    try:
        from ctypes import cast, POINTER
        from comtypes import CLSCTX_ALL
        from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
        devices = AudioUtilities.GetSpeakers()
        interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
        volume = cast(interface, POINTER(IAudioEndpointVolume))
        current = bool(volume.GetMute())
        volume.SetMute(not current, None)
        return {"success": True, "muted": not current, "message": "Unmuted" if current else "Muted"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def set_mute(mute: bool) -> dict:
    try:
        from ctypes import cast, POINTER
        from comtypes import CLSCTX_ALL
        from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
        devices = AudioUtilities.GetSpeakers()
        interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
        volume = cast(interface, POINTER(IAudioEndpointVolume))
        volume.SetMute(mute, None)
        return {"success": True, "muted": mute}
    except Exception as e:
        return {"success": False, "message": str(e)}


# ── Wi-Fi ─────────────────────────────────────────────────────────────────────
def wifi_status() -> dict:
    ok, out = _netsh("wlan", "show", "interfaces")
    if ok and "SSID" in out:
        lines = out.splitlines()
        ssid = next((l.split(":", 1)[1].strip() for l in lines if "SSID" in l and "BSSID" not in l), "Unknown")
        signal = next((l.split(":", 1)[1].strip() for l in lines if "Signal" in l), "Unknown")
        return {"connected": True, "ssid": ssid, "signal": signal}
    return {"connected": False, "ssid": None, "signal": None}


def wifi_on() -> dict:
    ok, out = _ps("Enable-NetAdapter -Name 'Wi-Fi' -Confirm:$false")
    if not ok:
        ok, out = _ps("Get-NetAdapter | Where-Object {$_.InterfaceDescription -like '*Wi-Fi*' -or $_.Name -like '*Wi-Fi*' -or $_.Name -like '*Wireless*'} | Enable-NetAdapter -Confirm:$false")
    return {"success": ok, "message": "Wi-Fi enabled" if ok else out}


def wifi_off() -> dict:
    ok, out = _ps("Disable-NetAdapter -Name 'Wi-Fi' -Confirm:$false")
    if not ok:
        ok, out = _ps("Get-NetAdapter | Where-Object {$_.InterfaceDescription -like '*Wi-Fi*' -or $_.Name -like '*Wi-Fi*' -or $_.Name -like '*Wireless*'} | Disable-NetAdapter -Confirm:$false")
    return {"success": ok, "message": "Wi-Fi disabled" if ok else out}


# ── Bluetooth ─────────────────────────────────────────────────────────────────
def bluetooth_status() -> dict:
    ok, out = _ps(
        "Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | "
        "Select-Object -Property Status, FriendlyName | ConvertTo-Json"
    )
    if ok and out:
        return {"available": True, "raw": out[:200]}
    return {"available": False, "raw": ""}


def bluetooth_on() -> dict:
    ok, out = _ps(
        "Get-PnpDevice -FriendlyName '*Bluetooth*' -ErrorAction SilentlyContinue | "
        "Enable-PnpDevice -Confirm:$false"
    )
    return {"success": ok, "message": "Bluetooth enabled" if ok else out}


def bluetooth_off() -> dict:
    ok, out = _ps(
        "Get-PnpDevice -FriendlyName '*Bluetooth*' -ErrorAction SilentlyContinue | "
        "Disable-PnpDevice -Confirm:$false"
    )
    return {"success": ok, "message": "Bluetooth disabled" if ok else out}


# ── Hotspot ───────────────────────────────────────────────────────────────────
def hotspot_start(ssid: str = "JARVIS-Hotspot", password: str = "jarvis123") -> dict:
    # Configure and start hosted network
    ok1, _ = _netsh("wlan", "set", "hostednetwork", "mode=allow",
                    f"ssid={ssid}", f"key={password}")
    ok2, out = _netsh("wlan", "start", "hostednetwork")
    return {"success": ok2, "ssid": ssid, "message": "Hotspot started" if ok2 else out}


def hotspot_stop() -> dict:
    ok, out = _netsh("wlan", "stop", "hostednetwork")
    return {"success": ok, "message": "Hotspot stopped" if ok else out}


# ── Airplane Mode ─────────────────────────────────────────────────────────────
def airplane_mode_on() -> dict:
    """Disable all network adapters (simulate airplane mode on Windows)."""
    ok, out = _ps(
        "Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | Disable-NetAdapter -Confirm:$false"
    )
    return {"success": ok, "message": "Airplane mode ON (all adapters disabled)" if ok else out}


def airplane_mode_off() -> dict:
    ok, out = _ps("Get-NetAdapter | Enable-NetAdapter -Confirm:$false")
    return {"success": ok, "message": "Airplane mode OFF (all adapters enabled)" if ok else out}


# ── Battery ───────────────────────────────────────────────────────────────────
def get_battery() -> dict:
    try:
        b = psutil.sensors_battery()
        if b is None:
            return {"available": False, "message": "No battery detected (desktop PC)"}
        return {
            "available": True,
            "percent": round(b.percent, 1),
            "plugged": b.power_plugged,
            "charging": b.power_plugged and b.percent < 100,
            "time_left": b.secsleft if b.secsleft > 0 else None,
            "status": "Charging" if b.power_plugged else "Discharging",
        }
    except Exception as e:
        return {"available": False, "message": str(e)}


def set_power_plan(plan: str = "balanced") -> dict:
    """Switch Windows power plan: balanced, high-performance, power-saver."""
    plans = {
        "balanced": "381b4222-f694-41f0-9685-ff5bb260df2e",
        "high": "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c",
        "high-performance": "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c",
        "power-saver": "a1841308-3541-4fab-bc81-f71556f20b4a",
        "saver": "a1841308-3541-4fab-bc81-f71556f20b4a",
    }
    guid = plans.get(plan.lower(), plans["balanced"])
    ok, out = _ps(f"powercfg /setactive {guid}")
    return {"success": ok, "plan": plan, "message": f"Power plan set to {plan}" if ok else out}


# ── NFC ───────────────────────────────────────────────────────────────────────
def nfc_status() -> dict:
    ok, out = _ps(
        "Get-PnpDevice -Class 'Proximity' -ErrorAction SilentlyContinue | "
        "Select-Object Status, FriendlyName | ConvertTo-Json"
    )
    return {"available": ok, "raw": out[:300] if out else "NFC device not found"}


def nfc_toggle(enable: bool) -> dict:
    action = "Enable" if enable else "Disable"
    ok, out = _ps(
        f"Get-PnpDevice -Class 'Proximity' -ErrorAction SilentlyContinue | "
        f"{action}-PnpDevice -Confirm:$false"
    )
    return {"success": ok, "enabled": enable, "message": f"NFC {'enabled' if enable else 'disabled'}" if ok else out}


# ── GPS / Location ────────────────────────────────────────────────────────────
def get_location_ip() -> dict:
    """Get approximate location via IP geolocation (no GPS hardware needed)."""
    try:
        import urllib.request, json as _json
        with urllib.request.urlopen("https://ipapi.co/json/", timeout=5) as r:
            data = _json.loads(r.read())
            return {
                "available": True,
                "city": data.get("city"),
                "region": data.get("region"),
                "country": data.get("country_name"),
                "lat": data.get("latitude"),
                "lon": data.get("longitude"),
                "ip": data.get("ip"),
                "share_url": f"https://maps.google.com/?q={data.get('latitude')},{data.get('longitude')}",
            }
    except Exception as e:
        return {"available": False, "message": str(e)}


# ── Flashlight (monitor white / keyboard LED) ─────────────────────────────────
_flashlight_on = False


def flashlight_on() -> dict:
    """Simulate flashlight by toggling Caps Lock LED rapidly or opening white screen."""
    global _flashlight_on
    _flashlight_on = True
    # Open white fullscreen window via PowerShell
    script = """
    Add-Type -AssemblyName System.Windows.Forms
    $form = New-Object System.Windows.Forms.Form
    $form.BackColor = [System.Drawing.Color]::White
    $form.WindowState = [System.Windows.Forms.FormWindowState]::Maximized
    $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
    $form.TopMost = $true
    $form.Tag = 'JARVIS_FLASHLIGHT'
    $form.KeyDown += { if ($_.KeyCode -eq 'Escape') { $form.Close() } }
    $form.Show()
    Start-Sleep -Seconds 30
    $form.Close()
    """
    subprocess.Popen(
        ["powershell", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script]
    )
    return {"success": True, "on": True, "message": "Flashlight ON (press Esc or call flashlight_off to close)"}


def flashlight_off() -> dict:
    global _flashlight_on
    _flashlight_on = False
    # Close all flashlight windows
    ok, _ = _ps("Get-Process powershell -ErrorAction SilentlyContinue | Stop-Process -Force")
    return {"success": True, "on": False, "message": "Flashlight OFF"}
