import React from 'react'
import AnimatedLineChart from '@/components/charts/AnimatedLineChart'
import AnimatedBarChart from '@/components/charts/AnimatedBarChart'
import { Card, CardContent } from '@/components/ui/card'
import { useTheme } from '@/providers/ThemeProvider'

const sampleSeries = [
  {label:'Mon', value: 120}, {label:'Tue', value:160}, {label:'Wed', value:80}, {label:'Thu', value:200}, {label:'Fri', value:140}
]

export default function EditorThemeDashboard() {
  const { tokens } = useTheme()

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Theme editor — Analytics preview</h1>
        <p className="text-sm text-muted-foreground">Preview chart styles and BI table using the active theme tokens.</p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Traffic</div>
            <div className="mt-2">
              <AnimatedLineChart points={[100,120,90,140,110,150]} width={320} height={64} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Signups</div>
            <div className="mt-2"><AnimatedBarChart series={sampleSeries} width={280} height={100} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Quick stats</div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="text-sm">Active <div className="font-semibold">1.2k</div></div>
              <div className="text-sm">Conversion <div className="font-semibold">3.8%</div></div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-3">Users (BI table)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Role</th>
                    <th className="pb-2">Signups</th>
                    <th className="pb-2">Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({length:6}).map((_,i)=> (
                    <tr key={i} className="border-t border-border/40">
                      <td className="py-3">user{i}@example.com</td>
                      <td className="py-3">student</td>
                      <td className="py-3">{Math.round(100+Math.random()*900)}</td>
                      <td className="py-3">{(Math.random()*10).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
