@echo off
setlocal
title Stop Sentient NPC Servers

echo =====================================================================
echo                    TALK WITH SENTIENT NPC
echo                    Stopping Application
echo =====================================================================
echo.

echo [1/2] Closing server windows...
taskkill /FI "WINDOWTITLE eq Skyrim NPC Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Skyrim NPC Frontend*" /T /F >nul 2>&1

echo [2/2] Releasing ports 8000 and 5173...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000, 5173 -EA 0 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -EA 0 }; exit 0" >nul 2>&1

echo.
echo =====================================================================
echo  [OK] All backend and frontend servers have been stopped!
echo =====================================================================
ping 127.0.0.1 -n 3 >nul
