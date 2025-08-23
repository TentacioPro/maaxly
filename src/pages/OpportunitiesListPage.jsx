import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

export default function OpportunitiesListPage() {
  const [opportunities, setOpportunities] = useState([])
  const [filtered, setFiltered] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await axios.get('/api/opportunities')
        if (cancelled) return
        const items = res.data?.opportunities || []
        setOpportunities(items)
        setFiltered(items)
      } catch (err) {
        if (cancelled) return
        setError(err.response?.data?.message || err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const q = (query || '').trim().toLowerCase()
    if (!q) {
      setFiltered(opportunities)
      return
    }
    setFiltered(opportunities.filter(o => (o.title || '').toLowerCase().includes(q)))
  }, [query, opportunities])

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h2>Opportunities</h2>

      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="Search by title..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', fontSize: 16 }}
        />
      </div>

      {loading && <div>Loading opportunities...</div>}
      {error && <div style={{ color: 'crimson' }}>{error}</div>}

      {!loading && !error && (
        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.length === 0 && <div>No opportunities found.</div>}
          {filtered.map(o => (
            <div key={o._id || o.id} style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6 }}>
              <Link to={`/opportunities/${o._id || o.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{o.title}</strong>
                    <div style={{ color: '#555' }}>{o.description}</div>
                    <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>{o.type}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#999' }}>{new Date(o.createdAt).toLocaleDateString()}</div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
