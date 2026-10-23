@echo off
chcp 65001 >nul
title Cooperative Gig Services Platform - Dev Server Runner
color 0A

echo =====================================================================
echo       Cooperative Gig Services Platform - Full Stack Launcher
echo =====================================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

echo [1/3] Checking environment and dependencies...

:: Verify backend python venv
if not exist "backend\venv\Scripts\uvicorn.exe" (
    echo [ERROR] Backend virtual environment not found at backend\venv\Scripts\uvicorn.exe
    echo Please make sure the backend virtual environment is created and configured.
    pause
    exit /b 1
)

:: Verify frontend node_modules
if not exist "frontend\node_modules" (
    echo [INFO] frontend\node_modules not found. Running npm install...
    cd /d "%ROOT_DIR%frontend"
    call npm install
    cd /d "%ROOT_DIR%"
)

echo [2/4] Checking and migrating database schema if needed...
cd /d "%ROOT_DIR%backend"
call venv\Scripts\activate.bat
python -c "import sys; sys.path.insert(0,'.');import sqlite3; conn=sqlite3.connect('coop_gig.db') if __import__('os').path.exists('coop_gig.db') else None; cols=[r[1] for r in conn.cursor().execute('PRAGMA table_info(workers)').fetchall()] if conn else []; missing='profile_photo' not in cols; conn.close() if conn else None; sys.exit(0 if not missing else 1)" 2>nul
if errorlevel 1 (
    echo    [!] Schema outdated - running DB migration + re-seed...
    python -m app.seed.seed_data
    echo    [+] DB migration complete.
) else (
    echo    [+] DB schema is up to date.
)
cd /d "%ROOT_DIR%"

echo [3/4] Starting Backend API Server (FastAPI on port 8000)...
start "Cooperative Platform - Backend (Port 8000)" cmd /k "cd /d "%ROOT_DIR%backend" && call "venv\Scripts\activate.bat" && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo [4/4] Starting Frontend Web Server (Vite on port 5173)...
start "Cooperative Platform - Frontend (Port 5173)" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"


echo.
echo =====================================================================
echo  Both servers are starting in dedicated console windows!
echo.
echo    - Frontend UI : http://localhost:5173
echo    - Backend API : http://localhost:8000
echo    - API Docs    : http://localhost:8000/docs
echo.
echo  Opening http://localhost:5173 in default browser...
echo =====================================================================
echo.

:: Wait 3 seconds and launch browser
timeout /t 3 /nobreak >nul
start http://localhost:5173

exit /b 0
