@echo off
echo ===================================
echo  Creating Backend Refactor Structure
echo ===================================
echo.

:: Create Directories
echo --- Creating directories... ---
IF NOT EXIST "routes" (mkdir "routes" && echo Created: routes\)
IF NOT EXIST "services" (mkdir "services" && echo Created: services\)
echo Directories are ready.
echo.

:: Create Empty Route & Service Files
echo --- Creating empty .js files... ---

IF NOT EXIST "routes\transactions.js" (type nul > "routes\transactions.js" && echo Created: routes\transactions.js)
IF NOT EXIST "routes\accounts.js" (type nul > "routes\accounts.js" && echo Created: routes\accounts.js)
IF NOT EXIST "routes\reporting.js" (type nul > "routes\reporting.js" && echo Created: routes\reporting.js)
IF NOT EXIST "routes\orders.js" (type nul > "routes\orders.js" && echo Created: routes\orders.js)
IF NOT EXIST "routes\utility.js" (type nul > "routes\utility.js" && echo Created: routes\utility.js)

IF NOT EXIST "services\cronJobs.js" (type nul > "services\cronJobs.js" && echo Created: services\cronJobs.js)

echo.
echo ===================================
echo  File structure is ready for refactoring.
echo ===================================
echo.
pause