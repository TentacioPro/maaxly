import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardHeader, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/select'
import { useToast } from '../components/ui/toast'
import OpportunityForm from '@/components/OpportunityForm'
import OpportunityInsightsPanel from '@/components/OpportunityInsightsPanel'
import { MapPin, Timer } from 'lucide-react'

export default function OpportunitiesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)

  // ui state
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
  const [view, setView] = useState(role === 'employer' ? 'my' : 'all') // 'all' | 'my'
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // 'all' | 'job' | 'internship' | 'competition'
  const [sort, setSort] = useState('newest') // 'newest' | 'oldest'
  const [applying, setApplying] = useState({}) // id -> boolean
  const [applied, setApplied] = useState({}) // id -> true

  const fetchItems = async (targetView) => {
  setLoading(true)
    const effectiveView = targetView || view
    try {
  const url = (effectiveView === 'my' && (role === 'employer' || role === 'admin'))
        ? '/api/opportunities/my-listings'
        : '/api/opportunities'
      // read token fresh inside fetch so changes (login/logout) are respected
      const localToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  // if requesting employer/admin 'my' listings and there is no token, show a clear error instead of calling the API with undefined header
  if (effectiveView === 'my' && (role === 'employer' || role === 'admin') && !localToken) {
        toast.push({ title: 'Missing token', description: 'You must be logged in to view your listings', variant: 'destructive' })
        setItems([])
        setLoading(false)
        return
      }
  // Always pass token if available so server can RBAC-filter when role is employer
  const headers = localToken ? { Authorization: `Bearer ${localToken}` } : undefined
      const res = await axios.get(url, { headers })
      const payload = Array.isArray(res.data) ? res.data : (res.data.opportunities || [])
      setItems(payload)
  } catch (err) {
        const msg = err.response?.data?.message || err.message
        // If public listing call returned 401 Missing token, ignore and show empty list
  if (err.response?.status === 401 && effectiveView !== 'my') {
          setItems([])
        } else {
          // show error as toast
          toast.push({ title: 'Load failed', description: msg, variant: 'destructive' })
        }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  // load current user's applications to mark already-applied opportunities
  useEffect(() => {
    let cancelled = false
    async function loadMyApps() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        if (!token) return
        const res = await axios.get('/api/applications/my', { headers: { Authorization: `Bearer ${token}` } })
        if (cancelled) return
        const apps = res.data.applications || []
        const map = {}
        apps.forEach(a => {
          // a.opportunity is populated (object) so use its _id; fallback to raw id
          const oppId = a.opportunity?._id || a.opportunity
          if (oppId) map[String(oppId)] = true
        })
        setApplied(map)
      } catch (err) {
        // ignore errors here (e.g., token invalid)
      }
    }
    loadMyApps()
    return () => { cancelled = true }
  }, [])

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  // role read earlier for initial state
  const canCreate = token && (role === 'employer' || role === 'admin')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [expandedInsights, setExpandedInsights] = useState({}) // opportunityId -> true

  const handleCreate = async (payload) => {
    setError(null)
    setCreating(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) {
        toast.push({ title: 'Not allowed', description: 'You must be logged in as an employer to create an opportunity', variant: 'destructive' })
        return false
      }
      await axios.post('/api/opportunities', payload, { headers: { Authorization: `Bearer ${token}` } })
      // refresh listings
      fetchItems()
      toast.push({ title: 'Opportunity created', description: 'Your listing has been posted.' })
      return true
    } catch (err) {
      const msg = err.response?.data?.message || err.message
      toast.push({ title: 'Create failed', description: msg, variant: 'destructive' })
      setError(msg)
      throw err
    } finally {
      setCreating(false)
    }
  }

  const displayed = useMemo(() => {
    let list = Array.isArray(items) ? [...items] : []
    const q = search.trim().toLowerCase()
    if (q) list = list.filter(x => (x.title || '').toLowerCase().includes(q) || (x.description || '').toLowerCase().includes(q))
    if (typeFilter !== 'all') list = list.filter(x => x.type === typeFilter)
    list.sort((a, b) => sort === 'newest' ? new Date(b.createdAt) - new Date(a.createdAt) : new Date(a.createdAt) - new Date(b.createdAt))
    return list
  }, [items, search, typeFilter, sort])
  
  // When a student selects "Applied" (view === 'my'), filter to those they applied to
  const displayedWithView = useMemo(() => {
    let list = displayed
    if (role === 'student' && view === 'my') {
      list = list.filter(it => applied[it._id])
    }
    return list
  }, [displayed, applied, role, view])

  const handleApply = async (id) => {
    setApplying(prev => ({ ...prev, [id]: true }))
    try {
      const localToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!localToken) {
        // redirect to login if not authenticated
        window.location.href = '/login'
        return
      }
      const res = await axios.post('/api/applications', { opportunityId: id }, { headers: { Authorization: `Bearer ${localToken}` } })
      setApplied(prev => ({ ...prev, [id]: true }))
      // update local items list with the returned applicationsCount if present
      const updatedCount = res.data?.applicationsCount
      if (typeof updatedCount === 'number') {
        setItems(prev => prev.map(it => {
          const key = it._id || it.id
          if (key === id) return { ...it, applicationsCount: updatedCount }
          return it
        }))
        // notify other components (lists/dashboards) to update their counts too
        try { window.dispatchEvent(new CustomEvent('applicationsCountUpdated', { detail: { opportunityId: id, applicationsCount: updatedCount } })) } catch (e) {}
      } else {
        // fallback: increment locally
        setItems(prev => prev.map(it => {
          const key = it._id || it.id
          if (key === id) return { ...it, applicationsCount: (it.applicationsCount || 0) + 1 }
          return it
        }))
        try { window.dispatchEvent(new CustomEvent('applicationsCountUpdated', { detail: { opportunityId: id, applicationsCount: ( (items.find(i=> (i._id||i.id)===id)?.applicationsCount||0) + 1 ) } })) } catch(e) {}
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message
      // Treat duplicate apply as success state
    if (err.response?.status === 409) {
        setApplied(prev => ({ ...prev, [id]: true }))
        // on duplicate, fetch fresh opportunity to get accurate count
        try {
          const oppRes = await axios.get(`/api/opportunities/${id}`)
          const fresh = oppRes.data?.opportunity
          if (fresh) {
            setItems(prev => prev.map(it => {
              const key = it._id || it.id
              if (key === id) return { ...it, applicationsCount: fresh.applicationsCount || 0 }
              return it
            }))
      try { window.dispatchEvent(new CustomEvent('applicationsCountUpdated', { detail: { opportunityId: id, applicationsCount: fresh.applicationsCount || 0 } })) } catch(e) {}
          }
        } catch (e) {
          // ignore fetch error here
        }
      } else {
  toast.push({ title: 'Apply failed', description: msg, variant: 'destructive' })
      }
    } finally {
      setApplying(prev => ({ ...prev, [id]: false }))
    }
  }

  // Persist scroll position and mark when navigating to details, restore on mount
  useEffect(() => {
    // Restore scroll only once when coming back
    const restoreOnce = sessionStorage.getItem('opps:restoreOnce')
    const saved = sessionStorage.getItem('opps:scrollY')
    if (restoreOnce && saved) {
      try { window.scrollTo(0, parseInt(saved, 10) || 0) } catch (e) {}
      try { sessionStorage.removeItem('opps:restoreOnce') } catch (e) {}
    }
    const onBeforeUnload = () => {
      try { sessionStorage.setItem('opps:scrollY', String(window.scrollY || 0)) } catch (e) {}
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  return (
    <div className="w-full md:w-[80%] mx-auto px-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-semibold">Opportunities</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => {
              const target = role === 'employer' ? 'my' : 'all'
              // adjust current view if needed so UI matches fetch scope
              if (target !== view) {
                setView(target)
              } else {
                fetchItems(target)
              }
            }}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
          {canCreate && (
          <>
            <Button size="sm" onClick={() => setSheetOpen(true)}>Create Opportunity</Button>

            {sheetOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSheetOpen(false)} />
                <Card className="w-full max-w-2xl mx-4 z-60 min-w-[520px] h-[90vh] flex flex-col overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b">
                    <h3 className="text-lg font-semibold">Create Opportunity</h3>
                  </CardHeader>
                  <OpportunityForm
                    onSubmit={async (payload) => { const ok = await handleCreate(payload); if (ok) setSheetOpen(false) }}
                    onCancel={() => setSheetOpen(false)}
                    submitLabel={creating ? 'Creating…' : 'Create'}
                  />
                </Card>
              </div>
            )}
          </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search title or description"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10"
        />
      </div>

      {/* Filters */}
  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          {role !== 'employer' && (
            <Button variant={view === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setView('all')}>All</Button>
          )}
          {/* Show "My Listings" for students and admins (authenticated), hide for employers */}
          {token && role !== 'employer' && (
            <Button variant={view === 'my' ? 'default' : 'outline'} size="sm" onClick={() => setView('my')}>
              {role === 'student' ? 'Applied' : 'My Listings'}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="job">Job</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
              <SelectItem value="competition">Competition</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border bg-card">
              <CardContent className="p-3 animate-pulse space-y-2">
                <div className="h-4 w-1/2 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-3.5 w-full bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
  {/* errors surface via toasts */}

      {/* List */}
      {displayedWithView.length === 0 && !loading ? (
        <div className="text-sm text-muted-foreground">
          {role === 'student' && view === 'my'
            ? 'No applied opportunities yet.'
            : role === 'admin' && view === 'my'
            ? 'No listings found in My Listings.'
            : 'No opportunities found.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {displayedWithView.map((it) => (
            <Card key={it._id} className="rounded-2xl border border-border/60 bg-muted/30 text-card-foreground hover:bg-muted/40 hover:shadow-sm transition-colors">
              <Link
                to={`/dashboard/listing/${it._id}`}
                className="block no-underline text-inherit"
                onClick={() => { try { sessionStorage.setItem('opps:lastFromList','1'); sessionStorage.setItem('opps:scrollY', String(window.scrollY||0)) } catch(e) {} }}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full border bg-muted/40 flex items-center justify-center text-[12px] font-semibold text-foreground/80 shrink-0">
                      {getInitials(it.owner?.companyName || it.title)}
                    </div>
                    {/* Main column */}
                    <div className="min-w-0 flex-1">
                      {/* Header: title + type chip, apply to the right */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-2">
                          <h3 className="text-[17px] font-semibold leading-7 truncate max-w-[56ch]" title={it.title}>{it.title}</h3>
                          {it.type && (
                            <span
                              className="inline-flex items-center rounded-full border bg-primary/20 text-primary border-primary/30 px-3 py-[5px] text-[12px] font-semibold shadow-sm capitalize"
                            >{it.type}</span>
                          )}
                        </div>
                        <div className="shrink-0 flex items-center gap-2" onClick={(e)=>e.preventDefault()}>
                          {/* Apply in header (prevent link navigation) */}
                          {token && role === 'student' && !applied[it._id] && (
                            <Button size="sm" className="min-w-[92px]" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleApply(it._id) }} disabled={!!applying[it._id]}>
                              {applying[it._id] ? 'Applying…' : 'Apply'}
                            </Button>
                          )}
                          {token && role === 'student' && applied[it._id] && (
                            <Badge variant="secondary" className="rounded-full text-[11px] font-semibold capitalize">Applied</Badge>
                          )}
                          {token && (role === 'employer' || role === 'admin') && (
                            <Button size="sm" variant="outline" className="min-w-[100px]" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setExpandedInsights(prev => ({ ...prev, [it._id]: !prev[it._id] })) }}>
                              {expandedInsights[it._id] ? 'Hide Insights' : 'Insights'}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Meta row under header */}
                      <div className="mt-1 text-[13px] text-muted-foreground flex flex-wrap items-center gap-4">
                        {it.owner?.companyName && (
                          <span className="font-medium text-foreground/90 truncate max-w-[40ch]">{it.owner.companyName}</span>
                        )}
                        {it.location && (
                          <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="opacity-80" />{it.location}</span>
                        )}
                        {it.applicationDeadline && (
                          <span className="inline-flex items-center gap-1.5"><Timer size={14} className="opacity-80" />Deadline: {new Date(it.applicationDeadline).toLocaleDateString()}</span>
                        )}
                      </div>

                      {/* Description */}
                      {it.description && (
                        <p className="mt-1.5 text-[13px] text-foreground/90 line-clamp-1">{it.description}</p>
                      )}

                      {/* Skill chips */}
                      {it.skillset && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(it.skillset || '')
                            .split(',')
                            .map(s => s.trim())
                            .filter(Boolean)
                            .slice(0,6)
                            .map((s, idx) => {
                              const h = Array.from(s).reduce((a,c)=>a+c.charCodeAt(0),0)
                              const varName = h % 3 === 0 ? '--primary' : h % 3 === 1 ? '--accent' : '--ring'
                              const style = {
                                background: `hsl(var(${varName}) / 0.10)`,
                                color: `hsl(var(${varName}))`,
                                borderColor: `hsl(var(${varName}) / 0.28)`
                              }
                              return (
                                <span key={idx} className="text-[12px] px-2 py-[3px] rounded-md border capitalize" style={style}>{s}</span>
                              )
                            })}
                        </div>
                      )}

                      {/* Footer: uploaded time bottom-left */}
                      {it.createdAt && (
                        <div className="mt-2 text-[12px] text-muted-foreground">{formatRelativeDays(it.createdAt)}</div>
                      )}
                    </div>
                  </div>

                  {expandedInsights[it._id] && (role === 'employer' || role === 'admin') && (
                    <div className="pt-2 border-t mt-3">
                      <OpportunityInsightsPanel opportunityId={it._id} canManage={role==='employer' || role==='admin'} />
                    </div>
                  )}
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function getInitials(name) {
  if (!name) return '—'
  const parts = String(name).trim().split(/\s+/)
  const first = parts[0]?.[0] || ''
  const second = parts[1]?.[0] || ''
  return (first + second).toUpperCase()
}

function formatRelativeDays(dateLike) {
  try {
    const d = new Date(dateLike)
    const diff = Math.max(0, Date.now() - d.getTime())
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return '1 day ago'
    return `${days} days ago`
  } catch { return '' }
}
