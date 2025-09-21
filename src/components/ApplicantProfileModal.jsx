import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function ApplicantProfileModal({ applicationId, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!applicationId) return
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      try {
        const token = localStorage.getItem('token')
        if (!token) throw new Error('Not authenticated')
        const res = await axios.get(`/api/applications/${applicationId}`, { headers: { Authorization: `Bearer ${token}` } })
        if (cancelled) return
        setData(res.data.application || null)
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [applicationId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="p-4 pb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">Applicant Profile</h3>
          <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
        </CardHeader>
        <CardContent className="p-4 overflow-y-auto text-sm space-y-6">
          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}
          {error && <div className="text-destructive text-xs">{error}</div>}
          {!loading && !error && data && (
            <div className="space-y-6">
              <section className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Identity</div>
                <div className="font-medium text-sm">{data.applicant?.fullName || data.applicant?.email || 'Unknown'}</div>
                <div className="text-xs text-muted-foreground">{data.applicant?.location || 'Location unknown'}</div>
              </section>
              <section className="space-y-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Skills</div>
                <div className="flex flex-wrap gap-1">
                  {(data.applicant?.skills || []).length ? data.applicant.skills.map(s => <span key={s} className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">{s}</span>) : <span className="text-[11px] text-muted-foreground">No skills listed.</span>}
                </div>
              </section>
              <section className="space-y-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Application</div>
                <div className="text-[11px] flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary capitalize">{data.status}</span>
                  <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary-foreground">Created {new Date(data.createdAt).toLocaleString()}</span>
                </div>
                {data.coverLetter && (
                  <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap border rounded bg-muted/30 p-3">{data.coverLetter}</div>
                )}
              </section>
              <section className="space-y-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">History</div>
                <ul className="space-y-1 text-[11px]">
                  {(data.history || []).slice().reverse().map((h,i)=>(
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                      <span className="capitalize font-medium">{h.status}</span>
                      <span className="text-muted-foreground">{new Date(h.at || h.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Raw Data</div>
                <pre className="text-[10px] bg-muted p-2 rounded max-h-64 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
              </section>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
