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
        apps.forEach(a => { if (a.opportunity) map[a.opportunity] = true })
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
      <div className="flex items-center justify-between mb-4">
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
          className="w-full"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border bg-card">
              <CardContent className="p-4 animate-pulse space-y-3">
                <div className="h-5 w-1/2 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {displayedWithView.map((it) => (
            <Card key={it._id} className="border bg-card text-card-foreground hover:bg-accent/40 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold leading-6 truncate max-w-[22ch]" title={it.title}>{it.title}</h3>
                      <Badge variant="muted" className="capitalize">{it.type}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{new Date(it.createdAt).toLocaleDateString()}</div>
                    <p className="mt-2 text-sm text-muted-foreground/90 line-clamp-2">{it.description || '—'}</p>

                    {/* Requirements snippet */}
                    {it.requirements && (
                      <div className="mt-2 text-sm text-muted-foreground line-clamp-2">Reqs: {it.requirements}</div>
                    )}

                    {/* Skillset badges */}
                    {it.skillset && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(it.skillset || '').split(',').map(s => s.trim()).filter(Boolean).slice(0,5).map((s, idx) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 text-sm">
                      <div className="text-xs text-muted-foreground">{it.location || '—'}</div>
                      {it.applicationDeadline && <div className="text-xs text-muted-foreground">Deadline: {new Date(it.applicationDeadline).toLocaleDateString()}</div>}
                    </div>

                    {/* Company two-liner */}
                    <div className="mt-3 text-sm">
                      {it.owner?.companyName ? (
                        <a href={`/company/${it.owner._id}`} className="text-sm font-medium text-primary no-underline">{it.owner.companyName}</a>
                      ) : (
                        <a href={`/company/${it.owner || it.ownerId || 'unknown'}`} className="text-sm font-medium text-primary no-underline">Company</a>
                      )}
                      <div className="text-xs text-muted-foreground">{it.owner?.companyWebsite || it.owner?.companyWebsite || ''}</div>
                    </div>
                  </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                    <Link
                      to={`/dashboard/listing/${it._id}`}
                      className="text-sm underline underline-offset-4"
                      onClick={() => {
                        try {
                          sessionStorage.setItem('opps:lastFromList', '1')
                          sessionStorage.setItem('opps:scrollY', String(window.scrollY || 0))
                        } catch (e) {}
                      }}
                    >
                      View details
                    </Link>
                    {token && role === 'student' && (
                      <Button size="sm" onClick={() => handleApply(it._id)} disabled={!!applying[it._id] || !!applied[it._id]}>
                        {applied[it._id] ? 'Applied' : applying[it._id] ? 'Applying…' : 'Apply'}
                      </Button>
                    )}
                    {/* contact */}
                    {it.contactEmail && <div className="text-xs text-muted-foreground ml-2">{it.contactEmail}</div>}
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
