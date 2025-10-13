@echo off
REM This script resets the development database and injects sample data from a CSV.

REM Change directory to the script's location, then go up one level to the project root.
cd /d "%~dp0.."

set DB_FILE=development.db
set ACCOUNT_HOLDER_ID=
set ACCOUNT_HOLDER_NAME=
set "CSV_FILE="

REM Ask the user for the CSV filename
echo.
set /p CSV_FILE="Enter the name of the CSV file to import (default: sample-data.csv): "
IF NOT DEFINED CSV_FILE (
    set CSV_FILE=sample-data.csv
)

REM Ask the user if they want to delete the database
CHOICE /C YN /M "Do you want to DELETE the existing development database and start fresh?"
IF %ERRORLEVEL%==1 (
    echo Deleting old development database...
    if exist %DB_FILE% del %DB_FILE%
    echo Creating new database and running migrations...
    node database.js
) ELSE (
    echo Skipping database deletion and migration.
)

echo.
echo --- Select Account Holder ---
CHOICE /C JS /M "Who do these transactions belong to? (J for Joe, S for Sharon)"
IF %ERRORLEVEL%==1 (
    set ACCOUNT_HOLDER_ID=2
    set ACCOUNT_HOLDER_NAME=Joe
)
IF %ERRORLEVEL%==2 (
    set ACCOUNT_HOLDER_ID=3
    set ACCOUNT_HOLDER_NAME=Sharon
)

echo.
echo Injecting data for %ACCOUNT_HOLDER_NAME% from %CSV_FILE%...
REM The Node script is now in the tools directory, pass the CSV file as an argument
node ./tools/inject-data.js %ACCOUNT_HOLDER_ID% %ACCOUNT_HOLDER_NAME% %CSV_FILE%

echo.
echo Data injection complete.
pause