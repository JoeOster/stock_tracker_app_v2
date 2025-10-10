@echo off

:: Check for Administrator Privileges
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
IF '%errorlevel%' NEQ '0' (
    echo.
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo !!! ERROR: This script must be run as an Administrator. !!!
    echo !!! Please right-click the Command Prompt/PowerShell    !!!
    echo !!! and select 'Run as administrator'.                  !!!
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo.
    pause
    goto :EOF
)


echo ===================================
echo  Deploying Portfolio Tracker
echo ===================================

:: --- Configuration ---
SET DESTINATION="C:\portfolio_tracker"
SET SERVICE_NAME="PortfolioManagerV2"
SET PORT_TO_SET=

:: Argument Parsing for Port
IF /I "%1" == "--silent" (
    SET PORT_TO_SET=3000
    echo Silent mode detected. Port will be set to 3000.
) ELSE (
    SET ARG=%1
    IF /I "%ARG:~0,2%" == "p:" (
        SET PORT_TO_SET=%ARG:~2%
        echo Custom port detected. Port will be set to %PORT_TO_SET%.
    )
)

:: Stop the Live Service Before Starting
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


:: Automatic Database Backup
echo.
echo ===================================
echo  Backing up production database...
echo ===================================
IF EXIST %DESTINATION%\production.db (
    IF NOT EXIST %DESTINATION%\backup\ mkdir %DESTINATION%\backup
    SET TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%-%time:~0,2%%time:~3,2%
    copy %DESTINATION%\production.db %DESTINATION%\backup\production-backup-%TIMESTAMP%.db
    echo Backup created successfully.
) ELSE (
    echo No existing database found to back up.
)

:: Robocopy for file deployment
echo.
echo ===================================
echo  Copying application files...
echo ===================================
robocopy . %DESTINATION% /E /XD node_modules tests .git /XF package-lock.json *.db .gitignore .env *.log *.bat
echo. & echo File copy complete.

:: Cleanup old scripts from destination
IF EXIST %DESTINATION%\*.bat (
    echo.
    echo Cleaning up old batch files from destination...
    del /Q %DESTINATION%\*.bat
)

:: .env File Creation (if port was specified)
IF DEFINED PORT_TO_SET (
    echo. & echo Configuring .env file...
    SET /P FINNHUB_KEY="Please enter your Finnhub API Key and press Enter: "
    (
        echo PORT=%PORT_TO_SET%
        echo FINNHUB_API_KEY=%FINNHUB_KEY%
    ) > %DESTINATION%\.env
    echo .env file created successfully.
)

:: Automate npm install
echo.
echo ===================================
echo  Installing production packages...
echo ===================================
pushd %DESTINATION%
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