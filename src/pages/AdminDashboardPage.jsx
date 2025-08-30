import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useToast } from '../components/ui/toast'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'

  export default function AdminDashboardPage() {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [visitsSeries, setVisitsSeries] = useState([])
  const [topPages, setTopPages] = useState([])
  const [topReferrers, setTopReferrers] = useState([])
  const [engagement, setEngagement] = useState(null)
  const [days, setDays] = useState(30)
    const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const toast = useToast()

    useEffect(() => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) {
        toast.push({ title: 'Missing token', description: 'You must be logged in', variant: 'destructive' })
        setLoading(false)
        return
      }

      let cancelled = false

      async function load() {
        setLoading(true)
        setError(null)

        try {
          const headers = token ? { Authorization: `Bearer ${token}` } : undefined

          // fetch stats and users in parallel
          const [statsRes, usersRes, visitsRes, topRes, engRes] = await Promise.all([
            axios.get('/api/admin/stats', { headers }),
            axios.get('/api/admin/users', { headers }),
            axios.get('/api/admin/analytics/visits', { headers, params: { days } }),
            axios.get('/api/admin/analytics/top', { headers, params: { days } }),
            axios.get('/api/admin/analytics/engagement', { headers })
          ])

          if (cancelled) return
          setStats(statsRes.data.stats || null)
          setUsers(usersRes.data.users || [])
          setVisitsSeries(visitsRes.data.series || [])
          setTopPages(topRes.data.topPages || [])
          setTopReferrers(topRes.data.topReferrers || [])
          setEngagement(engRes.data.engagement || null)
        } catch (err) {
          if (cancelled) return
          const msg = err.response?.data?.message || err.message
          if (err.response?.status === 401) toast.push({ title: 'Missing token', description: 'Missing or invalid token', variant: 'destructive' })
          else if (err.response?.status === 403) toast.push({ title: 'Access denied', description: 'Admin only', variant: 'destructive' })
          else toast.push({ title: 'Load failed', description: msg, variant: 'destructive' })
        } finally {
          if (!cancelled) setLoading(false)
        }
      }

      load()
      return () => { cancelled = true }
    }, [days])

    return (
      <div style={{ padding: 24 }}>
        <h2>Admin Dashboard</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <label htmlFor="days">Window:</label>
          <div style={{ minWidth: 140 }}>
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger id="days" className="h-9 w-full"><SelectValue placeholder="Range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading && <div>Loading users...</div>}
        {error && <div style={{ color: 'crimson' }}>{error}</div>}

        {!loading && !error && (
          <div>
            {/* Stat cards */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                <div className="bg-card text-card-foreground border rounded-md p-3">
                  <div className="text-xs text-muted-foreground">Total users</div>
                  <div className="text-2xl font-semibold">{stats.totalUsers}</div>
                </div>
                <div className="bg-card text-card-foreground border rounded-md p-3">
                  <div className="text-xs text-muted-foreground">Students</div>
                  <div className="text-2xl font-semibold">{stats.totalStudents}</div>
                </div>
                <div className="bg-card text-card-foreground border rounded-md p-3">
                  <div className="text-xs text-muted-foreground">Employers</div>
                  <div className="text-2xl font-semibold">{stats.totalEmployers}</div>
                </div>
                <div className="bg-card text-card-foreground border rounded-md p-3">
                  <div className="text-xs text-muted-foreground">Opportunities</div>
                  <div className="text-2xl font-semibold">{stats.totalOpportunities}</div>
                </div>
                {stats.visitsByRole && (
                  <div className="bg-card text-card-foreground border rounded-md p-3">
                    <div className="text-xs text-muted-foreground">Visits (7d)</div>
                    <div className="text-xs text-muted-foreground">
                      guest: <strong>{stats.visitsByRole.guest || 0}</strong>, student: <strong>{stats.visitsByRole.student || 0}</strong>, employer: <strong>{stats.visitsByRole.employer || 0}</strong>, admin: <strong>{stats.visitsByRole.admin || 0}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Time series (simple inline chart using ASCII bars for now; can swap to a chart lib) */}
            <div style={{ margin: '12px 0', padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Visits over time (by role)</div>
              <SeriesView series={visitsSeries} />
            </div>

            {/* Top pages & referrers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <SimpleTable title={`Top pages (${days}d)`} rows={topPages} colA="_id" colB="count" />
              <SimpleTable title={`Top referrers (${days}d)`} rows={topReferrers} colA="_id" colB="count" />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Email</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Role / Flags</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>(_id)</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{u.email}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>
                        {u.role || '—'}
                        <span style={{ color: '#888', marginLeft: 6, fontSize: 12 }}>
                          {u.isStudent ? ' isStudent' : ''}
                          {u.isEmployer ? ' isEmployer' : ''}
                          {u.isAdmin ? ' isAdmin' : ''}
                        </span>
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2', fontFamily: 'monospace', fontSize: 12 }}>{u._id}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: 12 }}>No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

function SimpleTable({ title, rows, colA, colB }) {
  return (
    <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{title}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {(rows || []).map((r, i) => (
            <tr key={i}>
              <td style={{ padding: 6, borderBottom: '1px solid #f5f5f5' }}>{r[colA]}</td>
              <td style={{ padding: 6, borderBottom: '1px solid #f5f5f5', textAlign: 'right' }}>{r[colB]}</td>
            </tr>
          ))}
          {(!rows || rows.length === 0) && (
            <tr><td style={{ padding: 6 }} colSpan={2}>No data.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function SeriesView({ series }) {
  const byDate = useMemo(() => {
    const map = new Map()
    for (const item of series || []) {
      const d = item._id?.d
      const role = item._id?.role || 'guest'
      if (!d) continue
      if (!map.has(d)) map.set(d, {})
      const obj = map.get(d)
      obj[role] = (obj[role] || 0) + item.count
    }
    return Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0]))
  }, [series])

  const roles = ['guest','student','employer','admin']
  const max = Math.max(1, ...byDate.flatMap(([,v]) => roles.map(r => v[r] || 0)))
  const scale = 20 / max

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5 }}>
      {byDate.map(([date, counts]) => (
        <div key={date} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 90 }}>{date}</span>
          {roles.map(role => (
            <span key={role} title={`${role}: ${counts[role] || 0}`}
              style={{ display: 'inline-block', background: '#e5e7eb', marginRight: 4, width: (counts[role] || 0) * scale + 'ch' }}>
              
            </span>
          ))}
        </div>
      ))}
      {byDate.length === 0 && <div>No data.</div>}
    </div>
  )
}
