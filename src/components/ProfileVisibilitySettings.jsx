import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useMessaging } from '@/providers/MessagingProvider'
import { useProfile } from '@/providers/ProfileProvider'
import { useToast } from '@/components/ui/toast'

export default function ProfileVisibilitySettings() {
  const { currentUser } = useMessaging()
  const { invalidate } = useProfile()
  const userId = currentUser ? (currentUser._id || currentUser.id) : null
  const [visibility, setVisibility] = useState({
    displayName: true,
    fullName: false,
    email: false,
    title: false,
    bio: false,
    avatarUrl: true,
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const toast = useToast()

  useEffect(() => {
    let mounted = true
    if (!userId) return
    setLoading(true)
    axios.get('/api/profile/me', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => {
        if (!mounted) return
        const vis = (res.data && res.data.profile && res.data.profile.visibility) ? res.data.profile.visibility : null
        if (vis) setVisibility(v => ({ ...v, ...vis }))
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [userId])

  function toggleKey(key) {
    setVisibility(v => ({ ...v, [key]: !v[key] }))
  }

  async function save() {
    if (!userId) return
    setSaving(true)
    setError(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await axios.patch('/api/profile', { visibility }, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      invalidate(userId)
      toast.push({ title: 'Saved', description: 'Visibility settings updated.' })
      return res.data
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save settings')
      toast.push({ title: 'Save failed', description: e?.response?.data?.message || 'Failed to save settings', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function refetch() {
    if (!userId) return
    setLoading(true)
    try {
      const res = await axios.get('/api/profile/me', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      const vis = (res.data && res.data.profile && res.data.profile.visibility) ? res.data.profile.visibility : null
      if (vis) setVisibility(v => ({ ...v, ...vis }))
    } catch (e) {
      // ignore
    } finally { setLoading(false) }
  }

  return (
    <div className="p-4 bg-background border border-border rounded-md w-full max-w-lg">
      <h3 className="text-lg font-semibold mb-3">Profile Visibility</h3>
      {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : (
        <div className="space-y-3">
          {Object.keys(visibility).map(key => (
            <div key={key} className="flex items-center justify-between">
              <div className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
              <label className="inline-flex items-center space-x-2">
                <input type="checkbox" checked={!!visibility[key]} onChange={() => toggleKey(key)} />
              </label>
            </div>
          ))}
          {error ? <div className="text-sm text-destructive">{error}</div> : null}
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving} className="px-3 py-1 bg-primary text-white rounded">{saving ? 'Saving...' : 'Save'}</button>
            <button onClick={refetch} disabled={loading} className="px-3 py-1 border rounded">Cancel</button>
          </div>
          <div className="text-xs text-muted-foreground">Note: Only fields you enable here will be visible to other users in chat overlays.</div>
        </div>
      )}
    </div>
  )
}
