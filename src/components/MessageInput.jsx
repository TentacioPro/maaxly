import React, { useEffect, useRef, useState } from 'react'
import { Button } from './ui/button'

export default function MessageInput({ onSend, placeholder = 'Write a message...' }) {
  const [text, setText] = useState('')
  const taRef = useRef(null)

  useEffect(() => {
    if (!taRef.current) return
    taRef.current.style.height = 'auto'
    // auto-size but do not programmatically 'expand' on Shift+Enter
    taRef.current.style.height = Math.min(160, taRef.current.scrollHeight) + 'px'
  }, [text])

  function submit() {
    const t = text.trim()
    if (!t) return
    onSend && onSend(t)
    setText('')
    if (taRef.current) taRef.current.style.height = 'auto'
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
    // if Shift+Enter, allow newline insertion but do not toggle any expansion UI
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1">
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full resize-none rounded-lg bg-white/70 border border-border p-3 text-sm placeholder:text-muted-foreground shadow-sm"
          rows={1}
        />
      </div>
      <div className="flex flex-col items-end">
        <Button onClick={submit} variant="primary" className="ml-2">Send</Button>
      </div>
    </div>
  )
}
