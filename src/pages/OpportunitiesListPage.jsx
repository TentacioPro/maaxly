import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined
    const res = await axios.get('/api/opportunities', { headers })
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

  // Persist/restore scroll position when navigating to details and back
  useEffect(() => {
    const restoreOnce = sessionStorage.getItem('opps:restoreOnce')
    const saved = sessionStorage.getItem('opps:scrollY')
    if (restoreOnce && saved) {
      try { window.scrollTo(0, parseInt(saved, 10) || 0) } catch (e) {}
      try { sessionStorage.removeItem('opps:restoreOnce') } catch (e) {}
    }
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
      <h2 className="text-2xl font-semibold mb-3">Opportunities</h2>

      <div className="mb-4">
        <Input
          placeholder="Search title or description"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-10"
        />
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading opportunities…</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayed.length === 0 && <div className="text-sm text-muted-foreground">No opportunities found.</div>}
          {displayed.map(o => (
            <Card key={o._id || o.id} className="border bg-card text-card-foreground hover:bg-muted/20 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-semibold leading-6 truncate max-w-[28ch]" title={o.title}>{o.title}</h3>
                      <Badge variant="muted" className="capitalize">{o.type}</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{new Date(o.createdAt).toLocaleDateString()}</div>
                    <p className="mt-2 text-[13px] text-muted-foreground/90 line-clamp-2">{o.description || '—'}</p>

                    {o.skillset && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(o.skillset || '').split(',').map(s => s.trim()).filter(Boolean).slice(0,5).map((s, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 text-[12px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                      {o.location && <div>{o.location}</div>}
                      {o.applicationDeadline && <div>Deadline: {new Date(o.applicationDeadline).toLocaleDateString()}</div>}
                      {o.contactEmail && <div className="truncate max-w-[22ch]" title={o.contactEmail}>{o.contactEmail}</div>}
                    </div>

                    <div className="mt-2 text-[12px]">
                      {o.owner?.companyName ? (
                        <a href={`/company/${o.owner._id}`} className="font-medium text-primary no-underline">{o.owner.companyName}</a>
                      ) : (
                        <a href={`/company/${o.owner || o.ownerId || 'unknown'}`} className="font-medium text-primary no-underline">Company</a>
                      )}
                      <div className="text-[11px] text-muted-foreground">
                        {o.owner?.companyWebsite || ''}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <Link
                      to={`/dashboard/listing/${o._id || o.id}`}
                      className="text-[13px] underline underline-offset-4"
                      onClick={() => {
                        try {
                          sessionStorage.setItem('opps:lastFromList', '1')
                          sessionStorage.setItem('opps:scrollY', String(window.scrollY || 0))
                        } catch (e) {}
                      }}
                    >
                      View details
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
