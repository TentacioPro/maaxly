import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PersonalizationPanel from '@/components/PersonalizationPanel'

export default function PersonalizationWindow({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 w-full max-w-3xl">
        <DialogHeader>
          <DialogTitle>Personalization</DialogTitle>
        </DialogHeader>
        <div className="max-h-[80vh] overflow-y-auto">
          <PersonalizationPanel />
        </div>
      </DialogContent>
    </Dialog>
  )
}
