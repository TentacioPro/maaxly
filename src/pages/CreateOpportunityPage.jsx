import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader } from '../components/ui/card'
import { Button } from '../components/ui/button'
import OpportunityForm from '@/components/OpportunityForm'
import { useToast } from '../components/ui/toast'

export default function CreateOpportunityPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const toast = useToast()

  async function handleSubmit(payload) {
    setError(null)
    const token = localStorage.getItem('token')
    if (!token) {
      toast.push({ title: 'Not allowed', description: 'You must be logged in as an employer to create an opportunity', variant: 'destructive' })
      return false
    }
    setLoading(true)
    try {
      await axios.post('/api/opportunities', payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      navigate('/dashboard', { state: { fromCreate: true } })
      return true
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to create opportunity'
      toast.push({ title: 'Create failed', description: msg, variant: 'destructive' })
      throw err
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto my-6">
      <Card className="flex flex-col">
        <CardHeader className="py-3 px-4 border-b">
          <h2 className="text-lg font-semibold">Create Opportunity</h2>
        </CardHeader>

        <OpportunityForm
          onSubmit={handleSubmit}
          submitLabel={loading ? 'Creating…' : 'Create Opportunity'}
        />
      </Card>
    </div>
  )
}
