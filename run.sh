#!/bin/bash
echo "============================================================"
echo "  Interview Preparation Trainer - PSIT Kanpur"
echo "  AKTU B.Tech Final Year Project 2026"
echo "============================================================"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: python3 not found. Install Python 3.10+"
    exit 1
fi

# Check Node
if ! command -v node &> /dev/null; then
    echo "ERROR: node not found. Install Node.js from nodejs.org"
    exit 1
fi

echo "[1/4] Installing Python dependencies..."
cd backend
pip3 install flask flask-cors flask-jwt-extended bcrypt python-dotenv \
    librosa scikit-learn numpy scipy soundfile pydub --break-system-packages -q 2>/dev/null || \
pip3 install flask flask-cors flask-jwt-extended bcrypt python-dotenv \
    librosa scikit-learn numpy scipy soundfile pydub -q

echo "[2/4] Installing Node.js dependencies..."
cd ../frontend
npm install -q

echo "[3/4] Building React frontend..."
npm run build

echo "[4/4] Starting server..."
cd ../backend

echo ""
echo "✓ Setup complete!"
echo "✓ Open your browser: http://localhost:5000"
echo "  (Press Ctrl+C to stop)"
echo ""
python3 app.py
