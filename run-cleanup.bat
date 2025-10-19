@echo off
REM ====================================================================
REM SIMPLE DATABASE CLEANUP - ONE COMMAND
REM ====================================================================
REM This will clean up duplicate participant records from your database
REM Make sure to update the connection string below with your details
REM ====================================================================

echo.
echo =====================================================================
echo   DUPLICATE PARTICIPANTS CLEANUP
echo =====================================================================
echo.

REM --- CONFIGURE YOUR DATABASE CONNECTION HERE ---
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=your_database_name
set DB_USER=postgres

REM Prompt for password
set /p DB_PASSWORD="Enter database password: "

echo.
echo Connecting to: %DB_HOST%:%DB_PORT%/%DB_NAME% as %DB_USER%
echo.

REM Set password environment variable
set PGPASSWORD=%DB_PASSWORD%

REM Execute the cleanup SQL script
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f cleanup-duplicate-participants.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Cleanup completed successfully!
    echo.
    echo Next steps:
    echo   1. Restart your NestJS application
    echo   2. Test seat movements in your app
    echo.
) else (
    echo.
    echo ✗ Cleanup failed! Check error messages above.
    echo.
)

REM Clear password
set PGPASSWORD=

pause
