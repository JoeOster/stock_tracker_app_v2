@echo off
setlocal

:: Check for Administrator Privileges
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
IF '%errorlevel%' NEQ '0' (
    echo.
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo !!! ERROR: This script must be run as an Administrator. !!!
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo.
    pause
    goto :EOF
)

echo ===================================
echo  Deploying Portfolio Tracker
echo ===================================

:: --- Configuration ---
SET "DESTINATION=C:\portfolio_tracker"
SET "BACKUP_DESTINATION=C:\portfolio_manager_bu"
SET "SERVICE_NAME=PortfolioManagerV2"
SET "PORT_TO_SET=3000"
echo Port is set to 3000 for this deployment.

:: Stop the Live Service
echo.
echo ===================================
echo  Stopping the live service...
echo ===================================
nssm stop %SERVICE_NAME%
echo Service stopped.

:: Run Unit Tests Before Deploying
echo.
echo ===================================
echo  Running Unit Tests...
echo ===================================
npm test
IF %ERRORLEVEL% NEQ 0 (
    echo. & echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! & echo !!!     UNIT TESTS FAILED    !!! & echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! & echo.
    echo Deployment aborted. The live service has been left in a stopped state.
    goto :EOF
)
echo. & echo Unit tests passed successfully.

:: Automatic Database Backup to the new location
echo.
echo ===================================
echo  Backing up production database to %BACKUP_DESTINATION%...
echo ===================================
IF EXIST "%DESTINATION%\production.db" (
    IF NOT EXIST "%BACKUP_DESTINATION%\" mkdir "%BACKUP_DESTINATION%\"
    FOR /f "tokens=2 delims==" %%I in ('wmic os get LocalDateTime /value') do set "dt=%%I"
    SET "TIMESTAMP=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%_%dt:~8,2%%dt:~10,2%%dt:~12,2%"
    robocopy "%DESTINATION%" "%BACKUP_DESTINATION%\db-backup-%TIMESTAMP%" "production.db"
    echo Backup created successfully.
) ELSE (
    echo No existing database found to back up.
)

:: Robocopy for file deployment
echo.
echo ===================================
echo  Copying application files...
echo ===================================
robocopy . "%DESTINATION%" /E ^
    /XD node_modules ^
    /XD tests ^
    /XD .git ^
    /XF .gitignore ^
    /XF .env ^
    /XF *.log ^
    /XF *.bat ^
    /XF *.db
echo. & echo File copy complete.

:: .env File Creation
echo. & echo Configuring .env file...
SET /P FINNHUB_KEY="Please enter your Finnhub API Key and press Enter: "
echo PORT=%PORT_TO_SET% > "%DESTINATION%\.env"
echo FINNHUB_API_KEY=%FINNHUB_KEY% >> "%DESTINATION%\.env"
echo .env file created successfully.

:: Automate npm install
echo.
echo ===================================
echo  Installing production packages...
echo ===================================
pushd "%DESTINATION%"
npm install --production
popd

:: Automate Service Restart
echo.
echo ===================================
echo  Restarting the Windows Service...
echo ===================================
nssm restart %SERVICE_NAME%

echo.
echo ===================================
echo  Deployment complete!
echo ===================================
echo.
pause

:EOF