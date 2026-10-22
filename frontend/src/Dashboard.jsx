import { useEffect, useState } from 'react'
import { api } from './api'

const fmt = (d) => new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' })

export default function Dashboard({ session, onLogout }) {
  const { token, user } = session
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/dashboard', { token })
      .then(setData)
      .catch((e) => (e.status === 401 ? onLogout() : setError(e.message)))
  }, [token, onLogout])

  return (
    <div className="dash">
      <header>
        <strong>Dashboard</strong>
        <span>{user.email} <button className="link" onClick={onLogout}>Log out</button></span>
      </header>
      <main>
        <h1>Hello, {user.name} 👋</h1>
        {error && <div className="error" role="alert">{error}</div>}
        {!data && !error && <p className="muted">Loading…</p>}
        {data && (
          <>
            <div className="stats">
              <div className="card"><span className="muted">Total users</span><b>{data.totalUsers}</b></div>
              <div className="card"><span className="muted">Member since</span><b>{fmt(data.memberSince)}</b></div>
            </div>
            <div className="card">
              <h2>Newest members</h2>
              {data.recentUsers.length === 0 ? <p className="muted">No members yet.</p> : (
                <ul>{data.recentUsers.map((u, i) => <li key={i}>{u.name}<span className="muted">{fmt(u.createdAt)}</span></li>)}</ul>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
