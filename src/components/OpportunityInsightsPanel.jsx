import React, { useEffect, useState, useMemo } from 'react'
import ApplicantsManageModal from './ApplicantsManageModal'
import axios from 'axios'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import useFeatureGate from '@/hooks/useFeatureGate'

// Very lightweight charts using inline bars to avoid adding libs now
function BarChart({ data, max, colorVar='--primary', height=56 }) {
  const entries = Object.entries(data || {})
  if (!entries.length) return <div className="text-xs text-muted-foreground">No data</div>
  return (
    <div className="w-full space-y-1">
      {entries.map(([label,val]) => {
        const pct = max ? (val / max) * 100 : 0
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex-1">
              <div className="h-3 rounded bg-muted relative overflow-hidden">
                <div style={{ width: pct + '%', background: `hsl(var(${colorVar}))` }} className="absolute inset-y-0 left-0 transition-all" />
              </div>
            </div>
            <div className="w-24 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="truncate max-w-[80px]" title={label}>{label}</span>
              <span className="font-medium text-foreground">{val}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function OpportunityInsightsPanel({ opportunityId, canManage }) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showManage, setShowManage] = useState(false)
  const { hasFeature } = useFeatureGate()

  useEffect(() => {
    if (!opportunityId) return
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      try {
        const token = localStorage.getItem('token')
        if (!token) throw new Error('Not authenticated')
        const res = await axios.get(`/api/opportunities/${opportunityId}/insights`, { headers: { Authorization: `Bearer ${token}` } })
        if (cancelled) return
        setInsights(res.data.insights || null)
      } catch (e) {
        if (cancelled) return
        setError(e.response?.data?.message || e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [opportunityId])

  const maxRegion = useMemo(() => insights ? Math.max(0,...Object.values(insights.regions||{})) : 0, [insights])
  const maxSkill = useMemo(() => insights ? Math.max(0,...Object.values(insights.skills||{})) : 0, [insights])

  if (!hasFeature('opportunityInsights')) {
    return <div className="text-xs text-muted-foreground">Upgrade subscription to view insights.</div>
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="grid md:grid-cols-3 gap-3">
          {Array.from({ length:3 }).map((_,i)=>(<div key={i} className="p-3 rounded border bg-card space-y-2"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-5 w-10" /><Skeleton className="h-2 w-full" /></div>))}
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }
  if (error) return <div className="text-sm text-destructive">{error}</div>
  if (!insights) return null

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-3"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Applicants</div><div className="text-xl font-semibold mt-1">{insights.applicantsTotal}</div></Card>
        <Card className="p-3"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Detail Views</div><div className="text-xl font-semibold mt-1">{insights.detailViews}</div></Card>
        <Card className="p-3"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Site Clicks</div><div className="text-xl font-semibold mt-1">{insights.companySiteViews}</div></Card>
        <Card className="p-3 flex flex-col justify-between"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Conversion</div><div className="text-xl font-semibold mt-1">{insights.detailViews ? Math.round((insights.applicantsTotal/Math.max(1,insights.detailViews))*100) : 0}%</div></Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border bg-card">
          <CardHeader className="p-3 pb-2"><h4 className="text-sm font-medium">Regional Distribution</h4></CardHeader>
          <CardContent className="p-3 pt-0"><BarChart data={insights.regions} max={maxRegion} colorVar="--primary" /></CardContent>
        </Card>
        <Card className="border bg-card">
          <CardHeader className="p-3 pb-2"><h4 className="text-sm font-medium">Skill Distribution</h4></CardHeader>
          <CardContent className="p-3 pt-0"><BarChart data={insights.skills} max={maxSkill} colorVar="--accent" /></CardContent>
        </Card>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Applicants</h4>
          {canManage && <Button size="xs" variant="outline" onClick={()=>setShowManage(true)}>Manage</Button>}
        </div>
        {insights.applicantsTotal === 0 && <div className="text-xs text-muted-foreground">No applicants yet.</div>}
        {insights.applicantsTotal > 0 && (
          <div className="border rounded overflow-hidden">
            <div className="grid grid-cols-12 bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground px-3 py-2">
              <div className="col-span-4">Name</div>
              <div className="col-span-3">Location</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-2 text-center">Skills</div>
              <div className="col-span-1 text-right">Match</div>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y">
              {(insights.applicants || []).slice(0, 8).map((applicant) => (
                <div key={applicant.id} className="grid grid-cols-12 items-center gap-2 px-3 py-2 text-xs">
                  <div className="col-span-4 truncate">
                    <div className="font-medium text-foreground">{applicant.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{applicant.email || '—'}</div>
                  </div>
                  <div className="col-span-3 truncate text-muted-foreground">{applicant.location || '—'}</div>
                  <div className="col-span-2 flex justify-center">
                    <Badge variant={applicant.status === 'rejected' ? 'outline' : 'secondary'} className="text-[10px] capitalize">{applicant.status || 'applied'}</Badge>
                  </div>
                  <div className="col-span-2 text-center text-muted-foreground truncate">
                    {(applicant.skills || []).slice(0, 2).join(', ') || '—'}
                  </div>
                  <div className="col-span-1 text-right font-semibold text-foreground">{typeof applicant.matchPercent === 'number' ? `${applicant.matchPercent}%` : '—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {showManage && canManage && (
        <ApplicantsManageModal opportunityId={opportunityId} onClose={()=>setShowManage(false)} />
      )}
    </div>
  )
}
