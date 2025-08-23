import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Navigate } from 'react-router-dom'
import StudentDashboard from '../components/StudentDashboard'
import EmployerDashboard from '../components/EmployerDashboard'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setError('unauthenticated')
      setLoading(false)
      return
    }

    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await axios.get('/api/profile/me', { headers: { Authorization: `Bearer ${token}` } })
        if (cancelled) return
        setProfile(res.data.profile)
      } catch (err) {
        if (cancelled) return
        setError(err.response?.data?.message || err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (error === 'unauthenticated') return <Navigate to="/" replace />

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div className="spinner" aria-label="loading">Loading...</div>
    </div>
  )

  if (!profile) return <div style={{ padding: 24 }}>No profile found.</div>

  if (profile.role === 'student') return <StudentDashboard profile={profile} />
  if (profile.role === 'employer') return <EmployerDashboard profile={profile} />

  return <div style={{ padding: 24 }}>Unknown profile role.</div>
}
