@echo off
title ImmigrationFlow Pro — Launching...
color 0A

echo.
echo  ============================================================
echo   ___ __  __ __  __ ___ ___ ___    _  _____  ___ ___  _  _
echo  ^|_ _^|  \/  ^|  \/  ^|_ _/ __^| _ \  /_\^|_   _^|^|_ _/ _ \^| \^| ^|
echo   ^| ^| ^| ^|^| ^| ^|^| ^| ^| \__ ^| ^|   / / _ \ ^| ^|   ^| ^| (_) ^| .` ^|
echo  ^|___^|_^|  ^|_^|_^|  ^|_^|___^|_^|_^\ /_/ \_^|^|_^|  ^|___\___/^|_^|\_^|
echo.
echo              Immigration Case Management System
echo  ============================================================
echo.

:: Change to the script's own directory
cd /d "%~dp0"

:: ── 1. Check Node.js ─────────────────────────────────────────
echo  [1/4] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js is not installed.
    echo  Download from https://nodejs.org and try again.
    pause
    exit /b 1
)
echo  [OK] Node.js found.

:: ── 2. Install dependencies ──────────────────────────────────
echo.
echo  [2/4] Installing / verifying dependencies...
call npm install --silent
if %errorlevel% neq 0 (
    echo  [ERROR] npm install failed.
    pause
    exit /b 1
)
echo  [OK] Dependencies ready.

:: ── 3. Build production bundle ───────────────────────────────
echo.
echo  [3/4] Building production app (PWA + Service Worker)...
call npm run build
if %errorlevel% neq 0 (
    echo  [ERROR] Build failed. See errors above.
    pause
    exit /b 1
)
echo  [OK] Build complete.

:: ── 4. Free port 5174 and serve ──────────────────────────────
echo.
echo  [4/4] Starting production server on port 5174...
echo.
echo  ============================================================
echo   App is running at: http://localhost:5174
echo.
echo   HOW TO INSTALL AS DESKTOP APP:
echo   1. Open http://localhost:5174 in Chrome or Edge
echo   2. Click the Install icon (^+) in the address bar
echo   3. Click "Install ImmigrationFlow Pro"
echo   4. It opens as a standalone desktop app!
echo.
echo   Keep this window open while using the app.
echo   Press Ctrl+C to stop the server.
echo  ============================================================
echo.

:: Serve the production build (has full service worker / PWA support)
call npm run preview -- --port 5174 --host

echo.
echo  Server stopped. Press any key to close.
pause >nul
