@echo off
setlocal enabledelayedexpansion

REM =================================================================
REM  Automated Deployment Script for Portfolio Tracker V3 (XCOPY Version)
REM =================================================================
REM This script automates the testing, backup, and deployment process.
REM It must be "Run as administrator".

echo Script has started. Running as Administrator is required.
echo.

REM --- Configuration ---
set "SOURCE_DIR=%~dp0"
set "PROD_DIR=C:\portfolio_managerV3"
set "BACKUP_DIR=C:\portfolio_manager_bu\v3\prod"
set "SERVICE_NAME=PortfolioManagerV3"

REM --- Get Date and Time for Backup Filename ---
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
set "DATE_STAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%"
set "TIME_STAMP=%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%"
set "BACKUP_FILE=%BACKUP_DIR%\%DATE_STAMP%_%TIME_STAMP%_production.db"

echo [STEP 1/8] Stopping the production service (if it's running)...
net stop "%SERVICE_NAME%" > nul 2>&1

echo.
echo [STEP 2/8] Waiting for service to shut down completely (10 seconds)...
timeout /t 10 /nobreak > nul

echo.
echo [STEP 3/8] Backing up the production database (if it exists)...
if exist "%PROD_DIR%\production.db" (
    echo Backing up existing database to %BACKUP_FILE%...
    echo F | xcopy /Y "%PROD_DIR%\production.db" "%BACKUP_FILE%"
    call :check_error
) else (
    echo Production database not found, skipping backup.
)

echo.
echo [STEP 4/8] Running automated tests...
call npm test
call :check_error

echo.
echo [STEP 5/8] Creating production directory (if it doesn't exist)...
if not exist "%PROD_DIR%" mkdir "%PROD_DIR%"
call :check_error

echo.
echo [STEP 6/8] Deploying new application files...
echo Copying public files...
xcopy /E /I /Y "%SOURCE_DIR%public" "%PROD_DIR%\public" > nul
call :check_error
echo Copying routes...
xcopy /E /I /Y "%SOURCE_DIR%routes" "%PROD_DIR%\routes" > nul
call :check_error
echo Copying services...
xcopy /E /I /Y "%SOURCE_DIR%services" "%PROD_DIR%\services" > nul
call :check_error
echo Copying migrations...
xcopy /E /I /Y "%SOURCE_DIR%migrations" "%PROD_DIR%\migrations" > nul
call :check_error
echo Copying server files...
xcopy /Y "%SOURCE_DIR%*.js" "%PROD_DIR%\" > nul
xcopy /Y "%SOURCE_DIR%*.json" "%PROD_DIR%\" > nul
call :check_error

echo.
echo [STEP 7/8] Installing production dependencies and configuring service...
cd /d "%PROD_DIR%"
call npm install --omit=dev
call :check_error

echo Configuring NSSM service environment...
nssm set "%SERVICE_NAME%" AppDirectory "%PROD_DIR%"
nssm set "%SERVICE_NAME%" AppEnvironmentExtra "NODE_ENV=production DATABASE_PATH=./production.db"
call :check_error

echo.
echo [STEP 8/8] Starting the production service...
net start "%SERVICE_NAME%"
call :check_error

echo.
echo =================================================================
echo  SUCCESS! Deployment completed successfully.
echo =================================================================
echo.
pause
goto :eof

:check_error
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo =================================================================
    echo  ERROR! A command failed with error code: %ERRORLEVEL%.
    echo  Deployment halted.
    echo =================================================================
    echo.
    pause
    exit /b %ERRORLEVEL%
)
goto :eof