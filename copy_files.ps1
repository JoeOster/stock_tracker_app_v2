# Define source and destination paths
$sourceDir = "c:\Users\skybo\.vscode\stock_tracker_app_v2"
$destDir = "c:\Users\skybo\.vscode\stock_tracker_app_v2\Portfolio V4"

# Create destination directories if they don't exist
New-Item -ItemType Directory -Force -Path "$destDir\user-settings"
New-Item -ItemType Directory -Force -Path "$destDir\public\api"
New-Item -ItemType Directory -Force -Path "$destDir\public\ui"
New-Item -ItemType Directory -Force -Path "$destDir\public\css"
New-Item -ItemType Directory -Force -Path "$destDir\public\images"
New-Item -ItemType Directory -Force -Path "$destDir\public\templates"

# Copy individual files
Copy-Item -Path "$sourceDir\database.js" -Destination "$destDir\database.js"
Copy-Item -Path "$sourceDir\server.js" -Destination "$destDir\server.js"
Copy-Item -Path "$sourceDir\public\ui\formatters.js" -Destination "$destDir\public\ui\formatters.js"
Copy-Item -Path "$sourceDir\public\ui\dropdowns.js" -Destination "$destDir\public\ui\dropdowns.js"
Copy-Item -Path "$sourceDir\public\ui\datetime.js" -Destination "$destDir\public\ui\datetime.js"
Copy-Item -Path "$sourceDir\public\ui\helpers.js" -Destination "$destDir\public\ui\helpers.js"
Copy-Item -Path "$sourceDir\public\ui\journal-settings.js" -Destination "$destDir\public\ui\journal-settings.js"
Copy-Item -Path "$sourceDir\public\ui\settings.js" -Destination "$destDir\public\ui\settings.js"

# Copy directories
Copy-Item -Path "$sourceDir\user-settings\*" -Destination "$destDir\user-settings" -Recurse
Copy-Item -Path "$sourceDir\public\api\*" -Destination "$destDir\public\api" -Recurse
Copy-Item -Path "$sourceDir\public\css\*" -Destination "$destDir\public\css" -Recurse
Copy-Item -Path "$sourceDir\public\images\*" -Destination "$destDir\public\images" -Recurse
Copy-Item -Path "$sourceDir\public\templates\*" -Destination "$destDir\public\templates" -Recurse

Write-Host "File copy process complete."
