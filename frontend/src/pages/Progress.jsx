import React, { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, BarChart, Bar } from "recharts"
import api from "../utils/api"

function ScoreBar({ label, val, color, icon }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:5 }}>
        <span style={{ color:"var(--t2)", display:"flex", alignItems:"center", gap:6 }}>
          {icon} {label}
        </span>
        <span style={{ fontWeight:700, color }}>{val.toFixed(1)}<span style={{color:"var(--t3)",fontSize:11}}>/100</span></span>
      </div>
      <div className="pb-wrap">
        <div className="pb" style={{ width:`${val}%`, background:color }}/>
      </div>
    </div>
  )
}

const INSIGHTS = [
  { min:0, max:50, icon:"🔴", text:"You are in early stages. Practice daily for rapid improvement." },
  { min:50, max:65, icon:"🟡", text:"Developing skills. Focus on keyword coverage and sentence structure." },
  { min:65, max:80, icon:"🔵", text:"Good performance. Work on voice confidence and speaking pace." },
  { min:80, max:100, icon:"🟢", text:"Excellent! Keep practicing to maintain and refine your edge." },
]

export default function Progress() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/progress').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{textAlign:"center",padding:"80px 0",color:"var(--t3)"}}>Loading analytics…</div>

  const dims = data?.dimensions || {}
  const stats = data?.stats || {}
  const sessions = (data?.sessions || []).reverse()

  const hasData = (stats.total_sessions || 0) > 0
  const avgScore = dims.total || 0
  const insight = INSIGHTS.find(i => avgScore >= i.min && avgScore < i.max) || INSIGHTS[INSIGHTS.length-1]

  const chartData = sessions.map((s, i) => ({
    name: `S${i+1}`,
    score: parseFloat((s.total_score || 0).toFixed(1)),
    date: new Date(s.start_time).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),
  }))

  const radarData = [
    { dim:"Relevance", val: dims.relevance || 0 },
    { dim:"Grammar", val: dims.grammar || 0 },
    { dim:"Keywords", val: dims.keyword || 0 },
    { dim:"Vocabulary", val: dims.vocabulary || 0 },
    { dim:"Confidence", val: dims.confidence || 0 },
  ]

  return (
    <div>
      <div className="ph">
        <div className="pt">📊 Performance Analytics</div>
        <div className="ps">Track your improvement across all interview dimensions</div>
      </div>

      {!hasData ? (
        <div className="card" style={{textAlign:"center",padding:"60px 20px"}}>
          <div style={{fontSize:48,marginBottom:12}}>📊</div>
          <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>No data yet</div>
          <div style={{fontSize:14,color:"var(--t2)"}}>Complete at least one interview session to see your analytics.</div>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="sg">
            {[
              {l:"Sessions",v:stats.total_sessions||0,s:"completed",c:"var(--pl)"},
              {l:"Responses",v:stats.total_responses||0,s:"evaluated",c:"var(--ac)"},
              {l:"Avg Score",v:avgScore.toFixed(1),s:"overall",c:"var(--ok)"},
              {l:"Confidence",v:(dims.confidence||0).toFixed(1),s:"voice score",c:"var(--warn)"},
            ].map(s=>(
              <div className="sc" key={s.l}>
                <div className="sl">{s.l}</div>
                <div className="sv" style={{color:s.c}}>{s.v}</div>
                <div className="ss">{s.s}</div>
              </div>
            ))}
          </div>

          {/* Insight banner */}
          <div className="card" style={{marginBottom:20,
            background:"rgba(99,102,241,0.06)",borderColor:"rgba(99,102,241,0.2)"}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <span style={{fontSize:32}}>{insight.icon}</span>
              <div>
                <div style={{fontSize:15,fontWeight:700,marginBottom:3}}>
                  Performance Level: {avgScore>=80?"Excellent":avgScore>=65?"Good":avgScore>=50?"Developing":"Beginner"}
                </div>
                <div style={{fontSize:13,color:"var(--t2)"}}>{insight.text}</div>
              </div>
            </div>
          </div>

          <div className="g2" style={{marginBottom:20}}>
            {/* Score trend chart */}
            <div className="card">
              <div className="stit">📈 Score Trend (Last {chartData.length} Sessions)</div>
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{top:4,right:4,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                    <XAxis dataKey="name" tick={{fill:"#475569",fontSize:11}}/>
                    <YAxis domain={[0,100]} tick={{fill:"#475569",fontSize:11}}/>
                    <Tooltip contentStyle={{background:"#0f1520",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,fontSize:12}}/>
                    <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5}
                      dot={{r:4,fill:"#6366f1"}} activeDot={{r:6}}/>
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",
                  color:"var(--t3)",fontSize:13}}>Complete more sessions to see trend</div>
              )}
            </div>

            {/* Radar chart */}
            <div className="card">
              <div className="stit">🕸 Skill Radar Profile</div>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData} margin={{top:0,right:16,left:16,bottom:0}}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)"/>
                  <PolarAngleAxis dataKey="dim" tick={{fill:"#94a3b8",fontSize:11}}/>
                  <Radar dataKey="val" stroke="#6366f1" fill="#6366f1" fillOpacity={0.18} strokeWidth={2}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dimension bars */}
          <div className="g2">
            <div className="card">
              <div className="stit">📝 Content Analysis Scores</div>
              <ScoreBar icon="🎯" label="Semantic Relevance" val={dims.relevance||0} color="#6366f1"/>
              <ScoreBar icon="✍" label="Grammar Quality" val={dims.grammar||0} color="#06b6d4"/>
              <ScoreBar icon="🔑" label="Keyword Coverage" val={dims.keyword||0} color="#22c55e"/>
              <ScoreBar icon="📚" label="Vocabulary Richness" val={dims.vocabulary||0} color="#f59e0b"/>
              <div className="dvd"/>
              <div style={{fontSize:12,color:"var(--t3)"}}>
                NLP pipeline: BERT cosine similarity + TF-IDF keyword extraction + LanguageTool grammar
              </div>
            </div>

            <div className="card">
              <div className="stit">🔊 Voice Analysis Score</div>
              <ScoreBar icon="💪" label="Overall Confidence" val={dims.confidence||0} color="#ef4444"/>

              <div style={{padding:14,background:"var(--glass)",borderRadius:"var(--rs)",marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:8,color:"var(--t2)"}}>Ideal Ranges</div>
                {[
                  ["Speaking Rate","110–150 WPM"],
                  ["Answer Duration","45–90 seconds"],
                  ["Pitch Variation","Active, not monotone"],
                  ["Energy Level","Clear and audible"],
                ].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:12,
                    padding:"5px 0",borderBottom:"1px solid var(--glass)"}}>
                    <span style={{color:"var(--t3)"}}>{k}</span>
                    <span style={{color:"var(--ok)",fontWeight:600}}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="dvd"/>
              <div style={{fontSize:12,color:"var(--t3)"}}>
                Voice pipeline: Librosa MFCC extraction + SVM confidence classifier (35-dim feature vector)
              </div>
            </div>
          </div>

          {/* Sessions table */}
          {chartData.length > 0 && (
            <div className="card" style={{marginTop:20}}>
              <div className="stit">📋 Session History</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {sessions.map((s,i)=>{
                  const sc = s.total_score||0
                  const g = sc>=90?"A+":sc>=80?"A":sc>=70?"B":sc>=60?"C":sc>=50?"D":"F"
                  const gc = g.startsWith("A")?"var(--ok)":g==="B"?"#3b82f6":g==="C"?"var(--warn)":"var(--err)"
                  return (
                    <div key={s.session_id} style={{display:"flex",alignItems:"center",gap:12,
                      padding:"10px",background:"var(--glass)",borderRadius:"var(--rs)"}}>
                      <span style={{fontSize:14,fontWeight:800,color:gc,width:32}}>{g}</span>
                      <span style={{fontSize:13,color:"var(--t2)",flex:1}}>Session #{s.session_id}</span>
                      <span style={{fontSize:12,color:"var(--t3)"}}>
                        {new Date(s.start_time).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}
                      </span>
                      <span style={{fontSize:16,fontWeight:700,color:sc>=75?"var(--ok)":sc>=55?"#3b82f6":"var(--warn)"}}>
                        {sc.toFixed(1)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
