import React from 'react'
import { Skeleton } from './ui/skeleton'

export default function ApplicationsListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_,i) => (
        <div key={i} className="rounded border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-4 w-14" />
          </div>
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-[92%]" />
            <div className="flex justify-between text-[10px]">
              {Array.from({ length:4 }).map((__,j)=>(<Skeleton key={j} className="h-2 w-10" />))}
            </div>
        </div>
      ))}
    </div>
  )
}
