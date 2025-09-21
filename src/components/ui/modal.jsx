import * as React from 'react'
import { Dialog, DialogContent } from './dialog'
import { cn } from '@/lib/utils'

export function Modal({ open, onOpenChange, onClose, children, className, ...props }) {
  function handleOpenChange(next) {
    try {
      if (typeof onOpenChange === 'function') onOpenChange(next)
    } finally {
      if (!next && typeof onClose === 'function') onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn('max-w-2xl', className)} {...props}>
        {children}
      </DialogContent>
    </Dialog>
  )
}

export function ModalHeader({ children, className, ...props }) {
  return (
    <div className={cn('px-6 pt-6 pb-2', className)} {...props}>
      {children}
    </div>
  )
}

export function ModalBody({ children, className, ...props }) {
  return (
    <div className={cn('px-6 py-2', className)} {...props}>
      {children}
    </div>
  )
}

export function ModalFooter({ children, className, ...props }) {
  return (
    <div className={cn('px-6 pb-6 pt-3 flex items-center justify-end', className)} {...props}>
      {children}
    </div>
  )
}

export default Modal
