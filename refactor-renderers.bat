@echo off
echo ===================================
echo  Creating Renderer Refactor Structure
echo ===================================
echo.

:: Create Directory
echo --- Creating directory... ---
IF NOT EXIST "public\ui\renderers" (mkdir "public\ui\renderers" && echo Created: public\ui\renderers\)
echo Directory is ready.
echo.

:: Create Empty JS Files
echo --- Creating empty .js files... ---

IF NOT EXIST "public\ui\renderers\_tabs.js" (type nul > "public\ui\renderers\_tabs.js" && echo Created: public\ui\renderers\_tabs.js)
IF NOT EXIST "public\ui\renderers\_dailyReport.js" (type nul > "public\ui\renderers\_dailyReport.js" && echo Created: public\ui\renderers\_dailyReport.js)
IF NOT EXIST "public\ui\renderers\_charts.js" (type nul > "public\ui\renderers\_charts.js" && echo Created: public\ui\renderers\_charts.js)
IF NOT EXIST "public\ui\renderers\_ledger.js" (type nul > "public\ui\renderers\_ledger.js" && echo Created: public\ui\renderers\_ledger.js)
IF NOT EXIST "public\ui\renderers\_orders.js" (type nul > "public\ui\renderers\_orders.js" && echo Created: public\ui\renderers\_orders.js)
IF NOT EXIST "public\ui\renderers\_alerts.js" (type nul > "public\ui\renderers\_alerts.js" && echo Created: public\ui\renderers\_alerts.js)
IF NOT EXIST "public\ui\renderers\_snapshots.js" (type nul > "public\ui\renderers\_snapshots.js" && echo Created: public\ui\renderers\_snapshots.js)

echo.
echo ===================================
echo  File structure is ready for refactoring.
echo ===================================
echo.
pause