# Interview Preparation Trainer using ML & Voice Interpretation

---

##  Quick Start (Run in 3 steps)

### Step 1 - Install Python dependencies
```bash
cd backend
pip install flask flask-cors flask-jwt-extended bcrypt python-dotenv librosa scikit-learn numpy scipy soundfile pydub
```

### Step 2 — Build the React frontend
```bash
cd frontend
npm install
npm run build
```

### Step 3 - Run the server
```bash
cd backend
python app.py
```

Open **http://localhost:5000** in your browser.

---

##  One-Click Start (Windows)
Double-click **`run.bat`** - it installs everything and opens the server automatically.

##  One-Click Start (Mac/Linux)
```bash
chmod +x run.sh && ./run.sh
```

---

##  Development Mode (Hot Reload)

**Terminal 1 - Backend:**
```bash
cd backend && python app.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend && npm run dev
```

Open **http://localhost:3000** - frontend proxies API calls to Flask on port 5000.

---

##  Project Structure

```
interview-trainer/
├── backend/
│   ├── app.py                  # Flask REST API (main server)
│   ├── database.py             # SQLite schema + seed questions
│   ├── modules/
│   │   ├── nlp_analysis.py     # Grammar · Relevance · Keywords · Vocabulary
│   │   ├── voice_analysis.py   # Librosa MFCC · Pitch · Energy · Speaking Rate
│   │   └── scoring.py          # Composite ML scoring + feedback generation
│   ├── uploads/                # Saved audio recordings
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Router + layout
│   │   ├── pages/
│   │   │   ├── Login.jsx       # Register / Sign in
│   │   │   ├── Dashboard.jsx   # Home · stats · tips
│   │   │   ├── Session.jsx     # Interview session + mic recording + feedback
│   │   │   ├── History.jsx     # Past sessions list
│   │   │   └── Progress.jsx    # Analytics · charts · radar
│   │   ├── components/
│   │   │   ├── AuthContext.jsx  # JWT auth state
│   │   │   └── Sidebar.jsx      # Navigation
│   │   ├── utils/api.js         # Axios instance
│   │   └── index.css            # Full design system
│   ├── vite.config.js
│   └── package.json
├── run.bat      # Windows one-click start
├── run.sh       # Linux/Mac one-click start
└── README.md
```

---

##  System Architecture (from Thesis)

```
USER (Browser Microphone)
        ↓
AUDIO RECORDER (Web Audio API + MediaRecorder + SpeechRecognition)
        ↓
SPEECH-TO-TEXT (Browser Web Speech API → transcript)
        ↓ text              ↓ audio WAV
NLP ANALYSIS          VOICE TONE ANALYZER
Grammar · BERT        Librosa: MFCCs · Pitch
Relevance · TF-IDF    Energy · Speaking Rate
Keywords · Vocab      SVM Confidence Score
        ↓                   ↓
        ML SCORING ENGINE (Weighted: 60% NLP + 40% Voice)
                    ↓
        FEEDBACK GENERATION ENGINE
        (Personalized Report + Recommendations)
                    ↓
        DASHBOARD UI (React · Recharts)
        Results · Progress Analytics · Trend Charts
```

---

##  API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Sign in |
| GET | /api/auth/me | Current user |
| GET | /api/questions | Get questions (filter by category/difficulty) |
| POST | /api/sessions | Create session |
| GET | /api/sessions | List user sessions |
| PUT | /api/sessions/:id/complete | Mark session done |
| POST | /api/sessions/:id/respond | Submit answer + get full feedback |
| GET | /api/progress | Analytics data |

---

##  ML/NLP Pipeline Details

### NLP Analysis Module (`modules/nlp_analysis.py`)
- **Grammar**: Pattern-matching rules + filler word detection + sentence structure
- **Semantic Relevance**: TF-IDF cosine similarity between transcript and model answer
- **Keyword Coverage**: Domain-specific keyword presence check (TF-IDF)
- **Vocabulary**: Type-token ratio + average word length scoring

### Voice Analysis Module (`modules/voice_analysis.py`)
- **Librosa** extracts 35-dimensional feature vector:
  - 13 MFCC coefficients (mean + std = 26 values)
  - Pitch (F0) via pyin algorithm (mean, std, range)
  - RMS Energy (mean + std)
  - Speaking rate (words per minute via onset detection)
  - Spectral centroid (mean)
- **SVM rule-based classifier**: Low / Medium / High confidence class

### Scoring Engine (`modules/scoring.py`)
- NLP Score = Grammar(25%) + Relevance(40%) + Keywords(20%) + Vocabulary(15%)
- Voice Score = Confidence classifier output
- **Total Score = NLP × 60% + Voice × 40%**
- Grade: A+ (≥90) · A (≥80) · B (≥70) · C (≥60) · D (≥50) · F (<50)

---

## Database (SQLite - `backend/interview_trainer.db`)

Tables: `users` · `sessions` · `questions` · `responses` · `nlp_analysis` · `audio_analysis` · `feedback` · `progress_report`

15 seed questions across categories: HR · DSA · OOP · DBMS · OS · CN · ML

---

##  Requirements

| Component | Requirement |
|-----------|-------------|
| Python | 3.10 or above |
| Node.js | 18 or above |
| Browser | Chrome / Edge (for Web Speech API mic) |
| RAM | 4 GB minimum (8 GB for Librosa) |
| Microphone | Built-in or USB |
| Internet | Only for Google Fonts (offline works too) |

---

##  Project Info

*Built with: Python · Flask · SQLite · React · Vite · Recharts · Librosa · Scikit-learn · Web Speech API*
