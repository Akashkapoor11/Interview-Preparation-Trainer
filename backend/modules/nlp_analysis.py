"""
NLP Analysis Module
Evaluates grammar, semantic relevance, keyword coverage, and vocabulary richness.
"""
import re
import math
from collections import Counter

FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'literally',
                'actually', 'sort of', 'kind of', 'right', 'okay so']

GRAMMAR_PATTERNS = [
    (r'\bi\s+(?:is|are)\b', "Subject-verb error: 'I' should use 'am'"),
    (r'\bhe\s+(?:are)\b', "Subject-verb error: 'he' should use 'is'"),
    (r'\bthey\s+(?:is)\b', "Subject-verb error: 'they' should use 'are'"),
    (r'\b(\w+)\s+\1\b', "Repeated word detected"),
    (r'\bdoesn\'t\s+(?:likes|goes|runs)\b', "Verb form error after 'doesn't'"),
]

STOP_WORDS = set([
    'i','me','my','myself','we','our','ours','ourselves','you','your','yours',
    'yourself','he','him','his','himself','she','her','hers','herself','it',
    'its','itself','they','them','their','theirs','themselves','what','which',
    'who','this','that','these','those','am','is','are','was','were','be','been',
    'being','have','has','had','do','does','did','a','an','the','and','but','if',
    'or','as','of','at','by','for','with','to','from','in','out','on','then',
    'so','than','very','just','can','will','all','both','each','some','no','not'
])


def tokenize(text: str) -> list:
    text = re.sub(r'[^\w\s]', ' ', text.lower())
    return [t for t in text.split() if t not in STOP_WORDS and len(t) > 2]


def check_grammar(text: str) -> dict:
    errors = []
    lower = text.lower()
    for pattern, msg in GRAMMAR_PATTERNS:
        if re.search(pattern, lower, re.IGNORECASE):
            errors.append({"type": "Grammar", "message": msg})
    fillers = [f for f in FILLER_WORDS if lower.count(f) > 2]
    if fillers:
        errors.append({"type": "Fluency",
                        "message": f"Excessive filler words: {', '.join(fillers)}"})
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    short_sents = [s for s in sentences if len(s.split()) < 4]
    if len(short_sents) > 2:
        errors.append({"type": "Structure",
                        "message": "Multiple incomplete or very short sentences detected."})
    deduction = min(50, len(errors) * 12)
    score = max(45, 100 - deduction)
    avg_len = (sum(len(s.split()) for s in sentences) / max(1, len(sentences)))
    if 8 <= avg_len <= 30:
        score = min(100, score + 5)
    return {"score": round(float(score), 1), "errors": errors}


def compute_relevance(user_text: str, model_answer: str) -> float:
    user_tokens = tokenize(user_text)
    model_tokens = tokenize(model_answer)
    if not user_tokens or not model_tokens:
        return 0.0
    vocab = list(set(user_tokens + model_tokens))

    def tfidf(tokens):
        tf = Counter(tokens)
        total = len(tokens) or 1
        return [tf.get(w, 0) / total for w in vocab]

    v1, v2 = tfidf(user_tokens), tfidf(model_tokens)
    dot = sum(a * b for a, b in zip(v1, v2))
    m1 = math.sqrt(sum(a * a for a in v1))
    m2 = math.sqrt(sum(b * b for b in v2))
    if m1 == 0 or m2 == 0:
        return 0.0
    cosine = dot / (m1 * m2)
    return round(min(100.0, cosine * 160), 1)


def compute_keyword_coverage(user_text: str, keywords_str: str):
    keywords = [k.strip().lower() for k in keywords_str.split(',') if k.strip()]
    if not keywords:
        return 0.0, []
    lower = user_text.lower()
    found = [k for k in keywords if k in lower]
    missing = [k for k in keywords if k not in lower]
    score = round((len(found) / len(keywords)) * 100, 1)
    return score, missing


def compute_vocabulary(text: str) -> float:
    words = re.findall(r'\b[a-z]+\b', text.lower())
    if not words:
        return 50.0
    unique = set(words)
    ratio = len(unique) / len(words)
    avg_len = sum(len(w) for w in unique) / len(unique)
    score = ratio * 60 + min(40, avg_len * 4)
    return round(min(100.0, score * 1.2), 1)


def analyze_nlp(transcript: str, model_answer: str, keywords_str: str) -> dict:
    grammar = check_grammar(transcript)
    relevance = compute_relevance(transcript, model_answer)
    keyword_score, missing_kws = compute_keyword_coverage(transcript, keywords_str)
    vocab_score = compute_vocabulary(transcript)
    nlp_score = round(
        grammar["score"] * 0.25 +
        relevance * 0.40 +
        keyword_score * 0.20 +
        vocab_score * 0.15, 1)
    return {
        "grammar_score": grammar["score"],
        "relevance_score": relevance,
        "keyword_score": keyword_score,
        "vocabulary_score": vocab_score,
        "nlp_score": nlp_score,
        "errors": grammar["errors"],
        "missing_keywords": missing_kws,
    }
