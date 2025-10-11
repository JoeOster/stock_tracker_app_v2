@echo off
echo ===================================
echo  Creating Event Listener Refactor Structure
echo ===================================
echo.

:: Create Directory
echo --- Creating directory... ---
IF NOT EXIST "public\event-handlers" (
    mkdir "public\event-handlers"
    echo Created: public\event-handlers\
) ELSE (
    echo Directory already exists.
)
echo.

:: Create Empty JS Files
echo --- Creating empty .js files... ---

IF NOT EXIST "public\event-handlers\_init.js" (
    type nul > "public\event-handlers\_init.js"
    echo Created: public\event-handlers\_init.js
)

IF NOT EXIST "public\event-handlers\_navigation.js" (
    type nul > "public\event-handlers\_navigation.js"
    echo Created: public\event-handlers\_navigation.js
)

IF NOT EXIST "public\event-handlers\_dailyReport.js" (
    type nul > "public\event-handlers\_dailyReport.js"
    echo Created: public\event-handlers\_dailyReport.js
)

IF NOT EXIST "public\event-handlers\_ledger.js" (
    type nul > "public\event-handlers\_ledger.js"
    echo Created: public\event-handlers\_ledger.js
)

IF NOT EXIST "public\event-handlers\_orders.js" (
    type nul > "public\event-handlers\_orders.js"
    echo Created: public\event-handlers\_orders.js
)

IF NOT EXIST "public\event-handlers\_snapshots.js" (
    type nul > "public\event-handlers\_snapshots.js"
    echo Created: public\event-handlers\_snapshots.js
)

IF NOT EXIST "public\event-handlers\_modals.js" (
    type nul > "public\event-handlers\_modals.js"
    echo Created: public\event-handlers\_modals.js
)

IF NOT EXIST "public\event-handlers\_settings.js" (
    type nul > "public\event-handlers\_settings.js"
    echo Created: public\event-handlers\_settings.js
)


echo.
echo ===================================
echo  File structure is ready for refactoring.
echo ===================================
echo.
pause