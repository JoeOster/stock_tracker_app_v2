param (
    [string]$rm
)

if ($rm -eq "-rm") {
    $dbFile = "dev-Stratlab.db"
    if (Test-Path $dbFile) {
        Remove-Item $dbFile
        Write-Host "Removed database file: $dbFile"
    } else {
        Write-Host "Database file not found: $dbFile"
    }
}

Clear-Host
npm run format:fix
npm run lint:fix
Clear-Host
npm run format
npm run lint
npm start