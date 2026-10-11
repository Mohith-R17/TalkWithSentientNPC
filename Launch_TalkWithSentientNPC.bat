@echo off
setlocal EnableDelayedExpansion
title TalkWithSentientNPC Launcher

echo =====================================================================
echo                    TALK WITH SENTIENT NPC
echo           Offline AI Voice-Interactive Dialogue System
echo =====================================================================
echo.

:: -------------------------------------------------------------
:: 1. Resolve Project Root Directory
:: -------------------------------------------------------------
:: Check if running from within the project directory
if exist "%~dp0backend\main.py" (
    set "PROJECT_ROOT=%~dp0"
    goto FOUND_PROJECT
)

:: Check known project folder if launched from Desktop or elsewhere
if exist "C:\Users\R Mohith\Mohith\PROJECTS\TalkWithSentientNPC-main\backend\main.py" (
    set "PROJECT_ROOT=C:\Users\R Mohith\Mohith\PROJECTS\TalkWithSentientNPC-main\"
    goto FOUND_PROJECT
)

:: Error fallback if project path was moved
echo [ERROR] Could not find the project directory!
echo Checked locations:
echo   1. %~dp0
echo   2. C:\Users\R Mohith\Mohith\PROJECTS\TalkWithSentientNPC-main\
echo.
echo Please verify the project path and try again.
pause
exit /b 1

:FOUND_PROJECT
cd /d "%PROJECT_ROOT%"
echo [>] Project Directory: %PROJECT_ROOT%

:: -------------------------------------------------------------
:: 2. Locate Python Environment
:: -------------------------------------------------------------
set "PYTHON_EXE="
if exist "%PROJECT_ROOT%venv\Scripts\python.exe" (
    set "PYTHON_EXE=%PROJECT_ROOT%venv\Scripts\python.exe"
) else if exist "%PROJECT_ROOT%.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%PROJECT_ROOT%.venv\Scripts\python.exe"
) else (
    where python >nul 2>&1
    if not errorlevel 1 set "PYTHON_EXE=python"
)

if "%PYTHON_EXE%"=="" (
    echo [ERROR] Python not found in venv or system PATH!
    pause
    exit /b 1
)

:: -------------------------------------------------------------
:: 3. Start Backend (FastAPI + AI Pipeline)
:: -------------------------------------------------------------
echo.
echo [1/3] Checking Backend status (port 8000)...
curl -s -f -m 2 http://127.0.0.1:8000/api/health >nul 2>&1
if not errorlevel 1 (
    echo       Backend is already running and healthy.
    goto CHECK_FRONTEND
)

echo       Starting new Backend instance (FastAPI, Vosk, Silero, Transformer)...
taskkill /FI "WINDOWTITLE eq Skyrim NPC Backend*" /T /F >nul 2>&1

start "Skyrim NPC Backend" cmd /k "title Skyrim NPC Backend && cd /d "%PROJECT_ROOT%backend" && "%PYTHON_EXE%" -m uvicorn main:app --host 127.0.0.1 --port 8000"

echo       Waiting for backend models to load...
set /a B_ATTEMPTS=0
:WAIT_BACKEND
ping 127.0.0.1 -n 3 >nul
set /a B_ATTEMPTS+=1
curl -s -f -m 2 http://127.0.0.1:8000/api/health >nul 2>&1
if not errorlevel 1 (
    echo       [OK] Backend is online!
    goto CHECK_FRONTEND
)
if !B_ATTEMPTS! geq 25 (
    echo       [!] Backend is taking longer to load models. Proceeding to frontend...
    goto CHECK_FRONTEND
)
echo       Loading AI models... (!B_ATTEMPTS!/25)
goto WAIT_BACKEND

:: -------------------------------------------------------------
:: 4. Start Frontend (React + Vite)
:: -------------------------------------------------------------
:CHECK_FRONTEND
echo.
echo [2/3] Checking Frontend status (port 5173)...
curl -s -f -m 2 http://localhost:5173/ >nul 2>&1
if not errorlevel 1 (
    echo       Frontend is already running.
    goto OPEN_BROWSER
)

if not exist "%PROJECT_ROOT%frontend\node_modules" (
    echo       Frontend dependencies missing. Running npm install...
    cd /d "%PROJECT_ROOT%frontend"
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

echo       Starting Frontend server...
taskkill /FI "WINDOWTITLE eq Skyrim NPC Frontend*" /T /F >nul 2>&1

start "Skyrim NPC Frontend" cmd /k "title Skyrim NPC Frontend && cd /d "%PROJECT_ROOT%frontend" && npm run dev"

echo       Waiting for frontend dev server...
set /a F_ATTEMPTS=0
:WAIT_FRONTEND
ping 127.0.0.1 -n 3 >nul
set /a F_ATTEMPTS+=1
curl -s -f -m 2 http://localhost:5173/ >nul 2>&1
if not errorlevel 1 (
    echo       [OK] Frontend is online!
    goto OPEN_BROWSER
)
if !F_ATTEMPTS! geq 15 (
    echo       [!] Frontend still initializing. Opening browser...
    goto OPEN_BROWSER
)
echo       Waiting for frontend server... (!F_ATTEMPTS!/15)
goto WAIT_FRONTEND

:: -------------------------------------------------------------
:: 5. Open Browser & Control Console
:: -------------------------------------------------------------
:OPEN_BROWSER
echo.
echo [3/3] Opening application in default browser...
start http://localhost:5173/

:MENU_LOOP
cls
echo =====================================================================
echo                    TALK WITH SENTIENT NPC
echo           Offline AI Voice-Interactive Dialogue System
echo =====================================================================
echo.
echo   Application Status:
echo     - Web Interface : http://localhost:5173/
echo     - Backend API   : http://127.0.0.1:8000/api/health
echo     - Project Root  : %PROJECT_ROOT%
echo.
echo =====================================================================
echo   Quick Controls:
echo     [1] Re-open Web Interface in Browser
echo     [2] Stop All Servers and Exit
echo     [3] Restart All Servers
echo     [4] Close this launcher (leave servers running in background)
echo =====================================================================
echo.
set /p "CHOICE=Select an option [1-4] (press Enter to leave running): "

if "%CHOICE%"=="1" (
    start http://localhost:5173/
    goto MENU_LOOP
)
if "%CHOICE%"=="2" (
    goto STOP_SERVERS
)
if "%CHOICE%"=="3" (
    goto RESTART_SERVERS
)
if "%CHOICE%"=="4" (
    echo.
    echo Servers remain active in the background. Goodbye!
    ping 127.0.0.1 -n 3 >nul
    exit /b 0
)
if "%CHOICE%"=="" (
    exit /b 0
)

echo Invalid selection.
ping 127.0.0.1 -n 2 >nul
goto MENU_LOOP

:STOP_SERVERS
echo.
echo Stopping Sentient NPC servers...
taskkill /FI "WINDOWTITLE eq Skyrim NPC Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Skyrim NPC Frontend*" /T /F >nul 2>&1
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000, 5173 -EA 0 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -EA 0 }; exit 0" >nul 2>&1
echo [OK] All servers have been stopped.
ping 127.0.0.1 -n 3 >nul
exit /b 0

:RESTART_SERVERS
echo.
echo Restarting servers...
taskkill /FI "WINDOWTITLE eq Skyrim NPC Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Skyrim NPC Frontend*" /T /F >nul 2>&1
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000, 5173 -EA 0 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -EA 0 }; exit 0" >nul 2>&1
ping 127.0.0.1 -n 3 >nul
goto FOUND_PROJECT
