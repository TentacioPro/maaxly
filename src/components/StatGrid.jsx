import React from 'react'

export default function StatGrid({ children, cols = { base:1, sm:2, md:3, lg:4 } }) {
  const cls = `grid gap-4 grid-cols-1 ${cols.sm? 'sm:grid-cols-'+cols.sm:''} ${cols.md? 'md:grid-cols-'+cols.md:''} ${cols.lg? 'lg:grid-cols-'+cols.lg:''}`
  return <div className={cls}>{children}</div>
}
