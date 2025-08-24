import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/card'
import { Label } from '../components/ui/input'
import DatePicker from '../components/DatePicker'
import { useToast } from '../components/ui/toast'

export default function OpportunitiesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('job')
  const [location, setLocation] = useState('')
  const [applicationDeadline, setApplicationDeadline] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [skillset, setSkillset] = useState('')

  // ui state
  const [view, setView] = useState('all') // 'all' | 'my'
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // 'all' | 'job' | 'internship' | 'competition'
  const [sort, setSort] = useState('newest') // 'newest' | 'oldest'
  const [applying, setApplying] = useState({}) // id -> boolean
  const [applied, setApplied] = useState({}) // id -> true

  const fetchItems = async () => {
  setLoading(true)
    try {
      const url = view === 'my' ? '/api/opportunities/my-listings' : '/api/opportunities'
      // read token fresh inside fetch so changes (login/logout) are respected
      const localToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      // if requesting 'my' listings and there is no token, show a clear error instead of calling the API with undefined header
      if (view === 'my' && !localToken) {
        toast.push({ title: 'Missing token', description: 'You must be logged in to view your listings', variant: 'destructive' })
        setItems([])
        setLoading(false)
        return
      }
      const headers = localToken ? { Authorization: `Bearer ${localToken}` } : undefined
      const res = await axios.get(url, { headers })
      const payload = Array.isArray(res.data) ? res.data : (res.data.opportunities || [])
      setItems(payload)
      } catch (err) {
        const msg = err.response?.data?.message || err.message
        // If public listing call returned 401 Missing token, ignore and show empty list
        if (err.response?.status === 401 && view !== 'my') {
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
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
  const canCreate = token && (role === 'employer' || role === 'admin')
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
  setError(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) {
    toast.push({ title: 'Not allowed', description: 'You must be logged in as an employer to create an opportunity', variant: 'destructive' })
        return
      }
      const payload = { title, description, type }
      if (location) payload.location = location
      if (applicationDeadline) payload.applicationDeadline = applicationDeadline
      if (contactEmail) payload.contactEmail = contactEmail
      if (skillset) payload.skillset = skillset
      await axios.post('/api/opportunities', payload, { headers: { Authorization: `Bearer ${token}` } })
      // reset quick-create fields
      setTitle('')
      setDescription('')
      setType('job')
      setLocation('')
      setApplicationDeadline('')
      setContactEmail('')
      setSkillset('')
      fetchItems()
    } catch (err) {
  const msg = err.response?.data?.message || err.message
  toast.push({ title: 'Create failed', description: msg, variant: 'destructive' })
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

  return (
    <div className="w-full md:w-[80%] mx-auto px-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Opportunities</h2>
        {canCreate && (
          <>
            <Button size="sm" className="bg-sky-600 text-white" onClick={() => setSheetOpen(true)}>Create Opportunity</Button>

            {sheetOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSheetOpen(false)} />
                <Card className="w-full max-w-2xl mx-4 z-60" style={{ minWidth: 520, maxHeight: '90vh', overflow: 'hidden' }}>
                  <form onSubmit={async (e) => { await handleCreate(e); setSheetOpen(false) }}>
                    <CardHeader>
                      <h3 className="text-lg font-semibold">Create Opportunity</h3>
                    </CardHeader>
                    <CardContent className="space-y-4" style={{ maxHeight: 'calc(90vh - 160px)', overflowY: 'auto' }}>
                      <div>
                        <Label>Title</Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full" />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2">
                          <option value="job">Job</option>
                          <option value="internship">Internship</option>
                          <option value="competition">Competition</option>
                        </select>
                      </div>

                      <div>
                        <Label>Location</Label>
                        <Input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full" />
                      </div>

                      <div>
                        <Label>Application Deadline</Label>
                        <div>
                          <DatePicker value={applicationDeadline} onChange={(v) => setApplicationDeadline(v)} placeholder="Pick a date" />
                        </div>
                      </div>

                      <div>
                        <Label>Contact email</Label>
                        <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full" placeholder="hr@example.com" />
                      </div>

                      <div>
                        <Label>Skillset</Label>
                        <Input value={skillset} onChange={(e) => setSkillset(e.target.value)} className="w-full" placeholder="Comma separated skills" />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <div className="flex justify-end w-full gap-2">
                        <Button type="button" variant="ghost" onClick={() => setSheetOpen(false)}>Cancel</Button>
                        <Button className="bg-sky-600 text-white" type="submit">Create</Button>
                      </div>
                    </CardFooter>
                  </form>
                </Card>
              </div>
            )}
          </>
        )}
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
          <Button variant={view === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setView('all')}>All</Button>
          {canCreate && (
            <Button variant={view === 'my' ? 'default' : 'outline'} size="sm" onClick={() => setView('my')}>My Listings</Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="all">All Types</option>
            <option value="job">Job</option>
            <option value="internship">Internship</option>
            <option value="competition">Competition</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
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
      {displayed.length === 0 && !loading ? (
        <div className="text-sm text-muted-foreground">No opportunities found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayed.map((it) => (
            <Card key={it._id} className="border bg-card text-card-foreground hover:bg-accent/40 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold leading-6 truncate max-w-[22ch]" title={it.title}>{it.title}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{it.type}</span>
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
                    <Link to={`/dashboard/listing/${it._id}`} className="text-sm underline underline-offset-4">View details</Link>
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
