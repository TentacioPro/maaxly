import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const STATUSES = ['applied','screening','interview','offer','rejected']

export default function ApplicantsManageModal({ opportunityId, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])
  const [updating, setUpdating] = useState({}) // applicationId -> true

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      try {
        const token = localStorage.getItem('token')
        if (!token) throw new Error('Not authenticated')
        const res = await axios.get(`/api/opportunities/${opportunityId}/applicants`, { headers: { Authorization: `Bearer ${token}` } })
        if (cancelled) return
        setItems(res.data.applicants || [])
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [opportunityId])

  async function updateStatus(appId, status) {
    setUpdating(prev => ({ ...prev, [appId]: true }))
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Not authenticated')
      await axios.patch(`/api/applications/${appId}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } })
      setItems(prev => prev.map(a => a._id === appId ? { ...a, status, history: [...(a.history||[]), { status, at: new Date().toISOString() }] } : a))
      try { window.dispatchEvent(new CustomEvent('applicationStatusChanged', { detail: { applicationId: appId, status } })) } catch (e) {}
    } catch (e) {
      // Optionally surface toast - keeping lightweight
      console.error(e)
    } finally {
      setUpdating(prev => ({ ...prev, [appId]: false }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="p-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-medium">Manage Applicants</h3>
          <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
          {loading && (
            <div className="p-6 space-y-4">
              {Array.from({ length:4 }).map((_,i)=>(<div key={i} className="flex items-center gap-4"><Skeleton className="h-10 w-full" /></div>))}
            </div>
          )}
          {error && <div className="p-6 text-sm text-destructive">{error}</div>}
          {!loading && !error && (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Applicant</th>
                    <th className="text-left px-4 py-2 font-medium">Location</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground text-xs">No applicants yet.</td></tr>
                  )}
                  {items.map(a => (
                    <tr key={a._id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 align-top">
                        <div className="font-medium text-xs break-words max-w-[180px]">{a.applicant?.email || a.applicant?._id}</div>
                      </td>
                      <td className="px-4 py-2 align-top text-xs text-muted-foreground">{a.applicant?.location || 'Unknown'}</td>
                      <td className="px-4 py-2 align-top">
                        <Badge variant="outline" className="text-[10px] capitalize">{a.status}</Badge>
                      </td>
                      <td className="px-4 py-2 align-top">
                        <div className="flex flex-wrap gap-1">
                          {STATUSES.filter(s => s!==a.status).map(s => (
                            <Button key={s} size="xs" variant="secondary" disabled={!!updating[a._id]} onClick={() => updateStatus(a._id, s)} className="text-[10px] px-2 py-1">
                              {updating[a._id] ? '...' : s}
                            </Button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
