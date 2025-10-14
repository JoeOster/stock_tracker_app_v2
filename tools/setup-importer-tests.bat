@echo off
REM Wrapper script to automate the setup for various importer test cases.

cd /d "%~dp0.."

echo.
echo --- Importer Test Setup ---
echo.
echo 1. Setup for Conflict Detection (Test Cases 2 & 3)
echo    (This will clear existing transactions for the 'Primary' account and insert manual buy records).
echo.
CHOICE /C 1 /N /M "Please choose a test to set up:"

IF %ERRORLEVEL%==1 (
    echo.
    echo Running setup for conflict detection...
    node ./tools/importer-testing/setup-conflict-test.js
)

echo.
echo Setup complete.
pause