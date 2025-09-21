import React, { useEffect, useState, useId } from 'react'
import axios from 'axios'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card'
import DashboardKPI from '../components/DashboardKPI'
import { AreaChart, Area, XAxis, YAxis, Tooltip as ReTooltip, BarChart, Bar, Cell } from 'recharts'
import ChartContainer, { ChartTooltipContent } from '../components/ui/chart'
import { seriesToLineData, seriesToRoleData } from '../lib/chart-utils'

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [visitsSeries, setVisitsSeries] = useState([])
  const [topPages, setTopPages] = useState([])
  const [topReferrers, setTopReferrers] = useState([])
  const [days, setDays] = useState(30)
  const [users, setUsers] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const token = localStorage.getItem('token')
      if (!token) { setLoading(false); return }
      setLoading(true)
      setError(null)
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [statsRes, usersRes, visitsRes, topRes] = await Promise.all([
          axios.get('/api/admin/stats', { headers }),
          axios.get('/api/admin/users', { headers }),
          axios.get('/api/admin/analytics/visits', { headers, params: { days } }),
          axios.get('/api/admin/analytics/top', { headers, params: { days } })
        ])
        if (cancelled) return
        setStats(statsRes.data.stats || null)
        setUsers(usersRes.data.users || [])
        setVisitsSeries(visitsRes.data.series || [])
        setTopPages(topRes.data.topPages || [])
        setTopReferrers(topRes.data.topReferrers || [])
      } catch (e) {
        if (cancelled) return
        setError(e.response?.data?.message || e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [days])

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Full admin visibility (detailed)</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button
            className="px-2 py-1 rounded border bg-background hover:bg-muted transition"
            onClick={() => setDays(7)}
            disabled={days === 7}
          >7d</button>
          <button
            className="px-2 py-1 rounded border bg-background hover:bg-muted transition"
            onClick={() => setDays(30)}
            disabled={days === 30}
          >30d</button>
          <button
            className="px-2 py-1 rounded border bg-background hover:bg-muted transition"
            onClick={() => setDays(90)}
            disabled={days === 90}
          >90d</button>
        </div>
      </header>

      {loading && <div className="text-sm text-muted-foreground">Loading analytics...</div>}
      {error && <div className="text-sm text-destructive">Failed: {error}</div>}

      {!loading && !error && (
        <>
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <DashboardKPI label="Total users" value={stats.totalUsers} accent="primary" />
              <DashboardKPI label="Students" value={stats.totalStudents} accent="accent" />
              <DashboardKPI label="Employers" value={stats.totalEmployers} accent="secondary" />
              <DashboardKPI label="Opportunities" value={stats.totalOpportunities} accent="primary" />
              {stats.visitsByRole && (
                <Card>
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground">Visits (7d)</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      guest: <strong>{stats.visitsByRole.guest || 0}</strong>, student: <strong>{stats.visitsByRole.student || 0}</strong>, employer: <strong>{stats.visitsByRole.employer || 0}</strong>, admin: <strong>{stats.visitsByRole.admin || 0}</strong>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <section className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Visits Over Time</CardTitle>
                <CardDescription>Total traffic trend</CardDescription>
              </CardHeader>
              <CardContent>
                <TotalsLine series={visitsSeries} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Visits By Role</CardTitle>
                <CardDescription>Distribution snapshot</CardDescription>
              </CardHeader>
              <CardContent>
                <RoleBars series={visitsSeries} />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Top Pages ({days}d)</CardTitle>
                <CardDescription>Most visited paths</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                {(topPages||[]).map(p => (
                  <div key={p._id} className="flex justify-between"><span className="truncate max-w-[70%]" title={p._id}>{p._id}</span><span>{p.count}</span></div>
                ))}
                {(!topPages || !topPages.length) && <div className="text-muted-foreground">No data.</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Top Referrers ({days}d)</CardTitle>
                <CardDescription>Inbound sources</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                {(topReferrers||[]).map(r => (
                  <div key={r._id} className="flex justify-between"><span className="truncate max-w-[70%]" title={r._id}>{r._id}</span><span>{r.count}</span></div>
                ))}
                {(!topReferrers || !topReferrers.length) && <div className="text-muted-foreground">No data.</div>}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Users</CardTitle>
                <CardDescription>Basic directory (admin scope)</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-muted-foreground border-b">
                      <th className="text-left font-medium p-2">Email</th>
                      <th className="text-left font-medium p-2">Role</th>
                      <th className="text-left font-medium p-2">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id} className="border-b last:border-0">
                        <td className="p-2">{u.email}</td>
                        <td className="p-2">{u.role || '—'}</td>
                        <td className="p-2 font-mono text-[10px]">{u._id}</td>
                      </tr>
                    ))}
                    {!users.length && (
                      <tr><td className="p-4" colSpan={3}>No users found.</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}

function TotalsLine({ series }) {
  const data = seriesToLineData(series)
  const config = { value: { label: 'Visits', color: 'var(--primary)' } }
  const gid = useId().replace(/:/g,'')
  return (
    <ChartContainer config={config} className="h-32">
      <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 6 }}>
        <defs>
          <linearGradient id={`grad-${gid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.30} />
            <stop offset="70%" stopColor="var(--primary)" stopOpacity={0.08} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="name" hide />
        <YAxis hide />
        <ReTooltip wrapperClassName="recharts-theme-tooltip" content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--primary)"
          strokeWidth={2}
          fill={`url(#grad-${gid})`}
          isAnimationActive
          animationDuration={500}
          animationEasing="ease-in-out"
          connectNulls
        />
      </AreaChart>
    </ChartContainer>
  )
}

function RoleBars({ series }) {
  const rows = seriesToRoleData(series)
  const semanticPalette = ['var(--primary)', 'var(--accent)', 'var(--secondary)', 'var(--destructive)', 'var(--muted-foreground)']
  const config = Object.fromEntries(rows.map((r, i) => [`${r.label}`, { label: r.label, color: semanticPalette[i % semanticPalette.length] }]))
  return (
    <ChartContainer config={config} className="h-40">
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <XAxis dataKey="label" hide />
        <YAxis hide />
        <ReTooltip wrapperClassName="recharts-theme-tooltip" content={<ChartTooltipContent />} />
        <Bar dataKey="value" isAnimationActive animationDuration={500} animationEasing="ease-in-out">
          {rows.map((r, i) => (
            <Cell key={r.label} fill={semanticPalette[i % semanticPalette.length]} className="transition-all duration-300" />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
