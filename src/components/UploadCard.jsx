import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { Button } from './ui/button'

export default function UploadCard({ title, description, accept, onSelect, value, actionLabel='Upload', helper, maxSizeMB=5, comingSoon }) {
  return (
    <Card className="relative overflow-hidden">
      {comingSoon && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur flex items-center justify-center text-sm font-medium">
          Coming Soon
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {value ? (
          <div className="space-y-1 text-sm">
            <div className="font-medium break-all">{value.name || value}</div>
            <div className="text-muted-foreground text-xs">Ready • replace to update</div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No file selected.</div>
        )}
        {helper && <div className="text-xs text-muted-foreground mt-3 leading-relaxed">{helper}</div>}
        <div className="text-xs text-muted-foreground mt-3">Max size: {maxSizeMB}MB • Accepted: {accept || '—'}</div>
      </CardContent>
      <CardFooter>
        <Button type="button" size="sm" disabled={comingSoon} onClick={() => {
          if (comingSoon) return
          const input = document.createElement('input')
          input.type = 'file'
          if (accept) input.accept = accept
          input.onchange = (e) => {
            const file = e.target.files?.[0]
            if (file && onSelect) onSelect(file)
          }
          input.click()
        }}>{actionLabel}</Button>
      </CardFooter>
    </Card>
  )
}
