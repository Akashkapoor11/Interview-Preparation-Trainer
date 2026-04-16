import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../components/AuthContext"

export default function Login() {
  const [tab, setTab] = useState("login")
  const [form, setForm] = useState({ name:"", email:"", password:"" })
  const [err, setErr] = useState("")
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const nav = useNavigate()

  const handle = async (e) => {
    e.preventDefault()
    setErr(""); setLoading(true)
    try {
      if (tab === "login") await login(form.email, form.password)
      else {
        if (!form.name.trim()) { setErr("Name is required"); setLoading(false); return }
        await register(form.name, form.email, form.password)
      }
      nav("/dashboard")
    } catch(ex) {
      setErr(ex.response?.data?.error || "Something went wrong.")
    } finally { setLoading(false) }
  }

  return (
    <div className="auth-pg">
      <div className="auth-c">
        <div className="auth-logo">
          <div style={{fontSize:48,marginBottom:10}}>🎯</div>
          <div style={{fontSize:22,fontWeight:800,marginBottom:6}}>Interview Preparation Trainer</div>
          <div style={{fontSize:12,color:"var(--t3)"}}>ML &amp; Voice Interpretation · PSIT Kanpur · AKTU 2026</div>
        </div>

        <div className="tabs">
          <button className={"tab"+(tab==="login"?" on":"")} onClick={()=>{setTab("login");setErr("")}}>Sign In</button>
          <button className={"tab"+(tab==="register"?" on":"")} onClick={()=>{setTab("register");setErr("")}}>Register</button>
        </div>

        {err && <div className="alert alert-err">{err}</div>}

        <form onSubmit={handle}>
          {tab==="register" && (
            <div className="ig">
              <label>Full Name</label>
              <input placeholder="Your full name" value={form.name}
                onChange={e=>setForm({...form,name:e.target.value})} required />
            </div>
          )}
          <div className="ig">
            <label>Email Address</label>
            <input type="email" placeholder="you@example.com" value={form.email}
              onChange={e=>setForm({...form,email:e.target.value})} required />
          </div>
          <div className="ig">
            <label>Password</label>
            <input type="password" placeholder={tab==="register"?"Min 6 characters":"Your password"}
              value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required />
          </div>
          <button className="btn bp blg" style={{width:"100%",marginTop:8}} disabled={loading}>
            {loading ? "Please wait…" : tab==="login" ? "Sign In →" : "Create Account →"}
          </button>
        </form>

        <div style={{marginTop:20,padding:"14px",background:"var(--glass)",borderRadius:"var(--rs)",fontSize:12,color:"var(--t3)"}}>
          <strong style={{color:"var(--t2)"}}>Quick Demo:</strong> Register with any email and password to start practicing.
        </div>
      </div>
    </div>
  )
}
