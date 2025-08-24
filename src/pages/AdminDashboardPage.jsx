import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useToast } from '../components/ui/toast'

  export default function AdminDashboardPage() {
    const [users, setUsers] = useState([])
    const [stats, setStats] = useState(null)
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
          const [statsRes, usersRes] = await Promise.all([
            axios.get('/api/admin/stats', { headers }),
            axios.get('/api/admin/users', { headers })
          ])

          if (cancelled) return
          setStats(statsRes.data.stats || null)
          setUsers(usersRes.data.users || [])
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
    }, [])

    return (
      <div style={{ padding: 24 }}>
        <h2>Admin Dashboard</h2>

        {loading && <div>Loading users...</div>}
        {error && <div style={{ color: 'crimson' }}>{error}</div>}

        {!loading && !error && (
          <div>
            {/* Stat cards */}
            {stats && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
                <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, minWidth: 140 }}>
                  <div style={{ fontSize: 12, color: '#666' }}>Total users</div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{stats.totalUsers}</div>
                </div>

                <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, minWidth: 140 }}>
                  <div style={{ fontSize: 12, color: '#666' }}>Students</div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{stats.totalStudents}</div>
                </div>

                <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, minWidth: 140 }}>
                  <div style={{ fontSize: 12, color: '#666' }}>Employers</div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{stats.totalEmployers}</div>
                </div>

                <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, minWidth: 140 }}>
                  <div style={{ fontSize: 12, color: '#666' }}>Opportunities</div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{stats.totalOpportunities}</div>
                </div>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Email</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Role</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>(_id)</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{u.email}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{u.role}{u.isAdmin ? ' (admin)' : ''}</td>
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
