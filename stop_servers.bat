@echo off
chcp 65001 >nul
title Stopping Cooperative Platform Servers
color 0C

echo =====================================================================
echo       Stopping Cooperative Gig Services Platform Servers...
echo =====================================================================
echo.

echo Stopping processes on port 8000 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Stopping processes on port 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo All development servers stopped successfully.
timeout /t 2 /nobreak >nul
exit /b 0
