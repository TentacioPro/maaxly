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
          <p className="text-sm text-muted-foreground">Here's what's happening with your job search</p>
        </div>
      </header>

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(s => (
            <Card key={s.id} className="p-4">
              <CardHeader>
                <div className="text-sm text-muted-foreground">{s.label}</div>
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
          <div className="text-sm text-muted-foreground">Based on your profile</div>
        </div>

        {loading && <div>Loading opportunities...</div>}
  {error && <div className="text-destructive">{error}</div>}

        {!loading && !error && (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.length === 0 && <div>No opportunities found.</div>}
            {recommended.map(op => (
              <div key={op._id || op.id} className="bg-card text-card-foreground border rounded-lg overflow-hidden shadow-sm">
                <div className="h-40 bg-[linear-gradient(to_bottom_right,var(--color-primary)_0%,color-mix(in_oklab,var(--color-primary)_70%,black)_100%)] text-primary-foreground flex items-center justify-center">{/* placeholder image */}
                  <span className="text-lg font-bold">{(op.title || '').slice(0,1)}</span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-md font-semibold">{op.title}</h3>
                      <div className="text-sm text-muted-foreground">{op.company || op.owner?.company || 'Unknown Company'}</div>
                    </div>
                    <div className="flex-shrink-0">
                      <Badge variant="muted" className="capitalize">{op.type || 'job'}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                    <MapPin className="w-4 h-4" />
                    <span>{op.location || 'Remote'}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">{(op.description || '').slice(0,140)}{(op.description||'').length>140?'...':''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
