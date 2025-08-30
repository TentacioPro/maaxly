import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Navigate, useLocation } from 'react-router-dom'
import StudentDashboard from '../components/StudentDashboard'
import EmployerDashboard from '../components/EmployerDashboard'
import { useToast } from '../components/ui/toast'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const toast = useToast()
  const location = useLocation()

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      // unauthenticated — redirect to home
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
  // server returns { success: true, profile, type }
  const profileObj = res.data.profile || {}
  if (res?.data?.type) profileObj.role = res.data.type
  setProfile(profileObj)
      } catch (err) {
        if (cancelled) return
        const msg = err.response?.data?.message || err.message
        toast.push({ title: 'Load failed', description: msg, variant: 'destructive' })
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
  if (profile.role === 'employer') return <EmployerDashboard profile={profile} fromCreate={location.state?.fromCreate} />
  if (profile.role === 'admin') return <Navigate to="/admin" replace />

  return <div style={{ padding: 24 }}>Unknown profile role.</div>
}
