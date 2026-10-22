import { useCallback, useState } from 'react'
import Login from './Login'
import Dashboard from './Dashboard'
import './App.css'

const KEY = 'session'

function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(KEY)) } catch { return null }
  })

  const onAuth = (s) => { sessionStorage.setItem(KEY, JSON.stringify(s)); setSession(s) }
  const onLogout = useCallback(() => { sessionStorage.removeItem(KEY); setSession(null) }, [])

  return session ? <Dashboard session={session} onLogout={onLogout} /> : <Login onAuth={onAuth} />
}

export default App
