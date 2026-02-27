@echo off
REM Ragnarok LATAM Build Consultant - Development Start Script
REM This script starts PostgreSQL and then the Next.js dev server

set PGBIN=C:\Users\User\AppData\Local\PostgreSQL\pgsql\bin
set PGDATA=C:\Users\User\AppData\Local\PostgreSQL\data
set PGLOG=C:\Users\User\AppData\Local\PostgreSQL\pg.log
set PROJECT_DIR=C:\Users\User\Desktop\LATAM

echo ============================================
echo  Ragnarok LATAM Build Consultant
echo ============================================
echo.

REM Check if PostgreSQL is running
"%PGBIN%\pg_ctl.exe" status -D "%PGDATA%" >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting PostgreSQL...
    "%PGBIN%\pg_ctl.exe" -D "%PGDATA%" -l "%PGLOG%" -o "-p 5432" start
    if %errorlevel% neq 0 (
        echo ERROR: Failed to start PostgreSQL. Check:
        echo   %PGLOG%
        pause
        exit /b 1
    )
    echo PostgreSQL started.
    timeout /t 2 /nobreak >nul
) else (
    echo PostgreSQL already running.
)

echo.
echo Starting Next.js development server...
echo Access the app at: http://localhost:3000
echo.

cd /d "%PROJECT_DIR%"
npm run dev
