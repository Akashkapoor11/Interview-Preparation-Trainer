import React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./components/AuthContext"
import Sidebar from "./components/Sidebar"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Session from "./pages/Session"
import History from "./pages/History"
import Progress from "./pages/Progress"

function Layout({ children }) {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main">{children}</div>
    </div>
  )
}

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="loading-screen">
      <div style={{fontSize:40}}>🎯</div>
      <div style={{color:"var(--t2)",fontSize:14}}>Loading Interview Trainer…</div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Protected><Layout><Dashboard /></Layout></Protected>} />
          <Route path="/session" element={<Protected><Layout><Session /></Layout></Protected>} />
          <Route path="/history" element={<Protected><Layout><History /></Layout></Protected>} />
          <Route path="/progress" element={<Protected><Layout><Progress /></Layout></Protected>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
