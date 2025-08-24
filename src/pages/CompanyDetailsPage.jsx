import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { useToast } from '../components/ui/toast'
import { Card, CardHeader, CardContent } from '../components/ui/card'

export default function CompanyDetailsPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState(null)
  const [error, setError] = useState(null)
  const toast = useToast()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await axios.get(`/api/profile/employer/${id}`)
        if (cancelled) return
        setCompany(res.data.profile || res.data)
      } catch (err) {
        if (cancelled) return
  const msg = err.response?.data?.message || err.message
  toast.push({ title: 'Load failed', description: msg, variant: 'destructive' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>
  if (error) return <div style={{ padding: 24, color: 'crimson' }}>{error}</div>
  if (!company) return <div style={{ padding: 24 }}>Company not found</div>

  return (
    <div className="w-full md:w-[80%] mx-auto px-3 py-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">{company.companyName || company.name || 'Company'}</h2>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">{company.companyWebsite}</div>
          <div className="mt-4">
            <h3 className="text-sm font-semibold">About</h3>
            <div className="mt-2 text-sm text-muted-foreground">{company.about || company.description || 'No additional details.'}</div>
          </div>
          <div className="mt-4 text-sm">
            <div><strong>Contact</strong></div>
            <div className="text-sm">{company.contactEmail || company.email || '—'}</div>
            <div className="text-sm">{company.contactPhone || company.phone || '—'}</div>
          </div>
        </CardContent>
      </Card>
      <div className="mt-4">
        <Link to="/opportunities" className="text-sm underline">← Back to Opportunities</Link>
      </div>
    </div>
  )
}
