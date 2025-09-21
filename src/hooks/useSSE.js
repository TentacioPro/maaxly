// Lightweight SSE hook with auto-reconnect and typed event handlers
export default function useSSE({ onMessageCreated, onConversationCreated, onAck }) {
  const urlBase = '/api/events/stream'

  let es = null
  let reconnectTimer = null
  let closed = false

  function connect() {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('token')
    const url = token ? `${urlBase}?token=${encodeURIComponent(token)}` : urlBase
    es = new EventSource(url)

    // older server paths may emit 'message' (Redis) or 'message:created' (internal bus)
    const handleMessageEvent = (e) => {
      try {
        const payload = JSON.parse(e.data)
        // normalize to { conversationId, message }
        if (payload && payload.message && payload.conversationId === undefined) {
          // payload is { type: 'message', message: { conversationId, ... } }
          const m = payload.message
          if (onMessageCreated) onMessageCreated({ conversationId: m.conversationId, message: m })
          return
        }
        if (payload && payload.conversationId && (payload.message || payload.messageId)) {
          // payload could be { conversationId, message: {...} } or { conversationId, messageId, sender... }
          const msg = payload.message || payload
          if (onMessageCreated) onMessageCreated({ conversationId: payload.conversationId, message: msg })
          return
        }
        // fallback: pass through
        if (onMessageCreated) onMessageCreated(payload)
      } catch (err) {}
    }

    es.addEventListener('message:created', handleMessageEvent)
    es.addEventListener('message', handleMessageEvent)

    es.addEventListener('conversation:created', (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (onConversationCreated) onConversationCreated(payload)
      } catch (err) {}
    })

    es.addEventListener('ack', (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (onAck) onAck(payload)
      } catch (err) {}
    })

    es.onopen = () => {
      // clear reconnect if any
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    }

    es.onerror = () => {
      // try reconnect
      if (es) { try { es.close() } catch(_) {} es = null }
      if (!closed) {
        reconnectTimer = setTimeout(() => connect(), 3000)
      }
    }
  }

  function start() {
    closed = false
    connect()
  }

  function stop() {
    closed = true
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    if (es) { try { es.close() } catch(_) {} es = null }
  }

  return { start, stop }
}
