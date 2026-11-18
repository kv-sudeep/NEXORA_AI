# Sara's Morning Digest Script
# Runs daily at 8:00 AM IST

param(
    [string]$Time = "08:00"
)

# Load environment
$env:OPENJARVIS_HOME = "C:\Users\User\AppData\Local\OpenJarvis"
$env:OLLAMA_HOST = "http://127.0.0.1:11434"

# Start Ollama if not running
$ollamaRunning = Get-Process ollama -ErrorAction SilentlyContinue
if (-not $ollamaRunning) {
    Write-Host "Starting Ollama..."
    Start-Process "C:\Users\User\AppData\Local\Programs\Ollama\ollama.exe" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep 3
}

# Run morning digest
Write-Host "Sara's Morning Digest for Sudeep"
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "---"

# Check calendar (placeholder - open browser)
Write-Host "Checking calendar..."
Start-Process "https://calendar.google.com"

# Check weather
Write-Host "Weather check: Mumbai, India"
try {
    $weather = Invoke-RestMethod -Uri "https://wttr.in/mumbai?format=3" -ErrorAction Stop
    Write-Host "Weather: $weather"
} catch {
    Write-Host "Weather: Unable to fetch (offline mode)"
}

# Reminders check
Write-Host "Reminders and tasks will be checked via Sara."

Write-Host "---"
Write-Host "Good morning, Sudeep! Sara is ready to help."