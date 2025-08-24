import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { Button } from './ui/button'
import { Input, Label } from './ui/input'
import { Badge } from './ui/badge'
import { Card, CardHeader, CardContent, CardFooter } from './ui/card'
import DatePicker from './DatePicker'
import { useToast } from './ui/toast'

export default function EmployerDashboard({ profile, fromCreate }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', type: 'job', location: '', skillset: '', requirements: '', applicationDeadline: '', contactEmail: '', contactPhone: '' })
  const toast = useToast()

  async function load() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/opportunities/my', { headers: { Authorization: `Bearer ${token}` } })
      setListings(res.data.opportunities || [])
  // clear any previous local error state
  setError(null)
    } catch (err) {
  const msg = err.response?.data?.message || err.message
  toast.push({ title: 'Load failed', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // re-load when coming back from create page
  }, [fromCreate])

  // sync updates from other components (e.g., when a student applies)
  useEffect(() => {
    function onUpdate(e) {
      const { opportunityId, applicationsCount } = e.detail || {}
      if (!opportunityId) return
      setListings(prev => prev.map(o => ( (o._id === opportunityId || o.id === opportunityId) ? { ...o, applicationsCount } : o )))
    }
    window.addEventListener('applicationsCountUpdated', onUpdate)
    return () => window.removeEventListener('applicationsCountUpdated', onUpdate)
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return listings.filter((o) => {
      const matchesQ = !term || `${o.title} ${o.description}`.toLowerCase().includes(term)
      const matchesType = typeFilter === 'all' || (o.type || '').toLowerCase() === typeFilter
      return matchesQ && matchesType
    })
  }, [listings, q, typeFilter])

  async function handleQuickCreate(e) {
    e.preventDefault()
    setCreating(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post('/api/opportunities', form, { headers: { Authorization: `Bearer ${token}` } })
  // optimistic update — ensure applicationsCount is present
  const created = res.data?.opportunity || { ...form }
  created.applicationsCount = created.applicationsCount || 0
  setListings((s) => [created, ...s])
      setOpen(false)
      setForm({ title: '', description: '', type: 'job' })
      toast.push({ title: 'Opportunity created', description: 'Your listing is live.', variant: 'default' })
    } catch (err) {
      const msg = err.response?.data?.message || err.message
      toast.push({ title: 'Create failed', description: msg, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Employer Dashboard</h2>
        <p className="text-muted-foreground">Welcome, {profile?.fullName || 'Employer'}</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search listings..."
            className="w-full sm:w-72"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="all">All types</option>
            <option value="job">Job</option>
            <option value="internship">Internship</option>
            <option value="contract">Contract</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load}>Refresh</Button>
          <>
            <Button onClick={() => setOpen(true)}>Quick Create</Button>

            {open && (
              <div className="fixed inset-0 z-50">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

                <div className="absolute inset-y-0 right-0 z-60 w-full max-w-md">
                  <Card className="h-full rounded-l-md bg-white/90 backdrop-blur-md">
                    <form onSubmit={handleQuickCreate} className="h-full flex flex-col">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">Create Opportunity</h3>
                          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Close</Button>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
                        <div>
                          <Label htmlFor="title">Title</Label>
                          <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                        </div>

                        <div>
                          <Label htmlFor="type">Type</Label>
                          <select
                            id="type"
                            value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value })}
                            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                          >
                            <option value="job">Job</option>
                            <option value="internship">Internship</option>
                            <option value="contract">Contract</option>
                          </select>
                        </div>

                        <div>
                          <Label htmlFor="description">Description</Label>
                          <textarea
                            id="description"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            rows={5}
                            className="w-full rounded-md border border-border bg-input/80 text-foreground px-3 py-2 text-sm shadow-sm outline-none"
                            placeholder="Role summary, responsibilities, requirements..."
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="skillset">Skillset</Label>
                          <Input id="skillset" value={form.skillset} onChange={(e) => setForm({ ...form, skillset: e.target.value })} placeholder="Comma separated skills" />
                        </div>

                        <div>
                          <Label htmlFor="requirements">Requirements</Label>
                          <textarea id="requirements" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} rows={3} className="w-full rounded-md border p-2" />
                        </div>

                        <div>
                          <Label htmlFor="location">Location</Label>
                          <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                        </div>

                        <div>
                          <Label htmlFor="applicationDeadline">Application Deadline</Label>
                          <div>
                            <DatePicker value={form.applicationDeadline} onChange={(v) => setForm({ ...form, applicationDeadline: v })} />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="contactEmail">Contact email</Label>
                          <Input id="contactEmail" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="hr@example.com" />
                        </div>

                        <div>
                          <Label htmlFor="contactPhone">Contact phone</Label>
                          <Input id="contactPhone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="+1-555-555-555" />
                        </div>

                      </CardContent>
                      <CardFooter>
                        <div className="flex items-center gap-2 justify-end p-4">
                          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                          <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create'}</Button>
                        </div>
                      </CardFooter>
                    </form>
                  </Card>
                </div>
              </div>
            )}
          </>
        </div>
      </div>

      {/* Listings */}
      <section>
        {loading && <div>Loading listings...</div>}
  {/* errors are shown as toasts */}
        {!loading && !error && (
          <div className="grid gap-3">
            {filtered.map((o) => (
                <Link key={o._id || o.id} to={`/dashboard/listing/${o._id || o.id}`} className="no-underline">
                  <div className="rounded-md border border-border/70 bg-card px-4 py-3 hover:bg-muted/40 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-base">{o.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">{o.description}</div>
                        <div className="text-xs text-muted-foreground mt-2">Applicants: {o.applicationsCount || 0}</div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 capitalize">{(o.type || '').toLowerCase()}</Badge>
                    </div>
                  </div>
                </Link>
            ))}
            {filtered.length === 0 && (
              <div className="text-muted-foreground">No listings match your filters.</div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
