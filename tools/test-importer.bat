@echo off
REM This script automates the setup and execution of the importer testing environment.

cd /d "%~dp0.."

echo.
echo =================================================================
echo  Importer Test Environment Automation
echo =================================================================
echo.
echo This script will:
echo  1. Reset the 'test.db' to a clean state for conflict testing.
echo  2. Start a dedicated test server on http://localhost:3112
echo.
pause

echo.
echo [STEP 1/2] Setting up the test database ('test.db')...
node ./tools/importer-testing/setup-conflict-test.js

IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Database setup failed. Halting script.
    pause
    exit /b 1
)

echo.
echo [STEP 2/2] Starting the test server...
start "Importer Test Server" nodemon test-server.js

echo.
echo ---
echo SUCCESS! The test server is running. You can now open your browser
echo to http://localhost:3112 and begin testing with the sample CSV files
echo located in the /tools/importer-testing/ directory.
echo ---
echo.
pause
