import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { useToast } from '../components/ui/toast'

export default function OpportunitiesListPage() {
  const [opportunities, setOpportunities] = useState([])
  const [filtered, setFiltered] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const toast = useToast()

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
  const msg = err.response?.data?.message || err.message
  toast.push({ title: 'Load failed', description: msg, variant: 'destructive' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // listen for global updates to applications counts (so other views update)
  useEffect(() => {
    function onUpdate(e) {
      const { opportunityId, applicationsCount } = e.detail || {}
      if (!opportunityId) return
      setOpportunities(prev => prev.map(o => (o._id === opportunityId ? { ...o, applicationsCount } : o)))
      setFiltered(prev => prev.map(o => (o._id === opportunityId ? { ...o, applicationsCount } : o)))
    }
    window.addEventListener('applicationsCountUpdated', onUpdate)
    return () => window.removeEventListener('applicationsCountUpdated', onUpdate)
  }, [])

  const displayed = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    let list = [...opportunities]
    if (q) list = list.filter(o => (o.title || '').toLowerCase().includes(q) || (o.description || '').toLowerCase().includes(q))
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return list
  }, [query, opportunities])

  return (
    <div className="w-full md:w-[80%] mx-auto px-3 py-6">
      <h2 className="text-2xl font-semibold mb-4">Opportunities</h2>

      <div className="mb-4">
        <Input
          placeholder="Search by title or description"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full"
        />
      </div>

      {loading && <div>Loading opportunities...</div>}
  {/* errors shown via toast */}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayed.length === 0 && <div className="text-sm text-muted-foreground">No opportunities found.</div>}
          {displayed.map(o => (
            <Card key={o._id || o.id} className="border bg-card text-card-foreground">
              <CardContent className="p-4">
                <Link to={`/dashboard/listing/${o._id || o.id}`} className="no-underline text-inherit">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold leading-6 truncate max-w-[22ch]" title={o.title}>{o.title}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{o.type}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{new Date(o.createdAt).toLocaleDateString()}</div>
                      <p className="mt-2 text-sm text-muted-foreground/90 line-clamp-2">{o.description || '—'}</p>

                      {o.requirements && (
                        <div className="mt-2 text-sm text-muted-foreground line-clamp-2">Reqs: {o.requirements}</div>
                      )}

                      {o.skillset && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(o.skillset || '').split(',').map(s => s.trim()).filter(Boolean).slice(0,5).map((s, idx) => (
                            <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 text-sm">
                        <div className="text-xs text-muted-foreground">{o.location || ''}</div>
                        {o.applicationDeadline && <div className="text-xs text-muted-foreground">Deadline: {new Date(o.applicationDeadline).toLocaleDateString()}</div>}
                        {o.contactEmail && <div className="text-xs text-muted-foreground">Contact: {o.contactEmail}</div>}
                        <div className="mt-2">
                        {o.owner?.companyName ? (
                          <a href={`/company/${o.owner._id}`} className="text-sm font-medium text-primary no-underline">{o.owner.companyName}</a>
                        ) : (
                          <a href={`/company/${o.owner || o.ownerId || 'unknown'}`} className="text-sm font-medium text-primary no-underline">Company</a>
                        )}
                        <div className="text-xs text-muted-foreground">{o.owner?.companyWebsite || ''}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
