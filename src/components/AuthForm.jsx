import React, { useState } from 'react'
import axios from 'axios'
import { Card, CardHeader, CardContent, CardFooter } from './ui/card'
import { Input, Label } from './ui/input'
import { Button } from './ui/button'
import { useToast } from './ui/toast'

export default function AuthForm({ mode = 'login', onAuth }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

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
      if (onAuth) {
        const role = res.data?.user?.role || res.data?.type || null
        onAuth({ user: res.data?.user, token: res.data?.token, role })
      }
  setMessage({ type: 'success', text: `${submitLabel} successful` })
  try { toast.push({ title: 'Login Successful!', description: 'Welcome back', variant: 'default' }) } catch (e) {}
    } catch (err) {
  const text = err.response?.data?.message || err.message || 'Unknown error'
  setMessage({ type: 'error', text })
  try { toast.push({ title: 'Login Failed: Invalid credentials', description: text, variant: 'destructive' }) } catch (e) {}
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 420 }}>
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">{submitLabel}</h3>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {message && (
              <div className={`text-sm ${message.type === 'error' ? 'text-destructive' : 'text-green-600'}`}>
                {message.text}
              </div>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
              />
            </div>
          </CardContent>

          <CardFooter className="pt-0">
            <div className="flex items-center w-full py-2">
              <div className="flex-1" />
              <Button type="submit" size="sm" disabled={loading} className="ml-2">
                {loading ? 'Submitting...' : submitLabel}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
