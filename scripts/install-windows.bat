@echo off
setlocal enabledelayedexpansion

:: =============================================================
::  install-windows.bat
::  Setup script for: import-xlsx-tranout (Local Desktop)
::
::  How to run:
::    Double-click this file
::    or run in CMD: install-windows.bat
:: =============================================================

set REPO_URL=https://github.com/nateesoft/import-xlsx-tranout.git
set APP_DIR=C:\Apps\import-xlsx-tranout
set APP_NAME=import-xlsx

echo.
echo =============================================
echo   import-xlsx-tranout  Setup
echo =============================================
echo.

:: -------------------------------------------
:: Check Node.js
:: -------------------------------------------
echo [1/5] Checking Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo         Download from: https://nodejs.org  (v20 LTS^)
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo       Node.js %%v found

:: -------------------------------------------
:: Check Git
:: -------------------------------------------
echo.
echo [2/5] Checking Git...
git --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git is not installed.
    echo         Download from: https://git-scm.com
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('git --version') do echo       %%v found

:: -------------------------------------------
:: Install PM2
:: -------------------------------------------
echo.
echo [3/5] Installing PM2 globally...
call npm install -g pm2
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install PM2
    pause
    exit /b 1
)
echo       PM2 installed.

:: -------------------------------------------
:: Clone or update project
:: -------------------------------------------
echo.
echo [4/5] Cloning project from GitHub...
if exist "%APP_DIR%" (
    echo       Directory exists, pulling latest changes...
    cd /d "%APP_DIR%"
    git pull
) else (
    git clone %REPO_URL% "%APP_DIR%"
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Git clone failed. Check internet connection.
        pause
        exit /b 1
    )
)
echo       Project ready at %APP_DIR%

:: -------------------------------------------
:: Create .env.production.local
:: -------------------------------------------
if not exist "%APP_DIR%\.env.production.local" (
    echo.
    echo       Set login credentials (press Enter to use defaults^):
    set /p LOGIN_USER="       LOGIN_USERNAME [admin]: "
    set /p LOGIN_PASS="       LOGIN_PASSWORD [1234]: "

    if "!LOGIN_USER!"=="" set LOGIN_USER=admin
    if "!LOGIN_PASS!"=="" set LOGIN_PASS=1234

    (
        echo LOGIN_USERNAME=!LOGIN_USER!
        echo LOGIN_PASSWORD=!LOGIN_PASS!
        echo PORT=3000
    ) > "%APP_DIR%\.env.production.local"
    echo       .env.production.local created.
) else (
    echo       .env.production.local already exists, skipping.
)

:: -------------------------------------------
:: Install dependencies & build
:: -------------------------------------------
echo.
echo [5/5] Installing dependencies and building...
cd /d "%APP_DIR%"

call npm ci
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm ci failed
    pause
    exit /b 1
)

call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm run build failed
    pause
    exit /b 1
)
echo       Build complete.

:: -------------------------------------------
:: Start with PM2
:: -------------------------------------------
echo.
echo Starting app with PM2...
call pm2 delete %APP_NAME% 2>nul
call pm2 start node --name "%APP_NAME%" -- node_modules/next/dist/bin/next start
call pm2 save

:: -------------------------------------------
:: Register PM2 on Windows startup via Task Scheduler
:: -------------------------------------------
echo Registering PM2 in Windows startup...
for /f "tokens=*" %%p in ('where pm2.cmd 2^>nul') do set PM2_PATH=%%p
if "%PM2_PATH%"=="" (
    for /f "tokens=*" %%p in ('where pm2 2^>nul') do set PM2_PATH=%%p
)
schtasks /delete /tn "PM2-startup" /f >nul 2>&1
schtasks /create /tn "PM2-startup" /tr "\"%PM2_PATH%\" resurrect" /sc onlogon /rl highest /f
if %ERRORLEVEL% neq 0 (
    echo [WARN] Could not register startup task. Run this script as Administrator to enable auto-start.
) else (
    echo       PM2 registered in Windows startup (Task Scheduler^).
)

:: -------------------------------------------
:: Done
:: -------------------------------------------
echo.
echo =============================================
echo   Installation complete!
echo   Open browser: http://localhost:3000
echo =============================================
echo.
echo Useful commands:
echo   pm2 status              - check app status
echo   pm2 logs %APP_NAME%     - view logs
echo   pm2 restart %APP_NAME%  - restart app
echo   pm2 stop %APP_NAME%     - stop app
echo.
pause
