@echo off
REM Ragnarok LATAM - Stop PostgreSQL (portable install)

set PGBIN=C:\Users\User\AppData\Local\PostgreSQL\pgsql\bin
set PGDATA=C:\Users\User\AppData\Local\PostgreSQL\data

echo Stopping PostgreSQL...
"%PGBIN%\pg_ctl.exe" -D "%PGDATA%" stop

if %errorlevel% == 0 (
    echo PostgreSQL stopped successfully.
) else (
    echo PostgreSQL may not have been running.
)
pause
