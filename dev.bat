@echo off
echo Starting in DEV MODE (hot reload)...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.

start "Backend - Flask" cmd /k "cd backend && pip install flask flask-cors flask-jwt-extended bcrypt python-dotenv librosa scikit-learn numpy scipy soundfile -q && python app.py"

timeout /t 3 /nobreak >nul

start "Frontend - Vite" cmd /k "cd frontend && npm install -q && npm run dev"

echo.
echo Both servers started in separate windows.
echo Open http://localhost:3000 in your browser for development.
pause
