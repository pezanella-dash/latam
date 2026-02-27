@echo off
REM Ragnarok LATAM - Start PostgreSQL (portable install)
REM Run this script to start the database before using the application

set PGBIN=C:\Users\User\AppData\Local\PostgreSQL\pgsql\bin
set PGDATA=C:\Users\User\AppData\Local\PostgreSQL\data
set PGLOG=C:\Users\User\AppData\Local\PostgreSQL\pg.log

echo Checking PostgreSQL status...
"%PGBIN%\pg_ctl.exe" status -D "%PGDATA%"

if %errorlevel% == 0 (
    echo PostgreSQL is already running.
) else (
    echo Starting PostgreSQL...
    "%PGBIN%\pg_ctl.exe" -D "%PGDATA%" -l "%PGLOG%" -o "-p 5432" start
    if %errorlevel% == 0 (
        echo PostgreSQL started successfully on port 5432
    ) else (
        echo Failed to start PostgreSQL. Check %PGLOG% for details.
        pause
        exit /b 1
    )
)

echo.
echo Database URL: postgresql://postgres:password@localhost:5432/ro_latam
echo.
pause
