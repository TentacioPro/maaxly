import React from 'react'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export default function Sidebar({ open, onOpenChange, trigger, children }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent side="left" className="p-0">
        <SheetHeader className="border-b">
          <SheetTitle className="px-4 py-2">Menu</SheetTitle>
        </SheetHeader>
  <div className="h-full overflow-y-auto">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
