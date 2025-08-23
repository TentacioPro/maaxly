import React, { useState } from 'react'
import axios from 'axios'

export default function AuthForm({ mode = 'login', onAuth }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login'
  const submitLabel = mode === 'signup' ? 'Sign Up' : 'Login'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    try {
      const res = await axios.post(endpoint, { email, password })
      if (res.data?.token) {
        localStorage.setItem('token', res.data.token)
        axios.defaults.headers.common.Authorization = `Bearer ${res.data.token}`
      }
      // If server returns user role or profile type, pass it upstream
      if (onAuth) {
        // prefer res.data.user.role, fallback to res.data.type (from profile/me) if available
        const role = res.data?.user?.role || res.data?.type || null
        onAuth({ user: res.data?.user, token: res.data?.token, role })
      }
      setMessage({ type: 'success', text: `${submitLabel} successful` })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} style={{ maxWidth: 420 }}>
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
        <button disabled={loading} type="submit">
          {submitLabel}
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
