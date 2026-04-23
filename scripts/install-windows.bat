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
set APP_DIR=%~dp0import-xlsx-tranout
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
:: Install PM2 (check latest version first)
:: -------------------------------------------
echo.
echo [3/5] Checking PM2...

:: Get latest PM2 version from npm registry
for /f "tokens=*" %%v in ('npm show pm2 version 2^>nul') do set PM2_LATEST=%%v

:: Check if PM2 is already installed
pm2 --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('pm2 --version 2^>nul') do set PM2_CURRENT=%%v
    echo       PM2 current : v!PM2_CURRENT!
    echo       PM2 latest  : v%PM2_LATEST%
    if "!PM2_CURRENT!"=="%PM2_LATEST%" (
        echo       PM2 is already up to date. Skipping install.
    ) else (
        echo       Updating PM2 to latest version...
        call npm install -g pm2@latest
        if %ERRORLEVEL% neq 0 (
            echo [WARN] PM2 update failed, using existing version.
        ) else (
            echo       PM2 updated to v%PM2_LATEST%.
        )
    )
) else (
    echo       PM2 not found. Installing latest ^(v%PM2_LATEST%^)...
    call npm install -g pm2@latest
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install PM2
        pause
        exit /b 1
    )
    echo       PM2 v%PM2_LATEST% installed.
)

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
:: Create .env.production.local (use defaults, skip prompt)
:: -------------------------------------------
if not exist "%APP_DIR%\.env.production.local" (
    (
        echo LOGIN_USERNAME=admin
        echo LOGIN_PASSWORD=1234
        echo PORT=3000
    ) > "%APP_DIR%\.env.production.local"
    echo       .env.production.local created with default credentials.
    echo       [admin / 1234] - edit %APP_DIR%\.env.production.local to change.
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

if exist ".next" rmdir /s /q ".next"
call npx next build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] next build failed
    pause
    exit /b 1
)
xcopy /E /I /Y ".next\static" ".next\standalone\.next\static" >nul
xcopy /E /I /Y "public" ".next\standalone\public" >nul
echo       Build complete.

:: -------------------------------------------
:: Start with PM2
:: -------------------------------------------
echo.
echo Starting app with PM2...
call pm2 delete %APP_NAME% 2>nul
call pm2 start node --name "%APP_NAME%" -- .next/standalone/server.js
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
