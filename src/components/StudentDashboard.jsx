import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Card, CardHeader, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { MapPin } from 'lucide-react'

export default function StudentDashboard({ profile }) {
  const [recommended, setRecommended] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await axios.get('/api/opportunities')
        if (cancelled) return
        setRecommended(res.data.opportunities || [])
      } catch (err) {
        if (cancelled) return
        setError(err.response?.data?.message || err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // sample stats — replace with real API data when available
  const stats = [
    { id: 's1', label: 'Applications Sent', value: 12 },
    { id: 's2', label: 'Interviews', value: 3 },
    { id: 's3', label: 'Offers', value: 1 },
  ]

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back, {profile?.fullName || 'Student'}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Here's what's happening with your job search</p>
        </div>
      </header>

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(s => (
            <Card key={s.id} className="p-4">
              <CardHeader>
                <div className="text-sm text-slate-500">{s.label}</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Recommended Opportunities</h2>
          <div className="text-sm text-slate-500">Based on your profile</div>
        </div>

        {loading && <div>Loading opportunities...</div>}
        {error && <div className="text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.length === 0 && <div>No opportunities found.</div>}
            {recommended.map(op => (
              <div key={op._id || op.id} className="bg-white dark:bg-slate-900 border rounded-lg overflow-hidden shadow-sm">
                <div className="h-40 bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-white">{/* placeholder image */}
                  <span className="text-lg font-bold">{(op.title || '').slice(0,1)}</span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-md font-semibold">{op.title}</h3>
                      <div className="text-sm text-slate-500">{op.company || op.owner?.company || 'Unknown Company'}</div>
                    </div>
                    <div className="flex-shrink-0">
                      <Badge>{op.type || 'Job'}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-3">
                    <MapPin className="w-4 h-4" />
                    <span>{op.location || 'Remote'}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">{(op.description || '').slice(0,140)}{(op.description||'').length>140?'...':''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
