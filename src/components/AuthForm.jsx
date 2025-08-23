import React, { useState } from 'react'
import axios from 'axios'

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    try {
  const res = await axios.post('/api/auth/signup', { email, password })
  // store token for later authenticated requests
  if (res.data?.token) localStorage.setItem('token', res.data.token)
  setMessage({ type: 'success', text: 'Signed up: ' + (res.data.user?.email || '') })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    try {
  const res = await axios.post('/api/auth/login', { email, password })
  // store token for later authenticated requests
  if (res.data?.token) localStorage.setItem('token', res.data.token)
  setMessage({ type: 'success', text: 'Logged in: ' + (res.data.user?.email || '') })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={(e) => e.preventDefault()} style={{ maxWidth: 420 }}>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 14 }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          style={{ width: '100%', padding: 8 }}
        />
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 14 }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          style={{ width: '100%', padding: 8 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={handleSignup} disabled={loading} type="button">
          Sign Up
        </button>
        <button onClick={handleLogin} disabled={loading} type="button">
          Login
        </button>
      </div>

      {message && (
        <div style={{ marginTop: 12, color: message.type === 'error' ? 'crimson' : 'green' }}>
          {message.text}
        </div>
      )}
    </form>
  )
}
