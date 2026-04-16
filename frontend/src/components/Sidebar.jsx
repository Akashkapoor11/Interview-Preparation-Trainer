import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

const NAV = [
  { path: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { path: '/session', icon: '🎙', label: 'New Interview' },
  { path: '/history', icon: '📋', label: 'My Sessions' },
  { path: '/progress', icon: '📊', label: 'Analytics' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  return (
    <div className="sidebar">
      <div className="sbar-top">
        <div className="logo-row">
          <div className="logo-ic">🎯</div>
          <div>
            <div className="logo-t">Interview Trainer</div>
            <div className="logo-s">PSIT · AKTU 2026</div>
          </div>
        </div>
      </div>
      <div className="nav">
        {NAV.map(n => (
          <button key={n.path} className={"ni" + (loc.pathname===n.path?" on":"")}
            onClick={() => nav(n.path)}>
            <span style={{fontSize:16}}>{n.icon}</span> {n.label}
          </button>
        ))}
      </div>
      <div className="sbar-bot">
        <div className="ucard">
          <div className="uav">{user?.name?.[0]?.toUpperCase()||"U"}</div>
          <div style={{flex:1,minWidth:0}}>
            <div className="un" style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name}</div>
            <div className="ue">{user?.email?.split("@")[0]}</div>
          </div>
          <button onClick={logout} style={{background:"none",border:"none",cursor:"pointer",color:"var(--t3)",fontSize:16}} title="Logout">⏻</button>
        </div>
      </div>
    </div>
  )
}
