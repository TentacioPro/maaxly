import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card'

export default function EmployerAnalyticsPage() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics (Preview)</h1>
        <p className="text-sm text-muted-foreground">Deeper performance insights for your listings.</p>
      </header>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Coming Soon</CardTitle>
          <CardDescription>We are building rich, actionable dashboards.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div>• Time-series applicants chart</div>
          <div>• Skill match distribution</div>
          <div>• Source attribution (organic vs referral)</div>
          <div>• Candidate quality scoring</div>
        </CardContent>
      </Card>
    </div>
  )
}
