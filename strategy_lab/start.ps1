[CmdletBinding()]
param (
    [switch]$rm,
    [switch]$skipChecks
)

# --- Define Log Paths and Clean Previous Log ---
$logDir = "$PSScriptRoot\log"
$termLogFile = "$logDir\term.log"
$serverStdoutFile = "$logDir\server_stdout.log"
$serverStderrFile = "$logDir\server_stderr.log"

# Create log directory if it doesn't exist
if (-not (Test-Path $logDir)) {
    New-Item -Path $logDir -ItemType Directory -Force | Out-Null
}

# Clear previous term log if it exists
if (Test-Path $termLogFile) {
    Remove-Item $termLogFile -ErrorAction SilentlyContinue
}

# Redirect all subsequent output to term.log
function Write-Log {
    param([string]$Message)
    Write-Host $Message
    $Message | Out-File -FilePath $termLogFile -Append
}



# --- Define Log Paths and Clean Previous Log ---
$filteredLogFile = "$logDir\frontend-session.log"

if (Test-Path $filteredLogFile) {
    Write-Log "Removing previous filtered log: $filteredLogFile"
    # SilentlyContinue in case the file is locked or permissions are bad
    Remove-Item $filteredLogFile -ErrorAction SilentlyContinue
}# --- End New Section ---

if ($rm) {
    $dbFile = "dev-Stratlab.db"
    Write-Log "Checking for database file to remove: $dbFile"
    if (Test-Path $dbFile) {
        try {
            Remove-Item $dbFile -ErrorAction Stop
            Write-Log "Removed database file: $dbFile"
        } catch {
            Write-Log "Could not remove database file: $dbFile. It might be in use by another process. Error: $_"
        }
    } else {
        Write-Log "Database file not found, no need to remove: $dbFile"
    }
}

$dbFile = "dev-Stratlab.db"
if (Test-Path $dbFile) {
    Write-Log "Database file exists: $dbFile"
} else {
    Write-Log "Database file does NOT exist: $dbFile. It will be created and migrated on server startup."
}

if (-not (Test-Path "node_modules")) {
    Write-Log "Node modules not found. Running 'npm install'..."
    npm install *>&1 | Write-Log
}

if (-not $skipChecks) {
    Clear-Host
    npm run format:fix *>&1 | Write-Log
    npm run lint:fix *>&1 | Write-Log
    Clear-Host
    npm run format *>&1 | Write-Log
    npm run lint *>&1 | Write-Log
} else {
    Clear-Host
}

Write-Log "Starting 'node server.js' as a background process..."
$serverProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $PSScriptRoot -NoNewWindow -PassThru -RedirectStandardOutput $serverStdoutFile -RedirectStandardError $serverStderrFile
$serverPid = $serverProcess.Id

Write-Log "Server job 'DevServer' started."

# --- Wait for Server to be Online ---
Write-Log "Waiting for the dev server at http://localhost:8080..."
$serverReady = $false
$maxAttempts = 20 # Max wait of 30 seconds (20 * 1.5s)
$attempt = 0

while (-not $serverReady -and $attempt -lt $maxAttempts) {
    $attempt++
    try {
        Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing -ErrorAction Stop | Out-Null
        $serverReady = $true
        Write-Log "Server is online!"
    } catch {
        Write-Log "($attempt/$maxAttempts) Server not ready, retrying in 1.5s..."
        Start-Sleep -Milliseconds 1500
    }
}

if (-not $serverReady) {
    Write-Log "Server failed to start after $maxAttempts attempts. Stopping script."
    Stop-Process -Id $serverPid -Force -Recurse
    return # Exit the script
}

# --- Browser Launch and Log Setup ---
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$edgeProfileDir = "$env:TEMP\edge_profile"
$edgeLogFile = "$edgeProfileDir\chrome_debug.log"

if (Test-Path $edgeLogFile) {
    Write-Log "Removing old browser log file..."
    Remove-Item $edgeLogFile
}

$edgeArgs = @(
    "--remote-debugging-port=9222",
    "--user-data-dir=`"$edgeProfileDir`"",
    "--enable-logging",
    "--v=1"
)

Write-Log "Launching Edge. The script will wait for you to close the browser."
Write-Log "Browser console logs will be saved to: $edgeLogFile"

# Use -Wait to pause the script until the Edge process (and all its children) exit.
$fullEdgeArgs = $edgeArgs + "http://localhost:8080"
Start-Process -FilePath $edgePath -ArgumentList $fullEdgeArgs -Wait


# --- Automatic Cleanup (Runs AFTER Edge is closed) ---
Write-Log ""
Write-Log "Browser closed. Starting automated cleanup..."

# 1. Filter the log
# Create the log directory if it doesn't exist
if (-not (Test-Path $logDir)) {
    Write-Log "Creating log directory: $logDir"
    New-Item -Path $logDir -ItemType Directory -Force | Out-Null
}
# Note: $filteredLogFile variable is now set at the top of the script

Write-Log "Filtering browser logs..."
if (Test-Path $edgeLogFile) {
    try {
        # Find all lines containing JavaScript console output or browser errors
        Get-Content $edgeLogFile | Where-Object { ($_ -match ":CONSOLE" -or $_ -match ":ERROR:" -or $_ -match ":FATAL:") -and ($_ -notmatch "chrome-extension://|devtools://") } | Set-Content $filteredLogFile -ErrorAction Stop
        Write-Log "Success! Filtered log saved to: $filteredLogFile"
    } catch {
        Write-Log "Failed to filter log file: $_"
    }
} else {
    Write-Log "Could not find log file to filter: $edgeLogFile"
}

# 2. Stop the dev server
Write-Log "Stopping 'DevServer' background job..."
    # Attempt to stop the server process if it started
    if ($serverPid) {
        # Attempt to gracefully terminate the Node.js server by sending a SIGINT-like signal
        # This allows the Node.js process to execute its shutdown hooks (e.g., stopCronJobs)
        try {
            # On Windows, taskkill without /F can send a termination signal that Node.js can catch
            taskkill /PID ${serverPid} /F | Out-Null
            Write-Log "Sent forceful termination signal to server process ${serverPid}."
            # Wait for the process to actually exit
        try {
            Wait-Process -Id $serverPid -Timeout 30 # Wait up to 30 seconds for graceful shutdown
            Write-Log "Server process ${serverPid} has exited."
        } catch [System.Diagnostics.ProcessCommandException] {
            Write-Log "Server process ${serverPid} was already terminated or exited before Wait-Process could attach."
        } catch {
            Write-Log "An unexpected error occurred while waiting for server process ${serverPid} to exit: $_"
        }
        } catch {
            Write-Log "Failed to send termination signal to server process ${serverPid}: $_"
            # Fallback to forceful termination if graceful fails
            Stop-Process -Id $serverPid -Force -ErrorAction SilentlyContinue
            Write-Log "Forcefully stopped server process $serverPid."
        }
    }
Write-Log "Server job stopped."

# Append server logs to term.log
if (Test-Path $serverStdoutFile) {
    Get-Content $serverStdoutFile | Out-File -FilePath $termLogFile -Append
    # Remove-Item $serverStdoutFile # Keep for inspection
}
if (Test-Path $serverStderrFile) {
    Get-Content $serverStderrFile | Out-File -FilePath $termLogFile -Append
    # Remove-Item $serverStderrFile # Keep for inspection
}

Write-Log ""
Write-Log "Cleanup complete. Goodbye!"