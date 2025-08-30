import React, { useState } from 'react'
import axios from 'axios'
import { Input, Label } from './ui/input'
import { Button } from './ui/button'
import { Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginForm({ onAuth }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post('/api/auth/login', { email, password })
      if (res?.data?.token) {
        localStorage.setItem('token', res.data.token)
        axios.defaults.headers.common.Authorization = `Bearer ${res.data.token}`
        const role = res?.data?.user?.role || res?.data?.type || null
        if (role) localStorage.setItem('role', role)
        try { window.dispatchEvent(new Event('auth-change')) } catch (_) {}
        if (onAuth) onAuth({ user: res?.data?.user, token: res?.data?.token, role })
      } else {
        setError('Invalid response from server')
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 text-foreground">
      {error && <div className="text-sm text-destructive">{error}</div>}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-1 text-right">
          <Link to="/forgot-password" className="text-muted-foreground text-sm font-medium hover:text-foreground">
            Forgot password?
          </Link>
        </div>
      </div>

      <Button className="mt-2" type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </Button>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card text-muted-foreground px-2">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Button variant="outline" type="button" disabled={loading}>
          {/* Google Icon (placeholder) */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.3 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.4 16.3 18.8 14 24 14c3 0 5.7 1.1 7.8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.1 4 9.2 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.3 36 26.8 37 24 37c-5.2 0-9.6-3.3-11.3-7.8l-6.6 5.1C9 40 16 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.3 4-5 7-9.3 7-5.2 0-9.6-3.3-11.3-7.8l-6.6 5.1C9 40 16 44 24 44c8.6 0 15.8-5.7 18.6-14.1.7-2 .9-4.1.9-6.4 0-1.3-.1-2.7-.4-3.5z"/></svg>
          Continue with Google
        </Button>
      </div>
    </form>
  )
}
