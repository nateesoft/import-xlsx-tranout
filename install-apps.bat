@echo off
setlocal enabledelayedexpansion

echo [INFO] Starting installation of import-xlsx-tranout...

REM Remove old directory if exists
if exist "import-xlsx-tranout" (
    echo [INFO] Removing old directory...
    rd /s /q import-xlsx-tranout
)

REM Clone repository
echo [INFO] Cloning repository...
git clone https://github.com/nateesoft/import-xlsx-tranout.git
if errorlevel 1 (
    echo [ERROR] git clone failed
    exit /b 1
)

cd import-xlsx-tranout
set APPDIR=%CD%

REM Install dependencies
echo [INFO] Installing dependencies...
cmd /c "npm install --no-audit --no-fund --ignore-scripts"

REM Build the application
echo [INFO] Building application...
cmd /c "npx next build"
if errorlevel 1 (
    echo [ERROR] Build failed
    exit /b 1
)

REM Copy static assets into standalone output (required for Next.js standalone mode)
echo [INFO] Copying static assets to standalone...
xcopy /s /e /y .next\static .next\standalone\.next\static\ >nul 2>&1
if exist "public" xcopy /s /e /y public .next\standalone\public\ >nul 2>&1

REM Remove all files except ecosystem.config.cjs
echo [INFO] Cleaning up source files...
for /f "delims=" %%i in ('dir /b /a-d ^| findstr /v /i "ecosystem.config.cjs"') do del /f /q "%%i"

REM Remove all folders except .next
for /f "delims=" %%i in ('dir /b /ad ^| findstr /v /i "^\.next$"') do rd /s /q "%%i"

REM Start with pm2
echo [INFO] CWD: %CD%
cd /d "%APPDIR%"
echo [INFO] Starting application with pm2...
pm2 delete import-xlsx-tranout >nul 2>&1
pm2 start "%APPDIR%\ecosystem.config.cjs"

pm2 save

echo [INFO] Installation complete!
