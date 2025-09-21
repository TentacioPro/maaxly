import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { get } from '@/lib/api'
import { useToast } from './ui/toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card'
import DashboardKPI from './DashboardKPI'
import { Skeleton } from './ui/skeleton'
import useSSE from '@/hooks/useSSE'

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

  // SSE wiring: start when token present
  const sse = useMemo(() => useSSE({ onMessageCreated: null, onConversationCreated: null, onAck: null }), [])
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return
    sse.start()
    return () => sse.stop()
  }, [sse])

  // keep metrics live when application counts update elsewhere
  useEffect(() => {
    function onUpdate(e) {
      const { opportunityId, applicationsCount } = e.detail || {}
      if (!opportunityId) return
      const cid = String(opportunityId)
      setListings(prev => prev.map(o => ((String(o._id) === cid || String(o.id) === cid) ? { ...o, applicationsCount } : o)))
    }
    window.addEventListener('applicationsCountUpdated', onUpdate)
    return () => window.removeEventListener('applicationsCountUpdated', onUpdate)
  }, [])

  // react to backend-sent overview updates (finer-grained metrics)
  useEffect(() => {
    function onOverviewUpdate(e) {
      const payload = e.detail || {}
      setOverview(prev => ({ ...(prev || {}), ...(payload.overview || {}) }))
    }
    window.addEventListener('employerOverviewUpdated', onOverviewUpdate)
    return () => window.removeEventListener('employerOverviewUpdated', onOverviewUpdate)
  }, [])

  // derive basic local metrics & remote overview
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

  const [overview, setOverview] = useState(null)
  const [overviewError, setOverviewError] = useState(null)
  const [overviewLoading, setOverviewLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadOverview() {
      setOverviewLoading(true)
      setOverviewError(null)
      try {
        const data = await get('/analytics/employer/overview')
        if (cancelled) return
        setOverview(data)
      } catch (e) {
        if (cancelled) return
        setOverviewError(e.message)
      } finally {
        if (!cancelled) setOverviewLoading(false)
      }
    }
    loadOverview()
    return () => { cancelled = true }
  }, [])

  // Quick Create removed

  return (
    <div className="px-4 py-6 space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Employer Dashboard</h2>
        <p className="text-muted-foreground text-sm">Welcome, {profile?.fullName || 'Employer'}</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} compact className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-2 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <DashboardKPI label="Total Listings" value={metrics.totalListings} accent="primary" />
            <DashboardKPI label="Total Applicants" value={overview?.applicants ?? metrics.totalApplicants} accent="accent" />
            <Card compact className="overflow-hidden">
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
            <DashboardKPI label="Views (30d)" value={overview?.views ?? '—'} accent="secondary" />
          </>
        )}
      </div>

      {/* Performance Overview Placeholder */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Performance Overview (Preview)</CardTitle>
          <CardDescription>Deeper analytics & charts coming soon</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          {overviewLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-3 w-32" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-2 w-full" />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="space-y-3">
                <div className="text-xs uppercase text-muted-foreground tracking-wide">Conversion Funnel</div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><span className="w-16 shrink-0">Views</span><div className="flex-1 h-2 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: overview?.funnel?.viewsPct ? `${overview.funnel.viewsPct}%` : '80%' }} /></div><span className="w-10 text-right text-foreground">{overview?.funnel?.viewsPct ?? 80}%</span></div>
                  <div className="flex items-center gap-2"><span className="w-16 shrink-0">Clicks</span><div className="flex-1 h-2 rounded bg-muted overflow-hidden"><div className="h-full bg-primary/80" style={{ width: overview?.funnel?.clicksPct ? `${overview.funnel.clicksPct}%` : '52%' }} /></div><span className="w-10 text-right text-foreground">{overview?.funnel?.clicksPct ?? 52}%</span></div>
                  <div className="flex items-center gap-2"><span className="w-16 shrink-0">Applies</span><div className="flex-1 h-2 rounded bg-muted overflow-hidden"><div className="h-full bg-primary/60" style={{ width: overview?.funnel?.appliesPct ? `${overview.funnel.appliesPct}%` : '18%' }} /></div><span className="w-10 text-right text-foreground">{overview?.funnel?.appliesPct ?? 18}%</span></div>
                  <div className="text-[10px]">Real data bound when available.</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-xs uppercase text-muted-foreground tracking-wide">Top Roles (Mock)</div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between"><span>Frontend Intern</span><span className="text-muted-foreground">34 views</span></div>
                  <div className="flex justify-between"><span>Data Analyst</span><span className="text-muted-foreground">27 views</span></div>
                  <div className="flex justify-between"><span>Marketing Associate</span><span className="text-muted-foreground">19 views</span></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-xs uppercase text-muted-foreground tracking-wide">Engagement Notes</div>
                <ul className="text-xs list-disc pl-4 space-y-1 text-muted-foreground">
                  <li>Listings with detailed responsibilities get ~15% more applies.</li>
                  <li>Add a company culture blurb to improve conversion.</li>
                  <li>Peak student activity: 7–9 PM local time.</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter>
          <button disabled className="text-xs text-muted-foreground hover:text-foreground transition">Open Full Analytics (Soon)</button>
        </CardFooter>
      </Card>

      {/* Applicants Snapshot & Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Applicants Snapshot (Mock)</CardTitle>
            <CardDescription className="text-xs">Recent applicants across listings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {loading && <div className="text-muted-foreground">Loading...</div>}
            {!loading && listings.slice(0,5).map(l => (
              <div key={l._id} className="flex items-center justify-between rounded border bg-card px-2 py-1">
                <div className="truncate max-w-[140px]">{l.title}</div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">{l.applicationsCount || 0}</span>
                  <span className="text-muted-foreground text-[10px]">apps</span>
                </div>
              </div>
            ))}
            {!loading && listings.length === 0 && <div className="text-muted-foreground">No listings yet.</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Activity (Mock)</CardTitle>
            <CardDescription className="text-xs">High-level signals</CardDescription>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <ul className="space-y-1 list-disc pl-4 text-muted-foreground">
              <li>{Math.floor(Math.random()*5)+2} new applicants in last 24h</li>
              <li>Top region: West Coast (32%)</li>
              <li>Skill trend: React appearing in 48% of resumes</li>
              <li>Best performing listing: {listings[0]?.title || '—'}</li>
            </ul>
            <div className="text-[10px] text-muted-foreground">Real-time event stream planned.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
