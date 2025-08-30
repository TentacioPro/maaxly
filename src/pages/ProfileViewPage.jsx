import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useToast } from '../components/ui/toast'
import { Card, CardContent } from '../components/ui/card'

export default function ProfileViewPage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const toast = useToast()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          setProfile(null)
          return
        }
        const res = await axios.get('/api/profile/me', { headers: { Authorization: `Bearer ${token}` } })
        if (cancelled) return
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
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="p-6">Loading profile...</div>
  // errors are surfaced via toasts; if profile failed to load, show fallback
  if (error) return <div className="p-6">Failed to load profile.</div>
  if (!profile) return <div className="p-6">No profile found.</div>

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-2">Profile</h2>
      <div className="text-sm text-muted-foreground">Role: {profile.role}</div>
      <Card className="mt-4">
        <CardContent className="p-4">
          <pre className="text-sm">{JSON.stringify(profile, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
