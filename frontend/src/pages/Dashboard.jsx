import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../components/AuthContext"
import api from "../utils/api"

function ScoreRing({ score, size = 80, color = "#6366f1" }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * (score / 100)
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:"stroke-dasharray .6s ease"}}/>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        style={{fill:"#f1f5f9",fontSize:size/4,fontWeight:800,transform:"rotate(90deg)",transformOrigin:"center"}}>
        {Math.round(score)}
      </text>
    </svg>
  )
}

function ProgressBar({ value, color }) {
  return (
    <div className="pb-wrap" style={{width:"100%"}}>
      <div className="pb" style={{width:`${value}%`, background: color || "var(--p)"}}/>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [progress, setProgress] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/progress'),
      api.get('/sessions')
    ]).then(([pr, sr]) => {
      setProgress(pr.data)
      setSessions(sr.data)
    }).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  const dims = progress?.dimensions || {}
  const stats = progress?.stats || {}

  const gradeColor = (g) => {
    if (!g) return "var(--t3)"
    if (g.startsWith("A")) return "var(--ok)"
    if (g === "B") return "#3b82f6"
    if (g === "C") return "var(--warn)"
    return "var(--err)"
  }

  const scoreColor = (s) => s >= 75 ? "var(--ok)" : s >= 55 ? "#3b82f6" : s >= 40 ? "var(--warn)" : "var(--err)"

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28}}>
        <div>
          <div style={{fontSize:24,fontWeight:800,marginBottom:4}}>
            {greeting}, {user?.name?.split(" ")[0]} 👋
          </div>
          <div style={{fontSize:14,color:"var(--t2)"}}>
            Ready to ace your next interview? Track your progress below.
          </div>
        </div>
        <button className="btn bp blg" onClick={()=>nav("/session")}>
          🎙 Start Interview Session
        </button>
      </div>

      {/* Stats */}
      <div className="sg">
        {[
          { label:"Sessions Done", value: stats.total_sessions || 0, sub:"practice rounds", color:"var(--pl)" },
          { label:"Responses Given", value: stats.total_responses || 0, sub:"answers evaluated", color:"var(--ac)" },
          { label:"Avg Score", value: dims.total ? dims.total.toFixed(1) : "—", sub:"overall performance", color:"var(--ok)" },
          { label:"Confidence", value: dims.confidence ? dims.confidence.toFixed(1) : "—", sub:"voice analysis score", color:"var(--warn)" },
        ].map(s => (
          <div className="sc" key={s.label}>
            <div className="sl">{s.label}</div>
            <div className="sv" style={{color:s.color}}>{s.value}</div>
            <div className="ss">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="g2">
        {/* Skill Radar */}
        <div className="card">
          <div className="stit">📈 Skill Profile</div>
          {loading ? (
            <div style={{color:"var(--t3)",fontSize:13}}>Loading…</div>
          ) : !dims.total ? (
            <div style={{padding:"24px 0",textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:10}}>🎯</div>
              <div style={{color:"var(--t2)",fontSize:14,marginBottom:14}}>No sessions completed yet.</div>
              <button className="btn bp" onClick={()=>nav("/session")}>Start your first session →</button>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {[
                {label:"Content Relevance",val:dims.relevance||0,color:"#6366f1"},
                {label:"Grammar Quality",val:dims.grammar||0,color:"#06b6d4"},
                {label:"Keyword Coverage",val:dims.keyword||0,color:"#22c55e"},
                {label:"Vocabulary",val:dims.vocabulary||0,color:"#f59e0b"},
                {label:"Voice Confidence",val:dims.confidence||0,color:"#ef4444"},
              ].map(d=>(
                <div key={d.label}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
                    <span style={{color:"var(--t2)"}}>{d.label}</span>
                    <span style={{fontWeight:700,color:d.color}}>{d.val.toFixed(1)}</span>
                  </div>
                  <ProgressBar value={d.val} color={d.color}/>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="card">
          <div className="stit">🕐 Recent Sessions</div>
          {sessions.length === 0 ? (
            <div style={{padding:"24px 0",textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:10}}>📋</div>
              <div style={{color:"var(--t2)",fontSize:14}}>No sessions yet. Start practicing!</div>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {sessions.slice(0,6).map(s=>{
                const score = s.total_score || 0
                const date = new Date(s.start_time).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})
                const grade = score>=90?"A+":score>=80?"A":score>=70?"B":score>=60?"C":score>=50?"D":"F"
                return (
                  <div key={s.session_id} style={{display:"flex",alignItems:"center",gap:12,
                    padding:"12px",background:"var(--glass)",borderRadius:"var(--rs)"}}>
                    <div style={{width:44,height:44,borderRadius:"50%",background:`rgba(99,102,241,0.12)`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:16,fontWeight:800,color:"var(--pl)",flexShrink:0}}>
                      {grade}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>Session #{s.session_id}</div>
                      <div style={{fontSize:11,color:"var(--t3)"}}>
                        {date} · {s.questions_answered||0} questions
                      </div>
                    </div>
                    <div style={{fontSize:18,fontWeight:800,color:scoreColor(score)}}>
                      {score.toFixed(1)}
                    </div>
                  </div>
                )
              })}
              <button className="btn bo bsm" style={{marginTop:4}} onClick={()=>nav("/history")}>
                View all sessions →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="card" style={{marginTop:20}}>
        <div className="stit">💡 Preparation Tips</div>
        <div className="g3">
          {[
            {ic:"🗣",t:"Speak Clearly",d:"Aim for 110–150 words per minute. Slow down during important points."},
            {ic:"📝",t:"Use STAR Method",d:"Structure answers: Situation → Task → Action → Result for HR questions."},
            {ic:"🔑",t:"Use Keywords",d:"Include domain-specific technical terms relevant to the question."},
            {ic:"⏱",t:"Answer Duration",d:"Ideal answer length: 45–90 seconds. Avoid too short or too long."},
            {ic:"💪",t:"Build Confidence",d:"Practice daily. Consistent rehearsal reduces interview anxiety significantly."},
            {ic:"🎯",t:"Stay Relevant",d:"Answer what is asked. Avoid drifting off-topic or over-explaining."},
          ].map(tip=>(
            <div key={tip.t} style={{padding:"14px",background:"var(--glass)",borderRadius:"var(--rs)"}}>
              <div style={{fontSize:24,marginBottom:8}}>{tip.ic}</div>
              <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>{tip.t}</div>
              <div style={{fontSize:12,color:"var(--t3)",lineHeight:1.5}}>{tip.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
