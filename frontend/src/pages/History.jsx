import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../utils/api"

export default function History() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()

  useEffect(() => {
    api.get('/sessions').then(r => setSessions(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const scoreColor = s => s >= 75 ? "var(--ok)" : s >= 55 ? "#3b82f6" : s >= 40 ? "var(--warn)" : "var(--err)"
  const grade = s => s>=90?"A+":s>=80?"A":s>=70?"B":s>=60?"C":s>=50?"D":"F"

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div className="ph" style={{marginBottom:0}}>
          <div className="pt">📋 My Sessions</div>
          <div className="ps">All your interview practice sessions</div>
        </div>
        <button className="btn bp" onClick={() => nav("/session")}>🎙 New Session</button>
      </div>

      {loading ? (
        <div style={{textAlign:"center",padding:"60px 0",color:"var(--t3)"}}>Loading sessions…</div>
      ) : sessions.length === 0 ? (
        <div className="card" style={{textAlign:"center",padding:"60px 20px"}}>
          <div style={{fontSize:48,marginBottom:12}}>📋</div>
          <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>No sessions yet</div>
          <div style={{fontSize:14,color:"var(--t2)",marginBottom:20}}>
            Start your first interview practice session to see your history here.
          </div>
          <button className="btn bp blg" onClick={() => nav("/session")}>🚀 Start First Session</button>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {sessions.map(s => {
            const sc = s.total_score || 0
            const g = grade(sc)
            const gradeCol = g.startsWith("A")?"var(--ok)":g==="B"?"#3b82f6":g==="C"?"var(--warn)":"var(--err)"
            const dt = new Date(s.start_time)
            const dtStr = dt.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})
            const timeStr = dt.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})
            const completed = !!s.end_time
            return (
              <div key={s.session_id} className="card" style={{display:"flex",alignItems:"center",gap:16}}>
                <div style={{width:56,height:56,borderRadius:"50%",border:`2px solid ${gradeCol}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:18,fontWeight:800,color:gradeCol,flexShrink:0}}>
                  {g}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:700,marginBottom:3}}>
                    Session #{s.session_id}
                  </div>
                  <div style={{fontSize:12,color:"var(--t3)"}}>
                    {dtStr} at {timeStr} · {s.questions_answered || 0} questions answered
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:24,fontWeight:800,color:scoreColor(sc)}}>{sc.toFixed(1)}</div>
                  <div style={{fontSize:11,color:"var(--t3)"}}>out of 100</div>
                </div>
                <span className={"bdg " + (completed ? "dgr" : "dyw")} style={{flexShrink:0}}>
                  {completed ? "Completed" : "In Progress"}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
