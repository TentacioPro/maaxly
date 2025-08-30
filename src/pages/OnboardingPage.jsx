import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate, useLocation } from 'react-router-dom'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)

  const sendRole = async (role) => {
    if (loading) return
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Missing auth token; please log in again')
        return
      }

      // parse userId from JWT payload (no verification, client-side only)
      const parseJwt = (t) => {
        try {
          const base64Url = t.split('.')[1]
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
          return JSON.parse(jsonPayload)
        } catch (e) {
          return null
        }
      }

      const payload = parseJwt(token)
      const userId = payload?.sub
      if (!userId) {
        alert('userId not available in token')
        return
      }

      axios.defaults.headers.common.Authorization = `Bearer ${token}`
      const res = await axios.post('/api/onboarding/role', { userId, role }, { headers: { Authorization: `Bearer ${token}` } })
      if (res.data?.redirect) {
        navigate(res.data.redirect)
      } else {
        // Fallback to local routing if server doesn't provide redirect
        if (role === 'student') navigate('/create-profile/student')
        else if (role === 'employer') navigate('/create-profile/employer')
        else navigate('/dashboard')
      }
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  // If the route was visited with an autoRole in state, trigger it once on mount
  useEffect(() => {
    const auto = location?.state?.autoRole
    if (auto) {
      sendRole(auto)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="h-full w-full grid place-items-center px-4">
      <div className="w-full max-w-[96vw] sm:max-w-[640px] grid gap-4 sm:gap-6 place-items-center">
      <button onClick={() => sendRole('student')} disabled={loading} style={{ padding: '40px 80px', fontSize: 20 }}>{loading ? 'Processing...' : 'I am a Student'}</button>
      <button onClick={() => sendRole('employer')} disabled={loading} style={{ padding: '40px 80px', fontSize: 20 }}>{loading ? 'Processing...' : 'I am an Employer'}</button>
      </div>
    </div>
  )
}
