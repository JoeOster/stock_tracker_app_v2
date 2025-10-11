@echo off
echo ===================================
echo  Refactoring UI Test Files
echo ===================================
echo.

:: 1. Delete the old, monolithic renderer test file
echo --- Deleting old test file... ---
IF EXIST "public\ui\renderers.test.js" (
    del "public\ui\renderers.test.js"
    echo Deleted: public\ui\renderers.test.js
) ELSE (
    echo Old file not found. Skipping deletion.
)
echo.

:: 2. Create the new, empty test file for tabs
echo --- Creating new test file... ---
IF NOT EXIST "public\ui\renderers\_tabs.test.js" (
    type nul > "public\ui\renderers\_tabs.test.js"
    echo Created: public\ui\renderers\_tabs.test.js
) ELSE (
    echo New test file already exists.
)
echo.

echo ===================================
echo  Test file structure updated.
echo  Please add the test code to the new file.
echo ===================================
echo.
pause