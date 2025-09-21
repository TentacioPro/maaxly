import React, { useEffect, useState, useMemo, useCallback } from 'react'
import axios from 'axios'
import { get, post } from '@/lib/api'
import useSSE from '@/hooks/useSSE'
import { Card, CardHeader, CardContent } from './ui/card'
import DashboardKPI from './DashboardKPI'
import { Badge } from './ui/badge'
import { MapPin } from 'lucide-react'
import { Skeleton } from './ui/skeleton'
import ApplicationProgressStepper from '@/components/ApplicationProgressStepper'
import ApplicationStatusStepper from '@/components/ApplicationStatusStepper'
import OpportunityMiniTracker from '@/components/OpportunityMiniTracker'

export default function StudentDashboard({ profile }) {
  const [recommended, setRecommended] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { loadRecommendations() }, [])

  // SSE: listen for student-specific analytics updates (if available)
  const sse = useMemo(() => useSSE({
    onMessageCreated: null,
    onConversationCreated: null,
    onAck: null
  }), [])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return
    sse.start()
    return () => sse.stop()
  }, [sse])

  async function loadRecommendations(manual = false) {
    let cancelled = false
    if (manual) setRefreshing(true); else setLoading(true)
    try {
      const res = await axios.get('/api/opportunities')
      if (cancelled) return
      setRecommended(res.data.opportunities || [])
      setError(null)
    } catch (err) {
      if (cancelled) return
      setError(err.response?.data?.message || err.message)
    } finally {
      manual ? setRefreshing(false) : setLoading(false)
    }
    return () => { cancelled = true }
  }

  // Remote stats & habits
  const [progress, setProgress] = useState({ applications: 0, interviews: 0, offers: 0 })
  const [streak, setStreak] = useState(0)
  const [tasks, setTasks] = useState([])
  const [habitsLoading, setHabitsLoading] = useState(true)
  const [habitsError, setHabitsError] = useState(null)
  const [applications, setApplications] = useState([])
  const [appsLoading, setAppsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadProgress() {
      try {
        const data = await get('/analytics/student/progress')
        if (cancelled) return
        setProgress({
          applications: data.applications || 0,
            interviews: data.interviews || 0,
            offers: data.offers || 0
        })
      } catch {}
    }
    loadProgress()
    return () => { cancelled = true }
  }, [])

  // handle real-time progress updates (custom event stream may emit 'student:progress')
  useEffect(() => {
    function onProgressUpdate(e) {
      const payload = e.detail || {}
      setProgress(prev => ({ ...prev, ...(payload.progress || {}) }))
      if (payload.streak !== undefined) setStreak(payload.streak)
    }
    window.addEventListener('studentProgressUpdated', onProgressUpdate)
    return () => window.removeEventListener('studentProgressUpdated', onProgressUpdate)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadHabits() {
      setHabitsLoading(true)
      setHabitsError(null)
      try {
        const [streakData, tasksData] = await Promise.all([
          get('/habits/streak'),
          get('/habits/tasks')
        ])
        if (cancelled) return
  const rawStreak = streakData.streak
  const numericStreak = typeof rawStreak === 'number' ? rawStreak : (rawStreak?.current || 0)
  setStreak(numericStreak)
        setTasks((tasksData.tasks || []).map(t => ({ id: t.id, label: t.label, done: !!t.done })))
      } catch (e) {
        if (cancelled) return
        setHabitsError(e?.message || 'Failed to load habits')
      } finally {
        if (!cancelled) setHabitsLoading(false)
      }
    }
    loadHabits()
    return () => { cancelled = true }
  }, [])

  // load applications (for future modal usage)
  useEffect(() => {
    let cancelled = false
    async function loadApps() {
      setAppsLoading(true)
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const res = await axios.get('/api/applications/my', { headers: { Authorization: `Bearer ${token}` } })
        if (cancelled) return
        setApplications(res.data.applications || [])
      } catch {} finally {
        if (!cancelled) setAppsLoading(false)
      }
    }
    loadApps()
    return () => { cancelled = true }
  }, [])

  async function toggleTask(id) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done, _optimistic: true } : t))
    try {
      await post(`/habits/tasks/${id}/toggle`)
      // refetch tasks quickly (optional) - keep optimistic for now
    } catch {
      // revert on failure
      setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
    }
  }

  const completionRatio = useMemo(() => {
    if (!tasks.length) return 0
    const done = tasks.filter(t => t.done).length
    return done / tasks.length
  }, [tasks])

  const stats = useMemo(() => ([
    { id: 's1', label: 'Applications Sent', value: progress.applications },
    { id: 's2', label: 'Interviews', value: progress.interviews },
    { id: 's3', label: 'Offers', value: progress.offers },
    { id: 's4', label: 'Streak (days)', value: streak },
  ]), [progress, streak])

  const [activeOpportunity, setActiveOpportunity] = useState(null)
  const activeApplication = useMemo(() => {
    if (!activeOpportunity) return null
    return applications.find(a => String(a.opportunity?._id || a.opportunity) === String(activeOpportunity._id || activeOpportunity.id)) || null
  }, [activeOpportunity, applications])

  const [applying, setApplying] = useState(false)
  async function applyToActive() {
    if (!activeOpportunity || applying) return
    setApplying(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Not authenticated')
      await axios.post('/api/applications', { opportunityId: activeOpportunity._id || activeOpportunity.id }, { headers: { Authorization: `Bearer ${token}` } })
      // refresh apps + progress
      try {
        const res = await axios.get('/api/applications/my', { headers: { Authorization: `Bearer ${token}` } })
        setApplications(res.data.applications || [])
      } catch {}
    } catch (e) {
      // optionally surface toast (not imported here to keep minimal)
      console.error(e)
    } finally {
      setApplying(false)
    }
  }
      {activeOpportunity && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setActiveOpportunity(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-lg border bg-card shadow-lg overflow-hidden">
            <div className="p-4 border-b flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{activeOpportunity.title}</h3>
                <div className="text-sm text-muted-foreground">{activeOpportunity.company || activeOpportunity.owner?.company || 'Unknown Company'}</div>
              </div>
              <button onClick={() => setActiveOpportunity(null)} className="text-xs px-2 py-1 rounded hover:bg-muted">Close</button>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{activeOpportunity.description || 'No description.'}</div>
              {activeApplication ? (
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Your Application Status</div>
                  <ApplicationStatusStepper status={activeApplication.status} />
                  {(activeApplication.history || []).length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">History</div>
                      <ul className="space-y-1 text-[11px]">
                        {activeApplication.history.slice().reverse().map((h,i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-primary/70" />
                            <span className="font-medium capitalize">{h.status}</span>
                            <span className="text-muted-foreground text-[10px]">{new Date(h.at || h.createdAt || activeApplication.createdAt).toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">You have not applied yet.</div>
                  <button onClick={applyToActive} disabled={applying} className="text-xs px-3 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50 inline-flex items-center gap-2">
                    {applying && <span className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />}
                    {applying ? 'Applying...' : 'Apply Now'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back, {profile?.fullName || 'Student'}</h1>
          <p className="text-sm text-muted-foreground">Here's what's happening with your job search</p>
        </div>
      </header>

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_,i) => (
              <div key={i} className="p-4 rounded border bg-card space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-2 w-20" />
              </div>
            ))
          ) : (
            stats.map((s, i) => (
              <DashboardKPI key={s.id} label={s.label} value={s.value} accent={i===0? 'primary' : i===1 ? 'accent' : 'secondary'} />
            ))
          )}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Daily Tasks</h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">🔥 {streak}d</span>
              {tasks.length > 0 && (
                <span className="text-muted-foreground">{Math.round(completionRatio*100)}% done</span>
              )}
            </div>
          </div>
          {tasks.length > 0 && (
            <div className="w-full h-2 rounded bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${completionRatio*100}%` }} />
            </div>
          )}
          <div className="space-y-2">
            {habitsLoading && (
              <div className="space-y-2 bg-card/50 rounded-md p-2 border">
                {Array.from({ length: 4 }).map((_,i) => <Skeleton key={i} className="h-7 w-full" />)}
              </div>
            )}
            {habitsError && <div className="text-sm text-destructive">{habitsError}</div>}
            {!habitsLoading && !habitsError && tasks.length === 0 && <div className="text-sm text-muted-foreground bg-card/50 border rounded p-3">No tasks today.</div>}
            {!habitsLoading && !habitsError && tasks.map(t => (
              <button
                key={t.id}
                onClick={() => toggleTask(t.id)}
                className={`w-full flex items-center justify-between rounded border px-3 py-2 text-left text-[13px] font-medium transition hover:bg-accent/40 ${t.done ? 'bg-accent/60 line-through opacity-70' : 'bg-card'}`}
              >
                <span>{t.label}</span>
                <span className={`inline-block w-4 h-4 rounded-full border ${t.done ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`} />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Application Progress</h2>
          <ApplicationProgressStepper applications={progress.applications} interviews={progress.interviews} offers={progress.offers} />
          <div className="text-xs text-muted-foreground">Funnel visualization will expand with stage timings later.</div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 gap-4">
          <div>
            <h2 className="text-lg font-medium">Recommended Opportunities</h2>
            <div className="text-sm text-muted-foreground">Based on your profile</div>
          </div>
          <button
            onClick={() => loadRecommendations(true)}
            disabled={refreshing}
            className="text-xs px-3 py-1 rounded border bg-background hover:bg-muted transition disabled:opacity-50"
          >{refreshing ? 'Refreshing…' : 'Refresh'}</button>
        </div>

        {loading && (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_,i) => (
              <div key={i} className="animate-pulse rounded border p-4 space-y-3">
                <div className="h-24 rounded bg-muted" />
                <div className="h-4 w-2/3 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
                <div className="h-3 w-full bg-muted/60 rounded" />
              </div>
            ))}
          </div>
        )}
        {error && <div className="text-destructive">{error}</div>}

        {!loading && !error && (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.length === 0 && <div>No opportunities found.</div>}
            {recommended.map(op => {
              const applied = applications.some(a => String(a.opportunity?._id || a.opportunity) === String(op._id || op.id))
              const appObj = applied ? applications.find(a => String(a.opportunity?._id || a.opportunity) === String(op._id || op.id)) : null
              return (
              <Card key={op._id || op.id} className="overflow-hidden cursor-pointer" accent="primary" onClick={() => setActiveOpportunity(op)}>
                <div className="h-40 w-full flex items-center justify-center bg-gradient-to-br from-[color:var(--card-accent)]/80 to-black/10 text-primary-foreground">
                  <span className="text-2xl font-bold">{(op.title || '').slice(0,1)}</span>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-md font-semibold">{op.title}</h3>
                      <div className="text-sm text-muted-foreground">{op.company || op.owner?.company || 'Unknown Company'}</div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="muted" className="capitalize">{op.type || 'job'}</Badge>
                        {applied && <Badge variant="outline" className="text-[10px]">Applied</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                    <MapPin className="w-4 h-4" />
                    <span>{op.location || 'Remote'}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">{(op.description || '').slice(0,140)}{(op.description||'').length>140?'...':''}</p>
                  {applied && (
                    <div className="mt-4">
                      <OpportunityMiniTracker status={appObj?.status || 'applied'} />
                    </div>
                  )}
                </CardContent>
              </Card>)})}
          </div>
        )}
      </section>

      {/* Recent Applications & Skill Focus */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Recent Applications</h2>
          <div className="space-y-2">
            {appsLoading && (
              <div className="space-y-2">{Array.from({ length:3 }).map((_,i)=><div key={i} className="h-10 rounded border bg-card flex items-center px-3"><span className="w-2 h-2 rounded-full bg-primary/40 mr-2" /><span className="text-xs text-muted-foreground">Loading...</span></div>)}</div>
            )}
            {!appsLoading && applications.slice(0,5).map(a => (
              <div key={a._id} className="rounded border bg-card p-2 flex items-center justify-between text-xs">
                <div className="truncate max-w-[160px]">
                  <span className="font-medium">{a.opportunity?.title || 'Opportunity'}</span>
                  <span className="text-muted-foreground ml-1">{a.opportunity?.type}</span>
                </div>
                <div className={`px-2 py-0.5 rounded-full capitalize text-[10px] ${a.status==='rejected'?'bg-destructive/10 text-destructive':'bg-primary/10 text-primary'}`}>{a.status}</div>
              </div>
            ))}
            {!appsLoading && applications.length === 0 && <div className="text-xs text-muted-foreground">No applications yet.</div>}
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Skill Focus</h2>
          <div className="text-xs text-muted-foreground">Top skills from roles you viewed recently (mock)</div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {['React','SQL','Data Viz','Python','Copywriting','SEO','Communication','Leadership'].map(s => (
              <div key={s} className="rounded border bg-card px-2 py-1 flex items-center justify-between">
                <span>{s}</span>
                <span className="text-muted-foreground">{Math.floor(Math.random()*40)+10}%</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground">Real personalization coming soon.</div>
        </div>
      </section>
    </div>
  )
}
