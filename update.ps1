<#
.SYNOPSIS
    Creates the empty scaffolding files for the Phase 4 (Watchlist Hub) refactor.

.DESCRIPTION
    This script reads a list of new files, ensures their parent directories exist,
    and then creates the empty files. It is safe to run multiple times, as it
    will not overwrite existing files or folders.

.NOTES
    Run this script from the project's root directory (e.g., by running '.\create-phase4-scaffolding.ps1').
#>

Write-Host "Starting Phase 4 scaffolding..."
Write-Host "--------------------------------"

# List of all new files to be created relative to the script location
$filesToCreate = @(
    "public/templates/_modal_add_paper_trade.html",
    "public/event-handlers/_modal_add_paper_trade.js",
    "public/templates/_watchlist.html",
    "public/event-handlers/_watchlist.js",
    "public/ui/renderers/_watchlist_real.js",
    "public/css/components/_watchlist.css"
)

foreach ($file in $filesToCreate) {
    # Get the full path based on the script's location
    $fullPath = Join-Path -Path $PSScriptRoot -ChildPath $file
    
    # Get the parent directory of the file
    $directory = Split-Path -Path $fullPath -Parent

    # 1. Create the directory if it doesn't exist
    # (This is a safeguard, but these directories should already exist)
    if (-not (Test-Path -Path $directory)) {
        Write-Host "Creating directory: $directory" -ForegroundColor Yellow
        New-Item -Path $directory -ItemType Directory -Force | Out-Null
    }

    # 2. Create the file if it doesn't exist
    if (-not (Test-Path -Path $fullPath)) {
        Write-Host "Creating file: $file" -ForegroundColor Green
        New-Item -Path $fullPath -ItemType File | Out-Null
    } else {
        Write-Host "Skipped (already exists): $file" -ForegroundColor Gray
    }
}

Write-Host "--------------------------------"
Write-Host "Scaffolding creation complete."