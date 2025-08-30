import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useToast } from './ui/toast'
import { Card, CardContent } from './ui/card'

export default function EmployerDashboard({ profile, fromCreate }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const toast = useToast()

  async function load() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/opportunities/my', { headers: { Authorization: `Bearer ${token}` } })
      setListings(res.data.opportunities || [])
  // clear any previous local error state
  setError(null)
    } catch (err) {
  const msg = err.response?.data?.message || err.message
  toast.push({ title: 'Load failed', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // re-load when coming back from create page
  }, [fromCreate])

  // keep metrics live when application counts update elsewhere
  useEffect(() => {
    function onUpdate(e) {
      const { opportunityId, applicationsCount } = e.detail || {}
      if (!opportunityId) return
      setListings(prev => prev.map(o => ((o._id === opportunityId || o.id === opportunityId) ? { ...o, applicationsCount } : o)))
    }
    window.addEventListener('applicationsCountUpdated', onUpdate)
    return () => window.removeEventListener('applicationsCountUpdated', onUpdate)
  }, [])

  // derive basic metrics from accessible data
  const metrics = useMemo(() => {
    const totalListings = listings.length
    const totalApplicants = listings.reduce((sum, o) => sum + (o.applicationsCount || 0), 0)
    const byType = listings.reduce((acc, o) => {
      const t = (o.type || 'other').toLowerCase()
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})
    const lastCreatedAt = listings.reduce((max, o) => {
      const d = o.createdAt ? new Date(o.createdAt).getTime() : 0
      return Math.max(max, d)
    }, 0)
    return { totalListings, totalApplicants, byType, lastCreatedAt }
  }, [listings])

  // Quick Create removed

  return (
    <div className="px-4 py-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Employer Dashboard</h2>
        <p className="text-muted-foreground">Welcome, {profile?.fullName || 'Employer'}</p>
      </div>

      {/* Metrics only (no listings/search/refresh) */}
      {loading && <div>Loading metrics...</div>}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Total Listings</div>
              <div className="text-2xl font-semibold">{metrics.totalListings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Total Applicants</div>
              <div className="text-2xl font-semibold">{metrics.totalApplicants}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">By Type</div>
              <div className="text-sm text-foreground mt-1 space-y-1">
                {Object.keys(metrics.byType).length === 0 && <div className="text-muted-foreground">—</div>}
                {Object.entries(metrics.byType).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between"><span className="capitalize">{k}</span><span className="font-medium">{v}</span></div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Last Posting</div>
              <div className="text-sm">{metrics.lastCreatedAt ? new Date(metrics.lastCreatedAt).toLocaleDateString() : '—'}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
