import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Lightweight Overview "chart" without external deps; visually similar grid of bars
function Overview() {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const data = months.map((name) => ({ name, total: Math.floor(Math.random() * 5000) + 1000 }))
  const max = Math.max(...data.map(d => d.total))

  return (
    <div className="h-[350px] w-full flex items-end gap-3 overflow-x-auto pe-2">
      {data.map((d) => (
        <div key={d.name} className="flex flex-col items-center gap-2">
          <div
            className="bg-primary/80 hover:bg-primary transition-colors w-6 rounded-md"
            style={{ height: `${Math.max(6, Math.round((d.total / max) * 100))}%` }}
            title={`$${d.total.toLocaleString()}`}
          />
          <span className="text-xs text-muted-foreground">{d.name}</span>
        </div>
      ))}
    </div>
  )
}

function RecentSales() {
  const items = [
    { name: 'Olivia Martin', email: 'olivia.martin@email.com', amount: 1999 },
    { name: 'Jackson Lee', email: 'jackson.lee@email.com', amount: 39 },
    { name: 'Isabella Nguyen', email: 'isabella.nguyen@email.com', amount: 299 },
    { name: 'William Kim', email: 'will@email.com', amount: 99 },
    { name: 'Sofia Davis', email: 'sofia.davis@email.com', amount: 39 },
  ]
  return (
    <div className="space-y-8">
      {items.map((it) => (
        <div key={it.email} className="flex items-center gap-4">
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
            {it.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm leading-none font-medium">{it.name}</p>
              <p className="text-muted-foreground text-sm">{it.email}</p>
            </div>
            <div className="font-medium">+${it.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function StudentDashboardPage() {
  const cards = [
    {
      title: 'Total Revenue',
      value: '$45,231.89',
      delta: '+20.1% from last month',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="text-muted-foreground h-4 w-4">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      title: 'Subscriptions',
      value: '+2350',
      delta: '+180.1% from last month',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="text-muted-foreground h-4 w-4">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      title: 'Sales',
      value: '+12,234',
      delta: '+19% from last month',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="text-muted-foreground h-4 w-4">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <path d="M2 10h20" />
        </svg>
      ),
    },
    {
      title: 'Active Now',
      value: '+573',
      delta: '+201 since last hour',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="text-muted-foreground h-4 w-4">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Top Heading */}
      <div className="mb-2 flex items-center justify-between space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Button>Download</Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
              {c.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value}</div>
              <p className="text-muted-foreground text-xs">{c.delta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overview + Recent Sales */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="ps-2">
            <Overview />
          </CardContent>
        </Card>
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>You made 265 sales this month.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentSales />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
