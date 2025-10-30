# fix_imports.ps1
# This script reads all .js files in /public and rewrites the import statements
# that were broken by the refactoring of 'public/api.js' into 'public/api/'.
#
# It intelligently replaces old single-line imports with new, correct multi-line
# imports grouped by their new module.

$ErrorActionPreference = "Stop"
Write-Host -ForegroundColor Cyan "Starting API import refactor script..."

try {
    # 1. Define the master list of which function lives in which new file
    $functionMap = @{
        "handleResponse" = "api-helpers.js";
        "refreshLedger" = "transactions-api.js";
        "fetchSalesForLot" = "transactions-api.js";
        "updatePricesForView" = "price-api.js";
        "updateAllPrices" = "price-api.js";
        "fetchPendingOrders" = "orders-api.js";
        "addPendingOrder" = "orders-api.js";
        "fetchAlerts" = "alerts-api.js";
        "fetchDailyPerformance" = "reporting-api.js";
        "fetchPositions" = "reporting-api.js";
        "fetchSnapshots" = "reporting-api.js";
        "fetchAdviceSources" = "sources-api.js";
        "addAdviceSource" = "sources-api.js";
        "updateAdviceSource" = "sources-api.js";
        "deleteAdviceSource" = "sources-api.js";
        "fetchSourceDetails" = "sources-api.js";
        "addSourceNote" = "sources-api.js";
        "deleteSourceNote" = "sources-api.js";
        "updateSourceNote" = "sources-api.js";
        "fetchJournalEntries" = "journal-api.js";
        "addJournalEntry" = "journal-api.js";
        "updateJournalEntry" = "journal-api.js";
        "executeJournalEntry" = "journal-api.js";
        "deleteJournalEntry" = "journal-api.js";
        "addWatchlistItem" = "watchlist-api.js";
        "deleteWatchlistItem" = "watchlist-api.js";
        "addDocument" = "documents-api.js";
        "deleteDocument" = "documents-api.js"
    }

    # 2. Get the root 'public' directory
    $publicDir = Join-Path (Get-Location) "public"
    Write-Host "Scanning for .js files in $publicDir..."

    # 3. Get all .js files (excluding the new api folder itself)
    $jsFiles = Get-ChildItem -Path $publicDir -Recurse -Filter *.js | Where-Object { $_.DirectoryName -notlike "*\public\api" }

    # 4. Define the regex to find the old import
    # This captures the function list (group 1) and the path (group 2)
    $importRegex = [regex]'import\s*\{([^\}]+)\}\s*from\s*[''"](\.\.?/api\.js)[''"];?'

    foreach ($file in $jsFiles) {
        $filePath = $file.FullName
        $content = Get-Content $filePath -Raw
        
        # ==================================
        # THE FIX IS HERE
        # ==================================
        # Check if the file is empty before trying to match
        if ([string]::IsNullOrEmpty($content)) {
            Write-Host -ForegroundColor Gray "Processing: $filePath"
            Write-Host -ForegroundColor Gray "  ...skipping empty file."
            continue # Move to the next file
        }
        # ==================================
        # END FIX
        # ==================================

        $originalContent = $content
        $fileWasModified = $false
        $newImports = [System.Collections.Generic.List[string]]@()
        $linesToRemove = [System.Collections.Generic.List[string]]@()

        # Find all matches in the file
        $matches = $importRegex.Matches($content)

        if ($matches.Count -eq 0) {
            continue # Skip file if no old imports
        }

        Write-Host -ForegroundColor Yellow "Processing: $filePath"

        foreach ($match in $matches) {
            $fullImportLine = $match.Value
            $functionsString = $match.Groups[1].Value.Trim()
            $oldPath = $match.Groups[2].Value # e.g., "../api.js" or "./api.js"
            
            # Determine the new relative path prefix
            $newPathPrefix = ""
            if ($oldPath -eq "../api.js") {
                $newPathPrefix = "../api/"
            } elseif ($oldPath -eq "./api.js") {
                $newPathPrefix = "./api/"
            } else {
                Write-Warning "Could not determine new path for $oldPath in $filePath. Skipping this line."
                continue
            }

            # This will store new imports grouped by their target file
            $groupedImports = @{}

            # Split functions and find their new home
            $functions = $functionsString.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_.Length -gt 0 }

            foreach ($functionName in $functions) {
                if ($functionMap.ContainsKey($functionName)) {
                    $newFile = $functionMap[$functionName]
                    if (-not $groupedImports.ContainsKey($newFile)) {
                        $groupedImports[$newFile] = [System.Collections.Generic.List[string]]@()
                    }
                    $groupedImports[$newFile].Add($functionName)
                } else {
                    Write-Warning "  - Function '$functionName' was not in the refactor map. It will be dropped from imports."
                }
            }

            # Build the new import statements
            foreach ($fileKey in $groupedImports.Keys) {
                $funcList = [string]::Join(", ", $groupedImports[$fileKey])
                $newImportLine = "import { $funcList } from '$newPathPrefix$fileKey';"
                $newImports.Add($newImportLine)
            }
            
            # Mark the old line for removal
            $linesToRemove.Add($fullImportLine)
            $fileWasModified = $true
        }

        if ($fileWasModified) {
            # Remove all old lines
            foreach ($line in $linesToRemove) {
                # Use -replace with [regex]::Escape to treat the string as a literal
                # Add optional semicolon and newline matching to clean up
                $content = $content -replace ([regex]::Escape($line) + ";?`r?`n"), ""
            }
            
            # Add the new lines at the top (sorted and unique)
            $newImportBlock = ($newImports | Sort-Object -Unique) -join "`r`n"
            $content = "$newImportBlock`r`n$content"
            
            # Clean up excessive blank lines that might result
            $content = $content -replace "(\r?\n){3,}", "`r`n`r`n"
            
            # Write changes back
            Write-Host -ForegroundColor Green "  ...imports rewritten."
            
            $content | Set-Content -Path $filePath -Encoding utf8
        }
    }

    Write-Host -ForegroundColor Green "---"
    Write-Host -ForegroundColor Green "Import fix script finished."
    Write-Host -ForegroundColor Yellow "ACTION REQUIRED: Please manually delete the old 'public/api.js' file."
    Write-Host -ForegroundColor Yellow "After deleting, please run your tests to confirm all imports are working."

} catch {
    Write-Host -ForegroundColor Red "An error occurred:"
    Write-Host -ForegroundColor Red $_
}