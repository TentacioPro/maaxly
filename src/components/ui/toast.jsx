import * as React from 'react'

const ToastContext = React.createContext(null)

export function ToasterProvider({ children }) {
  const [toasts, setToasts] = React.useState([])

  const push = (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`
    setToasts((s) => [...s, { id, ...toast }])
    if (toast.duration !== 0) {
      setTimeout(() => {
        setToasts((s) => s.filter(t => t.id !== id))
      }, toast.duration || 4000)
    }
    return id
  }

  const remove = (id) => setToasts((s) => s.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ push, remove }}>
      {children}
      <div aria-live="polite" className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`max-w-sm w-full rounded-md px-4 py-2 shadow-lg ${t.variant === 'destructive' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'}`}>
            <div className="font-medium">{t.title}</div>
            {t.description && <div className="text-sm mt-1 opacity-90">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToasterProvider')
  return ctx
}

export default function Toaster() {
  // lightweight: kept for compatibility if imported directly
  return null
}
