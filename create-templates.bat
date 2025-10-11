@echo off
echo ===================================
echo  Creating HTML Template Structure
echo ===================================
echo.

:: 1. Create the templates directory
echo --- Creating directory... ---
IF NOT EXIST "public\templates" (
    mkdir "public\templates"
    echo Created: public\templates\
) ELSE (
    echo Directory 'public\templates' already exists.
)
echo.

:: 2. Create empty HTML files for each page and the modals
echo --- Creating empty template files... ---

IF NOT EXIST "public\templates\_dailyReport.html" (type nul > "public\templates\_dailyReport.html" && echo Created: public\templates\_dailyReport.html)
IF NOT EXIST "public\templates\_charts.html" (type nul > "public\templates\_charts.html" && echo Created: public\templates\_charts.html)
IF NOT EXIST "public\templates\_ledger.html" (type nul > "public\templates\_ledger.html" && echo Created: public\templates\_ledger.html)
IF NOT EXIST "public\templates\_orders.html" (type nul > "public\templates\_orders.html" && echo Created: public\templates\_orders.html)
IF NOT EXIST "public\templates\_alerts.html" (type nul > "public\templates\_alerts.html" && echo Created: public\templates\_alerts.html)
IF NOT EXIST "public\templates\_imports.html" (type nul > "public\templates\_imports.html" && echo Created: public\templates\_imports.html)
IF NOT EXIST "public\templates\_snapshots.html" (type nul > "public\templates\_snapshots.html" && echo Created: public\templates\_snapshots.html)
IF NOT EXIST "public\templates\_modals.html" (type nul > "public\templates\_modals.html" && echo Created: public\templates\_modals.html)

echo.
echo ===================================
echo  Template file structure is ready.
echo ===================================
echo.
pause