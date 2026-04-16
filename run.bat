@echo off
echo ============================================================
echo   Interview Preparation Trainer - PSIT Kanpur
echo   AKTU B.Tech Final Year Project 2026
echo ============================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install Python 3.10+ from python.org
    pause
    exit /b 1
)

REM Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Install from nodejs.org
    pause
    exit /b 1
)

echo [1/4] Installing Python dependencies...
cd backend
pip install flask flask-cors flask-jwt-extended bcrypt python-dotenv librosa scikit-learn numpy scipy soundfile pydub -q
if errorlevel 1 (
    echo ERROR: Failed to install Python packages.
    pause
    exit /b 1
)

echo [2/4] Installing Node.js dependencies...
cd ..\frontend
call npm install -q
if errorlevel 1 (
    echo ERROR: Failed to install Node packages.
    pause
    exit /b 1
)

echo [3/4] Building React frontend...
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed.
    pause
    exit /b 1
)

echo [4/4] Starting backend server...
cd ..\backend
echo.
echo ✓ Setup complete!
echo ✓ Open your browser: http://localhost:5000
echo   (Press Ctrl+C to stop the server)
echo.
python app.py

pause
