import React from 'react'
import PersonalizationPanel from '@/components/PersonalizationPanel'

export default function PersonalizationPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Personalization</h1>
      </div>
      <div className="border rounded-md bg-card text-card-foreground">
        <PersonalizationPanel />
      </div>
    </div>
  )
}
