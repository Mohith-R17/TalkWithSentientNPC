@echo off
echo Stopping Skyrim NPC servers...

:: Close the specific command windows created by run_app.bat
echo Terminating Backend Window...
taskkill /FI "WINDOWTITLE eq Skyrim NPC Backend*" /T /F >nul 2>&1

echo Terminating Frontend Window...
taskkill /FI "WINDOWTITLE eq Skyrim NPC Frontend*" /T /F >nul 2>&1

echo Releasing ports 8000 and 5173...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000, 5173 -EA 0 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -EA 0 }; exit 0" >nul 2>&1

echo Done.
