import React, { useState, useRef, useEffect, useCallback } from "react"
import api from "../utils/api"

/* ── helpers ────────────────────────────────────────── */
function ScoreBar({ label, val, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--t2)" }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{typeof val === "number" ? val.toFixed(1) : val}</span>
      </div>
      <div className="pb-wrap">
        <div className="pb" style={{ width: `${val}%`, background: color }} />
      </div>
    </div>
  )
}

function GradeBadge({ grade }) {
  const cols = { "A+": "#22c55e", A: "#22c55e", B: "#3b82f6", C: "#f59e0b", D: "#f97316", F: "#ef4444" }
  const c = cols[grade] || "#94a3b8"
  return (
    <div style={{ width: 64, height: 64, borderRadius: "50%", border: `3px solid ${c}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 22, fontWeight: 800, color: c, flexShrink: 0 }}>
      {grade}
    </div>
  )
}

function WaveForm({ active }) {
  const bars = 10
  return (
    <div className="wf">
      {Array.from({ length: bars }).map((_, i) => (
        <div key={i} className="wb" style={{
          height: active ? `${20 + Math.random() * 24}px` : "6px",
          animation: active ? `wv ${0.4 + (i % 4) * 0.15}s ease-in-out infinite alternate` : "none",
          animationDelay: `${i * 0.07}s`,
          transition: "height .1s"
        }} />
      ))}
    </div>
  )
}

/* ── main ───────────────────────────────────────────── */
const CATEGORIES = ["All","HR","Technical-DSA","Technical-OOP","Technical-DBMS","Technical-OS","Technical-CN","Technical-ML"]
const DIFFICULTIES = ["All","EASY","MEDIUM","HARD"]

export default function Session() {
  // setup
  const [step, setStep] = useState("setup")  // setup | active | done
  const [category, setCategory] = useState("All")
  const [difficulty, setDifficulty] = useState("All")
  const [qCount, setQCount] = useState(5)

  // session state
  const [sessionId, setSessionId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [qIdx, setQIdx] = useState(0)
  const [results, setResults] = useState([])

  // recording
  const [recState, setRecState] = useState("idle")  // idle | recording | processing
  const [transcript, setTranscript] = useState("")
  const [timer, setTimer] = useState(0)
  const [error, setError] = useState("")

  // feedback for current q
  const [currFeedback, setCurrFeedback] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)

  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const recogRef = useRef(null)

  /* ── start session ─────────────────────────────────── */
  const startSession = async () => {
    setError("")
    try {
      const params = { limit: qCount }
      if (category !== "All") params.category = category
      if (difficulty !== "All") params.difficulty = difficulty

      const [sessRes, qRes] = await Promise.all([
        api.post('/sessions'),
        api.get('/questions', { params })
      ])

      if (!qRes.data.length) { setError("No questions found for selected filters."); return }

      setSessionId(sessRes.data.session_id)
      setQuestions(qRes.data)
      setQIdx(0)
      setResults([])
      setStep("active")
    } catch (e) {
      setError(e.response?.data?.error || "Failed to start session.")
    }
  }

  /* ── recording ─────────────────────────────────────── */
  const startRecording = useCallback(async () => {
    setTranscript("")
    setCurrFeedback(null)
    setShowFeedback(false)
    setError("")
    chunksRef.current = []

    // Browser Speech Recognition
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRec) {
      const recog = new SpeechRec()
      recog.continuous = true
      recog.interimResults = true
      recog.lang = "en-IN"
      let finalText = ""
      recog.onresult = (e) => {
        let interim = ""
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript
          if (e.results[i].isFinal) finalText += t + " "
          else interim = t
        }
        setTranscript(finalText + interim)
      }
      recog.onerror = () => {}
      recog.start()
      recogRef.current = recog
    }

    // Also capture audio for voice analysis
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.start(250)
      mediaRef.current = { recorder: mr, stream }
    } catch (e) {
      console.warn("Mic not available, text-only mode")
    }

    setRecState("recording")
    setTimer(0)
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
  }, [])

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current)
    setRecState("processing")

    if (recogRef.current) {
      recogRef.current.stop()
      recogRef.current = null
    }

    if (mediaRef.current) {
      const { recorder, stream } = mediaRef.current
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" })
        const b64 = await blobToB64(blob)
        submitAnswer(b64)
      }
      recorder.stop()
      stream.getTracks().forEach(t => t.stop())
      mediaRef.current = null
    } else {
      submitAnswer("")
    }
  }, [qIdx, sessionId, questions, transcript])

  const blobToB64 = (blob) => new Promise((res) => {
    const reader = new FileReader()
    reader.onload = () => res(reader.result.split(",")[1])
    reader.readAsDataURL(blob)
  })

  /* ── submit answer ─────────────────────────────────── */
  const submitAnswer = async (audio_b64) => {
    const q = questions[qIdx]
    const finalTranscript = transcript.trim()

    if (!finalTranscript) {
      setError("No speech detected. Please speak your answer clearly.")
      setRecState("idle")
      return
    }

    try {
      const res = await api.post(`/sessions/${sessionId}/respond`, {
        q_id: q.q_id,
        transcript: finalTranscript,
        audio_b64: audio_b64 || ""
      })
      const data = res.data
      setCurrFeedback(data)
      setResults(prev => [...prev, data])
      setShowFeedback(true)
      setRecState("idle")
    } catch (e) {
      setError("Submission failed. Please try again.")
      setRecState("idle")
    }
  }

  /* ── next question ─────────────────────────────────── */
  const nextQuestion = async () => {
    setShowFeedback(false)
    setCurrFeedback(null)
    setTranscript("")
    setError("")

    if (qIdx + 1 >= questions.length) {
      // Complete session
      try { await api.put(`/sessions/${sessionId}/complete`) } catch {}
      setStep("done")
    } else {
      setQIdx(i => i + 1)
    }
  }

  /* ── cleanup ───────────────────────────────────────── */
  useEffect(() => () => { clearInterval(timerRef.current) }, [])

  const fmtTime = (s) => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`
  const q = questions[qIdx]

  const diffColor = d => d==="EASY"?"var(--ok)":d==="MEDIUM"?"var(--warn)":"var(--err)"
  const catShort = c => c.replace("Technical-","")
  const scoreCol = s => s>=75?"var(--ok)":s>=55?"#3b82f6":s>=40?"var(--warn)":"var(--err)"

  /* ══════════ SETUP SCREEN ══════════════════════════ */
  if (step === "setup") return (
    <div>
      <div className="ph">
        <div className="pt">🎙 New Interview Session</div>
        <div className="ps">Configure your session and start practicing with AI-powered feedback</div>
      </div>

      {error && <div className="alert alert-err" style={{marginBottom:16}}>{error}</div>}

      <div className="g2" style={{alignItems:"start"}}>
        <div>
          <div className="card" style={{marginBottom:16}}>
            <div className="stit">⚙️ Session Settings</div>

            <div className="ig">
              <label>Question Category</label>
              <div className="chip-row">
                {CATEGORIES.map(c => (
                  <button key={c} className={"chip"+(category===c?" sel":"")}
                    onClick={() => setCategory(c)}>{catShort(c)}</button>
                ))}
              </div>
            </div>

            <div className="ig">
              <label>Difficulty Level</label>
              <div className="chip-row">
                {DIFFICULTIES.map(d => (
                  <button key={d} className={"chip"+(difficulty===d?" sel":"")}
                    onClick={() => setDifficulty(d)}>{d}</button>
                ))}
              </div>
            </div>

            <div className="ig">
              <label>Number of Questions</label>
              <div className="chip-row">
                {[3,5,8,10].map(n => (
                  <button key={n} className={"chip"+(qCount===n?" sel":"")}
                    onClick={() => setQCount(n)}>{n} Questions</button>
                ))}
              </div>
            </div>

            <button className="btn bp blg" style={{width:"100%",marginTop:8}} onClick={startSession}>
              🚀 Start Interview Session
            </button>
          </div>
        </div>

        <div>
          <div className="card" style={{marginBottom:16}}>
            <div className="stit">📌 How It Works</div>
            {[
              ["🎙","Speak Your Answer","Click Record and answer the question aloud. Use your microphone clearly."],
              ["🧠","AI NLP Analysis","Your transcript is evaluated for relevance, grammar, keywords, and vocabulary."],
              ["🔊","Voice Analysis","Your speech is analyzed for confidence, pitch, speaking rate, and tone."],
              ["📊","Instant Feedback","Get detailed, personalized feedback and scores for every dimension."],
              ["📈","Track Progress","Session scores are saved to your analytics dashboard automatically."],
            ].map(([ic,t,d])=>(
              <div key={t} style={{display:"flex",gap:12,marginBottom:14}}>
                <span style={{fontSize:20,flexShrink:0}}>{ic}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>{t}</div>
                  <div style={{fontSize:12,color:"var(--t3)",lineHeight:1.5}}>{d}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{background:"rgba(99,102,241,0.06)",borderColor:"rgba(99,102,241,0.2)"}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:8,color:"var(--pl)"}}>💡 Pro Tips</div>
            <ul style={{fontSize:12,color:"var(--t3)",lineHeight:1.8,paddingLeft:16}}>
              <li>Speak at 110–150 words per minute for best scores</li>
              <li>Use technical keywords specific to the question topic</li>
              <li>Structure answers clearly: define → explain → example</li>
              <li>Aim for 45–90 seconds per answer</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  /* ══════════ DONE SCREEN ═══════════════════════════ */
  if (step === "done") {
    const total = results.reduce((a,r)=>a+(r.composite?.total_score||0),0)/Math.max(1,results.length)
    const grade = total>=90?"A+":total>=80?"A":total>=70?"B":total>=60?"C":total>=50?"D":"F"
    return (
      <div>
        <div className="ph">
          <div className="pt">🎉 Session Complete!</div>
          <div className="ps">Here is your complete performance report</div>
        </div>

        {/* Summary */}
        <div className="card" style={{marginBottom:20,background:"linear-gradient(135deg,rgba(99,102,241,0.1),rgba(6,182,212,0.05))"}}>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <GradeBadge grade={grade}/>
            <div style={{flex:1}}>
              <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>
                Overall Score: <span style={{color:scoreCol(total)}}>{total.toFixed(1)}/100</span>
              </div>
              <div style={{fontSize:14,color:"var(--t2)"}}>
                You answered {results.length} question{results.length!==1?"s":""} in this session.
              </div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button className="btn bp" onClick={()=>{setStep("setup");setResults([]);setTranscript("")}}>
                🔁 Practice Again
              </button>
            </div>
          </div>
        </div>

        {/* Per-question results */}
        <div className="stit" style={{marginBottom:12}}>📋 Question-by-Question Breakdown</div>
        {results.map((r, i) => (
          <div key={i} className="card" style={{marginBottom:12}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:14}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:"var(--glass)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontWeight:800,color:"var(--pl)",fontSize:14,flexShrink:0}}>Q{i+1}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,marginBottom:6,lineHeight:1.4}}>
                  {r.question?.question_text}
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <span className="bdg dpu">{catShort(r.question?.category)}</span>
                  <span className="bdg" style={{background:"rgba(255,255,255,0.05)",color:diffColor(r.question?.difficulty)}}>
                    {r.question?.difficulty}
                  </span>
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:22,fontWeight:800,color:scoreCol(r.composite?.total_score||0)}}>
                  {(r.composite?.total_score||0).toFixed(1)}
                </div>
                <div style={{fontSize:12,color:"var(--t3)"}}>Grade: {r.composite?.grade}</div>
              </div>
            </div>

            <div className="g2" style={{gap:12}}>
              <div style={{background:"var(--glass)",borderRadius:"var(--rs)",padding:12}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:8,color:"var(--t2)"}}>📝 Content Analysis</div>
                <ScoreBar label="Relevance" val={r.nlp?.relevance_score||0} color="#6366f1"/>
                <ScoreBar label="Grammar" val={r.nlp?.grammar_score||0} color="#06b6d4"/>
                <ScoreBar label="Keywords" val={r.nlp?.keyword_score||0} color="#22c55e"/>
              </div>
              <div style={{background:"var(--glass)",borderRadius:"var(--rs)",padding:12}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:8,color:"var(--t2)"}}>🔊 Voice Analysis</div>
                <ScoreBar label="Confidence" val={r.voice?.confidence_score||0} color="#ef4444"/>
                <div style={{fontSize:12,color:"var(--t3)",marginTop:8}}>
                  Rate: {(r.voice?.speaking_rate||0).toFixed(0)} WPM ·
                  Class: <span style={{color:r.voice?.confidence_class==="High"?"var(--ok)":r.voice?.confidence_class==="Medium"?"var(--warn)":"var(--err)"}}>
                    {r.voice?.confidence_class}
                  </span>
                </div>
              </div>
            </div>

            {r.feedback?.recommendations?.length > 0 && (
              <div style={{marginTop:12,padding:12,background:"rgba(245,158,11,0.06)",
                border:"1px solid rgba(245,158,11,0.15)",borderRadius:"var(--rs)"}}>
                <div style={{fontSize:12,fontWeight:700,color:"var(--warn)",marginBottom:6}}>💡 Recommendations</div>
                {r.feedback.recommendations.map((rec,j)=>(
                  <div key={j} style={{fontSize:12,color:"var(--t2)",paddingLeft:12,
                    borderLeft:"2px solid rgba(245,158,11,0.3)",marginBottom:4}}>{rec}</div>
                ))}
              </div>
            )}

            <div style={{marginTop:10,padding:10,background:"var(--glass)",borderRadius:"var(--rs)"}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--t3)",marginBottom:4}}>YOUR ANSWER</div>
              <div style={{fontSize:12,color:"var(--t2)",lineHeight:1.6,fontStyle:"italic"}}>
                "{r.transcript || "No transcript"}"
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  /* ══════════ ACTIVE SESSION ════════════════════════ */
  return (
    <div>
      {/* Header bar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <div className="pt" style={{fontSize:20}}>Interview Session #{sessionId}</div>
          <div className="ps">Question {qIdx+1} of {questions.length}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {recState==="recording" && (
            <div style={{display:"flex",alignItems:"center",gap:8,color:"var(--err)",fontSize:13,fontWeight:600}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:"var(--err)",animation:"rp 1s infinite"}}/>
              {fmtTime(timer)}
            </div>
          )}
          <div style={{display:"flex",gap:6}}>
            {Array.from({length:questions.length}).map((_,i)=>(
              <div key={i} style={{width:28,height:6,borderRadius:99,
                background:i<qIdx?"var(--ok)":i===qIdx?"var(--p)":"var(--glass)"}}/>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-err" style={{marginBottom:16}}>{error}</div>}

      {/* Question card */}
      <div className="qcard">
        <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
          <span className="bdg dpu">{catShort(q?.category)}</span>
          <span className="bdg" style={{background:"rgba(255,255,255,0.05)",color:diffColor(q?.difficulty)}}>
            {q?.difficulty}
          </span>
          <span className="bdg dgy">Q{qIdx+1} of {questions.length}</span>
        </div>
        <div className="qtxt">{q?.question_text}</div>
      </div>

      {/* Recording area */}
      {!showFeedback && (
        <div className={"rar"+(recState==="recording"?" rec":"")}>
          <button className={"rbtn"+(recState==="recording"?" rec":" idle")}
            onClick={recState==="idle"?startRecording:recState==="recording"?stopRecording:null}
            disabled={recState==="processing"}>
            {recState==="idle"?"🎙":recState==="recording"?"⏹":"⏳"}
          </button>

          {recState==="recording" && <WaveForm active={true}/>}

          <div style={{fontSize:14,fontWeight:600,marginBottom:4,marginTop:8}}>
            {recState==="idle"?"Click to start recording":recState==="recording"?"Recording — click to stop":"Analyzing response…"}
          </div>
          <div style={{fontSize:12,color:"var(--t3)"}}>
            {recState==="idle"?"Speak clearly into your microphone":
             recState==="recording"?`${fmtTime(timer)} · Web Speech API active`:"Running NLP + Voice analysis…"}
          </div>

          {transcript && (
            <div style={{marginTop:16,padding:14,background:"rgba(0,0,0,0.3)",borderRadius:"var(--rs)",
              textAlign:"left",maxHeight:120,overflowY:"auto"}}>
              <div style={{fontSize:11,color:"var(--t3)",marginBottom:4,fontWeight:600}}>LIVE TRANSCRIPT</div>
              <div style={{fontSize:13,color:"var(--t2)",lineHeight:1.6}}>{transcript}</div>
            </div>
          )}

          {/* Manual transcript fallback */}
          {recState==="idle" && !transcript && (
            <div style={{marginTop:16,width:"100%",maxWidth:480,textAlign:"left"}}>
              <div style={{fontSize:11,color:"var(--t3)",marginBottom:6}}>
                No microphone? Type your answer manually:
              </div>
              <textarea placeholder="Type your answer here…" style={{fontSize:13,minHeight:80}}
                onChange={e=>setTranscript(e.target.value)} value={transcript}/>
              {transcript && (
                <button className="btn bp bsm" style={{marginTop:8}}
                  onClick={()=>submitAnswer("")}
                  disabled={recState==="processing"}>
                  {recState==="processing"?"Analyzing…":"Submit Answer →"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Feedback panel */}
      {showFeedback && currFeedback && (
        <div>
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
            <GradeBadge grade={currFeedback.composite?.grade}/>
            <div>
              <div style={{fontSize:20,fontWeight:800}}>
                Score: <span style={{color:scoreCol(currFeedback.composite?.total_score||0)}}>
                  {(currFeedback.composite?.total_score||0).toFixed(1)}/100
                </span>
              </div>
              <div style={{fontSize:13,color:"var(--t2)"}}>
                Content: {(currFeedback.composite?.nlp_score||0).toFixed(1)} · Voice: {(currFeedback.composite?.voice_score||0).toFixed(1)}
              </div>
            </div>
          </div>

          <div className="tabs" style={{marginBottom:16}}>
            <span id="ftab1" className="tab on" style={{cursor:"default"}}>📝 Content</span>
            <span className="tab on" style={{cursor:"default",flex:"none",padding:"8px 20px"}}>🔊 Voice</span>
            <span className="tab on" style={{cursor:"default",flex:"none",padding:"8px 20px"}}>💡 Tips</span>
          </div>

          <div className="g2" style={{marginBottom:16}}>
            {/* NLP */}
            <div className="card">
              <div className="stit" style={{marginBottom:12}}>📝 Content Analysis</div>
              <ScoreBar label="Semantic Relevance" val={currFeedback.nlp?.relevance_score||0} color="#6366f1"/>
              <ScoreBar label="Grammar Quality" val={currFeedback.nlp?.grammar_score||0} color="#06b6d4"/>
              <ScoreBar label="Keyword Coverage" val={currFeedback.nlp?.keyword_score||0} color="#22c55e"/>
              <ScoreBar label="Vocabulary" val={currFeedback.nlp?.vocabulary_score||0} color="#f59e0b"/>
              {currFeedback.nlp?.missing_keywords?.length>0 && (
                <div style={{marginTop:10,padding:10,background:"rgba(239,68,68,0.06)",borderRadius:"var(--rs)"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--err)",marginBottom:4}}>Missing Keywords</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {currFeedback.nlp.missing_keywords.slice(0,6).map(k=>(
                      <span key={k} className="bdg drd" style={{fontSize:11}}>{k}</span>
                    ))}
                  </div>
                </div>
              )}
              {currFeedback.nlp?.errors?.length>0 && (
                <div style={{marginTop:10}}>
                  {currFeedback.nlp.errors.map((e,i)=>(
                    <div key={i} style={{fontSize:12,color:"var(--warn)",padding:"4px 0",
                      borderBottom:"1px solid var(--glass)"}}>⚠ {e.message}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Voice */}
            <div className="card">
              <div className="stit" style={{marginBottom:12}}>🔊 Voice Analysis</div>
              <ScoreBar label="Confidence Score" val={currFeedback.voice?.confidence_score||0} color="#ef4444"/>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
                {[
                  ["Confidence Class", currFeedback.voice?.confidence_class, "var(--ok)"],
                  ["Speaking Rate", `${(currFeedback.voice?.speaking_rate||0).toFixed(0)} WPM`, "#06b6d4"],
                  ["Avg Pitch", `${(currFeedback.voice?.pitch_mean||0).toFixed(0)} Hz`, "#f59e0b"],
                  ["Duration", `${(currFeedback.voice?.duration||0).toFixed(1)}s`, "#818cf8"],
                ].map(([lab,val,col])=>(
                  <div key={lab} style={{padding:10,background:"var(--glass)",borderRadius:"var(--rs)"}}>
                    <div style={{fontSize:10,color:"var(--t3)",fontWeight:600,marginBottom:4}}>{lab}</div>
                    <div style={{fontSize:15,fontWeight:700,color:col}}>{val}</div>
                  </div>
                ))}
              </div>

              <div style={{marginTop:12,padding:10,background:"var(--glass)",borderRadius:"var(--rs)",fontSize:12,color:"var(--t3)"}}>
                Ideal speaking rate: 110–150 WPM · Ideal duration: 45–90 seconds
              </div>
            </div>
          </div>

          {/* Overall feedback */}
          <div className="card" style={{marginBottom:16,background:"rgba(6,182,212,0.04)",borderColor:"rgba(6,182,212,0.15)"}}>
            <div className="stit">💬 AI Feedback</div>
            <div style={{fontSize:14,color:"var(--t2)",lineHeight:1.7}}>
              {currFeedback.feedback?.remarks}
            </div>
            {currFeedback.feedback?.recommendations?.length>0 && (
              <div style={{marginTop:14}}>
                <div style={{fontSize:12,fontWeight:700,color:"var(--warn)",marginBottom:8}}>Recommendations:</div>
                {currFeedback.feedback.recommendations.map((r,i)=>(
                  <div key={i} style={{display:"flex",gap:8,marginBottom:6}}>
                    <span style={{color:"var(--warn)",flexShrink:0}}>→</span>
                    <span style={{fontSize:13,color:"var(--t2)"}}>{r}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Model answer */}
          <div className="card" style={{marginBottom:16,background:"rgba(34,197,94,0.04)",borderColor:"rgba(34,197,94,0.15)"}}>
            <div className="stit">✅ Model Answer</div>
            <div style={{fontSize:13,color:"var(--t2)",lineHeight:1.7}}>
              {currFeedback.question?.model_answer}
            </div>
            {currFeedback.question?.keywords && (
              <div style={{marginTop:10}}>
                <div style={{fontSize:11,color:"var(--t3)",marginBottom:6,fontWeight:600}}>KEY TERMS</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {currFeedback.question.keywords.split(",").map(k=>(
                    <span key={k} className="bdg dgr" style={{fontSize:11}}>{k.trim()}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{display:"flex",gap:12}}>
            <button className="btn bp blg" style={{flex:1}} onClick={nextQuestion}>
              {qIdx+1>=questions.length?"🏁 Finish Session →":"Next Question →"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
