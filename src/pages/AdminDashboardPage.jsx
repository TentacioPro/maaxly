import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card'
import MetricCard from '../components/MetricCard'
import StatGrid from '../components/StatGrid'
import { Button } from '../components/ui/button'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const token = localStorage.getItem('token')
      if (!token) { setLoading(false); return }
      setLoading(true)
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const res = await axios.get('/api/admin/stats', { headers })
        if (cancelled) return
        setStats(res.data.stats || null)
        // synthesize recent activity placeholders
        setRecent([
          { ts: Date.now() - 1000 * 60 * 3, type: 'user_signup', detail: 'New student registered' },
          { ts: Date.now() - 1000 * 60 * 15, type: 'listing_created', detail: 'Employer posted opportunity' },
          { ts: Date.now() - 1000 * 60 * 42, type: 'application_submitted', detail: 'Application submitted' }
        ])
      } catch (e) {
        if (cancelled) return
        setError(e.response?.data?.message || e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function handleRefresh() {
    const token = localStorage.getItem('token')
    if (!token) return
    setRefreshing(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const res = await axios.get('/api/admin/stats', { headers })
      setStats(res.data.stats || stats)
    } finally {
      setRefreshing(false)
    }
  }

  const kpis = useMemo(() => ([
    { label: 'Total Users', value: stats?.totalUsers ?? '—', hint: 'All accounts' },
    { label: 'Students', value: stats?.totalStudents ?? '—', hint: 'Student profiles' },
    { label: 'Employers', value: stats?.totalEmployers ?? '—', hint: 'Employer orgs' },
    { label: 'Opportunities', value: stats?.totalOpportunities ?? '—', hint: 'Active listings' },
    { label: 'Active (24h)', value: stats?.activeUsers24h ?? '—', hint: 'Recent activity' }
  ]), [stats])

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Overview</h1>
          <p className="text-sm text-muted-foreground">Platform health & activity snapshot</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing || loading}>{refreshing ? 'Refreshing...' : 'Refresh'}</Button>
      </header>

      {loading && <div className="text-sm text-muted-foreground">Loading admin stats...</div>}
      {error && <div className="text-sm text-destructive">Failed: {error}</div>}

      {!loading && !error && (
        <>
          <section className="space-y-4">
            <h2 className="text-lg font-medium tracking-tight">Core Metrics</h2>
            <StatGrid>
              {kpis.map(k => <MetricCard key={k.label} label={k.label} value={k.value} hint={k.hint} />)}
            </StatGrid>
          </section>

            <section className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Illustrative events (placeholder)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {recent.map(r => (
                  <div key={r.ts} className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <div className="font-medium capitalize">{r.type.replace(/_/g,' ')}</div>
                      <div className="text-xs text-muted-foreground">{r.detail}</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground whitespace-nowrap">{Math.round((Date.now()-r.ts)/60000)}m ago</div>
                  </div>
                ))}
                {!recent.length && <div className="text-xs text-muted-foreground">No activity yet.</div>}
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="outline" disabled>Open Audit Log (Soon)</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">System Health</CardTitle>
                <CardDescription>Infrastructure heuristics (placeholder)</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">API Latency (p95)</span>
                  <span className="font-medium">{stats?.apiLatencyP95 ?? '—'} ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Error Rate (24h)</span>
                  <span className="font-medium">{stats?.errorRate24h != null ? `${(stats.errorRate24h*100).toFixed(2)}%` : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Queue Lag</span>
                  <span className="font-medium">{stats?.queueLagSeconds != null ? `${stats.queueLagSeconds}s` : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active Workers</span>
                  <span className="font-medium">{stats?.activeWorkers ?? '—'}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="outline" disabled>Open Monitoring (Soon)</Button>
              </CardFooter>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
