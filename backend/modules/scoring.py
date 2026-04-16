import json

NLP_WEIGHT = 0.60
VOICE_WEIGHT = 0.40

def compute_composite_score(nlp_result, voice_result):
    nlp_score = nlp_result.get("nlp_score", 50.0)
    voice_score = voice_result.get("confidence_score", 50.0)
    total = round(nlp_score * NLP_WEIGHT + voice_score * VOICE_WEIGHT, 1)
    if total >= 90: grade = "A+"
    elif total >= 80: grade = "A"
    elif total >= 70: grade = "B"
    elif total >= 60: grade = "C"
    elif total >= 50: grade = "D"
    else: grade = "F"
    return {"nlp_score": nlp_score, "voice_score": voice_score, "total_score": total, "grade": grade}

def generate_feedback(nlp_result, voice_result, composite, question_text=""):
    total = composite["total_score"]
    grade = composite["grade"]
    remarks = []
    recommendations = []
    
    if total >= 80: remarks.append("Excellent response! Strong interview performance.")
    elif total >= 65: remarks.append("Good attempt with room for improvement.")
    elif total >= 50: remarks.append("Decent effort. Focus on highlighted areas.")
    else: remarks.append("Needs considerable improvement. Review feedback carefully.")
    
    relevance = nlp_result.get("relevance_score", 0)
    grammar = nlp_result.get("grammar_score", 0)
    keyword = nlp_result.get("keyword_score", 0)
    missing_kws = nlp_result.get("missing_keywords", [])
    errors = nlp_result.get("errors", [])
    
    if relevance >= 75: remarks.append("Your answer was highly relevant and well-aligned with the question.")
    elif relevance >= 50:
        remarks.append("Partially relevant. Focus more directly on the question.")
        recommendations.append("Use the STAR method: Situation, Task, Action, Result.")
    else:
        remarks.append("Answer seemed off-topic or lacked direct relevance.")
        recommendations.append("Practice the STAR method for structured answers.")
    
    if grammar >= 85: remarks.append("Grammar and sentence structure were excellent.")
    elif grammar >= 65:
        remarks.append("Minor grammatical issues detected. Overall structure is acceptable.")
        if errors: recommendations.append("Fix: " + errors[0]["message"])
    else:
        remarks.append("Several grammatical errors detected.")
        for e in errors[:2]: recommendations.append("Fix: " + e["message"])
    
    if keyword >= 75: remarks.append("Good coverage of domain-specific keywords.")
    elif keyword >= 45:
        remarks.append("Some key technical terms were missing.")
        if missing_kws: recommendations.append("Include key terms: " + ", ".join(missing_kws[:3]))
    else:
        remarks.append("Answer lacked important domain-specific terminology.")
        if missing_kws: recommendations.append("Study these concepts: " + ", ".join(missing_kws[:4]))
    
    conf_class = voice_result.get("confidence_class", "Medium")
    speaking_rate = voice_result.get("speaking_rate", 130)
    duration = voice_result.get("duration", 0)
    
    if conf_class == "High": remarks.append("Voice projected strong confidence and clarity.")
    elif conf_class == "Medium":
        remarks.append("Voice delivery was moderate. Work on projecting more confidence.")
        recommendations.append("Practice speaking with a firm, clear voice. Record yourself and review.")
    else:
        remarks.append("Voice lacked confidence. Sounded hesitant or nervous.")
        recommendations.append("Take a deep breath before answering. Practice daily to build vocal confidence.")
    
    if speaking_rate < 90:
        recommendations.append("Speak a bit faster. Aim for 110-150 words per minute.")
    elif speaking_rate > 175:
        recommendations.append("Slow down slightly. Speaking too fast reduces clarity.")
    
    if duration < 20:
        recommendations.append("Provide more detailed answers. Aim for at least 45-60 seconds per response.")
    
    remarks_str = " ".join(remarks)
    return {"remarks": remarks_str, "recommendations": recommendations[:4]}
