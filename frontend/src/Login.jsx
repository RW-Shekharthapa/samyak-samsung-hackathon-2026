import { useState } from 'react'
import { api } from './api'

export default function Login({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      onAuth(await api(`/auth/${mode === 'login' ? 'login' : 'register'}`, { method: 'POST', body: form }))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <main className="auth">
      <form className="card" onSubmit={submit}>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <p className="muted">{mode === 'login' ? 'Sign in to see your dashboard' : 'Sign up to get started'}</p>
        {mode === 'register' && (
          <label>Name<input value={form.name} onChange={set('name')} required autoComplete="name" /></label>
        )}
        <label>Email<input type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></label>
        <label>Password<input type="password" value={form.password} onChange={set('password')} required minLength={mode === 'register' ? 8 : undefined} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        {error && <div className="error" role="alert">{error}</div>}
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}</button>
        <p className="muted">
          {mode === 'login' ? 'No account? ' : 'Already registered? '}
          <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </form>
    </main>
  )
}
