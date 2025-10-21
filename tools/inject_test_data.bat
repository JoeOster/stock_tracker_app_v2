@echo off
setlocal

REM Configuration - Paths are relative to the project root where this script is run
set "DB_PATH=.\development.db"
set "SQL_FILE=.\tools\seed_test_data.sql"
set "SQLITE_CMD=C:\sqlite\sqlite3.exe"

echo Injecting test data into %DB_PATH% using %SQL_FILE%...
echo This will DELETE existing data for account holders Test 1-5.

REM Check if sqlite3 command exists by attempting to get its version
%SQLITE_CMD% --version >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: '%SQLITE_CMD%' command not found or not executable.
    echo Please ensure sqlite3 is installed and its directory is in your system PATH.
    goto :error
)

REM Check if database file exists
if not exist "%DB_PATH%" (
    echo ERROR: Database file not found at %DB_PATH%.
    echo Please ensure the database exists or adjust DB_PATH in the script.
    goto :error
)

REM Check if SQL file exists
if not exist "%SQL_FILE%" (
    echo ERROR: SQL script not found at %SQL_FILE%.
    goto :error
)

REM Execute the SQL script using input redirection
echo Running SQL script...
"%SQLITE_CMD%" "%DB_PATH%" < "%SQL_FILE%"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: sqlite3 command failed with error code %ERRORLEVEL%. Check %SQL_FILE% for errors.
    goto :error
)

echo.
echo ===============================================
echo  SUCCESS! Test data injected successfully.
echo ===============================================
goto :end

:error
echo.
echo ===============================================
echo  ERROR! Data injection failed.
echo ===============================================

:end
echo.
pause
endlocal