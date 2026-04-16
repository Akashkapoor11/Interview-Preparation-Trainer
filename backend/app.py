"""
Interview Preparation Trainer - Flask Backend
Thesis: INTERVIEW PREPARATION TRAINER USING ML & VOICE INTERPRETATION
AKTU B.Tech Final Year Project - PSIT Kanpur
"""
import os
import json
import uuid
import base64
import datetime
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity
)
import bcrypt

from database import init_db, get_db
from modules.nlp_analysis import analyze_nlp
from modules.voice_analysis import analyze_voice
from modules.scoring import compute_composite_score, generate_feedback

app = Flask(__name__, static_folder='../frontend/dist', static_url_path='')
CORS(app)

app.config['JWT_SECRET_KEY'] = 'psit-interview-trainer-secret-2026'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(hours=24)
jwt = JWTManager(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize DB on startup
with app.app_context():
    init_db()


# ─── Serve React frontend ──────────────────────────────────────────────────────
@app.route('/')
@app.route('/dashboard')
@app.route('/session')
@app.route('/feedback')
@app.route('/progress')
def serve_frontend():
    dist = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')
    if os.path.exists(os.path.join(dist, 'index.html')):
        return send_from_directory(dist, 'index.html')
    return jsonify({"message": "Interview Trainer API is running. Frontend not built yet."}), 200


# ─── Auth Routes ───────────────────────────────────────────────────────────────
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not name or not email or not password:
        return jsonify({'error': 'All fields are required.'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    conn = get_db()
    try:
        conn.execute("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                     (name, email, password_hash))
        conn.commit()
        user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        token = create_access_token(identity=str(user['user_id']))
        return jsonify({'token': token, 'user': {'id': user['user_id'], 'name': name, 'email': email}}), 201
    except Exception as e:
        if 'UNIQUE' in str(e):
            return jsonify({'error': 'Email already registered.'}), 409
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    conn.close()

    if not user or not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
        return jsonify({'error': 'Invalid email or password.'}), 401

    token = create_access_token(identity=str(user['user_id']))
    return jsonify({'token': token, 'user': {'id': user['user_id'], 'name': user['name'], 'email': user['email']}})


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    conn = get_db()
    user = conn.execute("SELECT user_id, name, email, created_at FROM users WHERE user_id=?",
                        (user_id,)).fetchone()
    conn.close()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'id': user['user_id'], 'name': user['name'], 'email': user['email'],
                    'created_at': user['created_at']})


# ─── Questions ─────────────────────────────────────────────────────────────────
@app.route('/api/questions', methods=['GET'])
@jwt_required()
def get_questions():
    category = request.args.get('category', '')
    difficulty = request.args.get('difficulty', '')
    limit = int(request.args.get('limit', 5))

    conn = get_db()
    query = "SELECT q_id, category, difficulty, question_text, keywords FROM questions WHERE 1=1"
    params = []
    if category:
        query += " AND category=?"
        params.append(category)
    if difficulty:
        query += " AND difficulty=?"
        params.append(difficulty)
    query += " ORDER BY RANDOM() LIMIT ?"
    params.append(limit)

    questions = conn.execute(query, params).fetchall()
    conn.close()

    return jsonify([dict(q) for q in questions])


@app.route('/api/questions/categories', methods=['GET'])
@jwt_required()
def get_categories():
    conn = get_db()
    cats = conn.execute("SELECT DISTINCT category FROM questions ORDER BY category").fetchall()
    conn.close()
    return jsonify([c['category'] for c in cats])


# ─── Sessions ──────────────────────────────────────────────────────────────────
@app.route('/api/sessions', methods=['POST'])
@jwt_required()
def create_session():
    user_id = get_jwt_identity()
    conn = get_db()
    c = conn.execute("INSERT INTO sessions (user_id) VALUES (?)", (user_id,))
    conn.commit()
    session_id = c.lastrowid
    conn.close()
    return jsonify({'session_id': session_id}), 201


@app.route('/api/sessions', methods=['GET'])
@jwt_required()
def get_sessions():
    user_id = get_jwt_identity()
    conn = get_db()
    sessions = conn.execute(
        """SELECT s.session_id, s.start_time, s.end_time, s.total_score,
           COUNT(r.response_id) as response_count
           FROM sessions s
           LEFT JOIN responses r ON s.session_id=r.session_id
           WHERE s.user_id=?
           GROUP BY s.session_id
           ORDER BY s.start_time DESC LIMIT 20""",
        (user_id,)).fetchall()
    conn.close()
    return jsonify([dict(s) for s in sessions])


@app.route('/api/sessions/<int:session_id>/complete', methods=['PUT'])
@jwt_required()
def complete_session(session_id):
    user_id = get_jwt_identity()
    conn = get_db()
    # Compute avg score for session
    avg = conn.execute(
        "SELECT AVG(f.total_score) as avg FROM feedback f JOIN responses r ON f.response_id=r.response_id WHERE r.session_id=?",
        (session_id,)).fetchone()
    total = round(avg['avg'] or 0, 1)
    conn.execute(
        "UPDATE sessions SET end_time=CURRENT_TIMESTAMP, total_score=? WHERE session_id=? AND user_id=?",
        (total, session_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({'total_score': total, 'status': 'completed'})


# ─── Submit Response (Audio) ───────────────────────────────────────────────────
@app.route('/api/sessions/<int:session_id>/respond', methods=['POST'])
@jwt_required()
def submit_response(session_id):
    user_id = get_jwt_identity()
    data = request.get_json()

    q_id = data.get('q_id')
    transcript = data.get('transcript', '').strip()
    audio_b64 = data.get('audio_b64', '')

    if not q_id:
        return jsonify({'error': 'q_id required'}), 400
    if not transcript:
        return jsonify({'error': 'transcript required'}), 400

    conn = get_db()
    question = conn.execute("SELECT * FROM questions WHERE q_id=?", (q_id,)).fetchone()
    if not question:
        conn.close()
        return jsonify({'error': 'Question not found'}), 404

    # Save audio file if provided
    audio_path = ''
    if audio_b64:
        try:
            audio_bytes = base64.b64decode(audio_b64)
            fname = f"{uuid.uuid4().hex}.wav"
            audio_path = os.path.join(UPLOAD_FOLDER, fname)
            with open(audio_path, 'wb') as f:
                f.write(audio_bytes)
        except Exception as e:
            print(f"[Audio] Save error: {e}")

    # Store response
    c = conn.execute(
        "INSERT INTO responses (session_id, q_id, audio_path, transcript) VALUES (?, ?, ?, ?)",
        (session_id, q_id, audio_path, transcript))
    response_id = c.lastrowid

    # ─── NLP Analysis ──────────────────────────────────────────────────────────
    nlp = analyze_nlp(transcript, question['model_answer'], question['keywords'])

    conn.execute(
        """INSERT INTO nlp_analysis (response_id, grammar_score, relevance_score, keyword_score, vocabulary_score, error_list)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (response_id, nlp['grammar_score'], nlp['relevance_score'],
         nlp['keyword_score'], nlp['vocabulary_score'], json.dumps(nlp['errors'])))

    # ─── Voice Analysis ────────────────────────────────────────────────────────
    if audio_path and os.path.exists(audio_path):
        voice = analyze_voice(audio_path)
    else:
        # Estimate from transcript length
        words = len(transcript.split())
        duration = max(5, words / 2.2)  # ~2.2 words/sec
        base_conf = min(85, 45 + words * 0.4)
        voice = {
            'pitch_mean': 145.0, 'pitch_std': 22.0, 'energy_mean': 0.025,
            'speaking_rate': min(175, max(80, words * 60 / max(1, duration))),
            'confidence_score': round(base_conf, 1),
            'confidence_class': 'High' if base_conf >= 70 else ('Medium' if base_conf >= 45 else 'Low'),
            'duration': round(duration, 1),
            'voiced_ratio': 0.65, 'spectral_centroid': 2100.0,
        }

    conn.execute(
        """INSERT INTO audio_analysis (response_id, pitch_mean, pitch_std, energy_mean, speaking_rate, confidence_score, confidence_class)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (response_id, voice['pitch_mean'], voice.get('pitch_std', 0),
         voice['energy_mean'], voice['speaking_rate'],
         voice['confidence_score'], voice['confidence_class']))

    # ─── Composite Score + Feedback ────────────────────────────────────────────
    composite = compute_composite_score(nlp, voice)
    fb = generate_feedback(nlp, voice, composite, question['question_text'])

    conn.execute(
        """INSERT INTO feedback (response_id, nlp_score, voice_score, total_score, grade, remarks, recommendations)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (response_id, composite['nlp_score'], composite['voice_score'],
         composite['total_score'], composite['grade'],
         fb['remarks'], json.dumps(fb['recommendations'])))

    conn.commit()
    conn.close()

    return jsonify({
        'response_id': response_id,
        'nlp': {
            'grammar_score': nlp['grammar_score'],
            'relevance_score': nlp['relevance_score'],
            'keyword_score': nlp['keyword_score'],
            'vocabulary_score': nlp['vocabulary_score'],
            'nlp_score': nlp['nlp_score'],
            'errors': nlp['errors'],
            'missing_keywords': nlp['missing_keywords'],
        },
        'voice': {
            'confidence_score': voice['confidence_score'],
            'confidence_class': voice['confidence_class'],
            'speaking_rate': voice['speaking_rate'],
            'pitch_mean': voice['pitch_mean'],
            'duration': voice.get('duration', 0),
        },
        'composite': composite,
        'feedback': fb,
        'question': {
            'q_id': question['q_id'],
            'question_text': question['question_text'],
            'category': question['category'],
            'model_answer': question['model_answer'],
            'keywords': question['keywords'],
        }
    }), 201


# ─── Progress & Analytics ──────────────────────────────────────────────────────
@app.route('/api/progress', methods=['GET'])
@jwt_required()
def get_progress():
    user_id = get_jwt_identity()
    conn = get_db()

    # Weekly session scores (last 8 sessions)
    sessions = conn.execute(
        """SELECT s.session_id, s.start_time, s.total_score,
           COUNT(r.response_id) as questions_answered
           FROM sessions s LEFT JOIN responses r ON s.session_id=r.session_id
           WHERE s.user_id=? AND s.end_time IS NOT NULL
           GROUP BY s.session_id ORDER BY s.start_time DESC LIMIT 8""",
        (user_id,)).fetchall()

    # Average scores per dimension
    dims = conn.execute(
        """SELECT AVG(n.grammar_score) as avg_grammar,
                  AVG(n.relevance_score) as avg_relevance,
                  AVG(n.keyword_score) as avg_keyword,
                  AVG(n.vocabulary_score) as avg_vocab,
                  AVG(a.confidence_score) as avg_confidence,
                  AVG(f.total_score) as avg_total
           FROM responses r
           JOIN nlp_analysis n ON r.response_id=n.response_id
           JOIN audio_analysis a ON r.response_id=a.response_id
           JOIN feedback f ON r.response_id=f.response_id
           JOIN sessions s ON r.session_id=s.session_id
           WHERE s.user_id=?""", (user_id,)).fetchone()

    # Total stats
    stats = conn.execute(
        """SELECT COUNT(DISTINCT s.session_id) as total_sessions,
                  COUNT(r.response_id) as total_responses
           FROM sessions s LEFT JOIN responses r ON s.session_id=r.session_id
           WHERE s.user_id=?""", (user_id,)).fetchone()

    conn.close()

    return jsonify({
        'sessions': [dict(s) for s in sessions],
        'dimensions': {
            'grammar': round(dims['avg_grammar'] or 0, 1),
            'relevance': round(dims['avg_relevance'] or 0, 1),
            'keyword': round(dims['avg_keyword'] or 0, 1),
            'vocabulary': round(dims['avg_vocab'] or 0, 1),
            'confidence': round(dims['avg_confidence'] or 0, 1),
            'total': round(dims['avg_total'] or 0, 1),
        },
        'stats': {
            'total_sessions': stats['total_sessions'] or 0,
            'total_responses': stats['total_responses'] or 0,
        }
    })


# ─── Health Check ──────────────────────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'project': 'Interview Preparation Trainer', 'version': '1.0'})


if __name__ == '__main__':
    print("=" * 60)
    print("  Interview Preparation Trainer - PSIT Kanpur")
    print("  AKTU B.Tech Final Year Project 2026")
    print("=" * 60)
    app.run(debug=True, host='0.0.0.0', port=5000)
