[CmdletBinding()]
param (
    [switch]$rm,
    [switch]$skipChecks
)

if ($rm) {
    $dbFile = "dev-Stratlab.db"
    if (Test-Path $dbFile) {
        Remove-Item $dbFile
        Write-Host "Removed database file: $dbFile"
    } else {
        Write-Host "Database file not found: $dbFile"
    }
}

if (-not (Test-Path "node_modules")) {
    Write-Host "Node modules not found. Running 'npm install'..."
    npm install
}

if (-not $skipChecks) {
    Clear-Host
    npm run format:fix
    npm run lint:fix
    Clear-Host
    npm run format
    npm run lint
} else {
    Clear-Host
}

Start-Job -ScriptBlock { npm start } | Out-Null

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$edgeArgs = "--remote-debugging-port=9222 --user-data-dir=`"$env:TEMP\edge_profile`" http://localhost:3000"
Start-Process -FilePath $edgePath -ArgumentList $edgeArgs -NoNewWindow -PassThru | Out-Null

# Start-Process -FilePath $edgePath -ArgumentList $edgeArgs -NoNewWindow -RedirectStandardOutput "frontend-errors.log" -RedirectStandardError "frontend-errors.log" -PassThru | Out-Null
# The above line is commented out because RedirectStandardOutput and RedirectStandardError are not supported with -NoNewWindow.
# We will rely on the browser's internal logging mechanisms or a separate tool to capture frontend errors.
# For now, this script will just launch Edge with remote debugging enabled.