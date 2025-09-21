import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react'
import useSSE from '@/hooks/useSSE'
import axios from 'axios'

// small helper to safely GET JSON with auth header
async function safeGet(url) {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const res = await axios.get(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    return res.data
  } catch (e) {
    return null
  }
}

const MessagingContext = createContext(null)

export function MessagingProvider({ children }) {
  const [conversations, setConversations] = useState([])
  const [openWindows, setOpenWindows] = useState([])
  const [unreadCounts, setUnreadCounts] = useState({})
  const [currentUser, setCurrentUser] = useState(null)
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [messagesByConversation, setMessagesByConversation] = useState({})
  const ackStatusRef = useRef({})

  // load messages for a conversation (cached)
  async function loadMessages(conversationId, opts = { limit: 50 }) {
    if (!conversationId) return []
    const cid = String(conversationId)
    // return cached if present
    if (messagesByConversation[cid] && messagesByConversation[cid].length) return messagesByConversation[cid]
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await axios.get(`/api/messages/history?conversationId=${conversationId}&limit=${opts.limit}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const data = res && res.data
      const msgs = (data && data.messages) || []
      // already oldest -> newest per API
      const ordered = Array.isArray(msgs) ? msgs : []
      // If history endpoint returned nothing, fall back to legacy endpoint which may still have messages
      if (ordered.length === 0) {
        try {
          const res2 = await axios.get(`/api/messages/${conversationId}?limit=${opts.limit}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
          const data2 = res2 && res2.data
          const legacyMsgs = (data2 && data2.messages) || []
          const legacyOrdered = Array.isArray(legacyMsgs) ? legacyMsgs.slice().reverse() : []
          setMessagesByConversation(prev => ({ ...prev, [cid]: legacyOrdered }))
          return legacyOrdered
        } catch (e2) {
          // ignore fallback error
        }
      }
  setMessagesByConversation(prev => ({ ...prev, [cid]: ordered }))
      return ordered
    } catch (e) {
      return []
    }
  }

  // centralized sendMessage to update provider cache and notify other windows
  async function sendMessage(conversationId, text) {
    if (!conversationId || !text) return null
    const cid = String(conversationId)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    // optimistic message
    const tempId = `tmp-${Date.now()}`
    const senderObj = currentUser ? { _id: currentUser._id || currentUser.id, email: currentUser.email } : 'me'
    const temp = { _id: tempId, text, sender: senderObj, createdAt: new Date().toISOString(), optimistic: true }
    setMessagesByConversation(prev => {
      const prevList = Array.isArray(prev[cid]) ? prev[cid] : []
      return { ...prev, [cid]: [...prevList, temp] }
    })
    try {
      const res = await axios.post('/api/messages', { conversationId, text }, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const data = res && res.data
      // server may return full message or messageId
      const serverMsg = (data && data.message) || (data && data.messageId ? { ...temp, _id: data.messageId, optimistic: false } : null)
      if (serverMsg) {
        setMessagesByConversation(prev => {
          const list = Array.isArray(prev[cid]) ? prev[cid] : []
          // replace temp message
          const next = list.map(m => m._id === tempId ? { ...serverMsg } : m)
          return { ...prev, [cid]: next }
        })
        // update conversations lastMessage (compare string ids)
        setConversations(prev => prev.map(c => String(c._id) === cid ? { ...c, lastMessage: serverMsg } : c))
        return serverMsg
      }
      return null
    } catch (e) {
      // mark temp as failed
      setMessagesByConversation(prev => {
        const list = Array.isArray(prev[cid]) ? prev[cid] : []
        return { ...prev, [cid]: list.map(m => m._id === tempId ? { ...m, failed: true } : m) }
      })
      return null
    }
  }

  // Centralized ack function to avoid duplicate ack requests across multiple windows
  async function ackConversation(conversationId, lastSeenMessageId) {
    if (!conversationId || !lastSeenMessageId) return false
    const cid = String(conversationId)
    const status = ackStatusRef.current[cid] || { lastAckedId: null, inFlight: false }
    if (status.lastAckedId === lastSeenMessageId || status.inFlight) return false
    ackStatusRef.current[cid] = { lastAckedId: lastSeenMessageId, inFlight: true }
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) { ackStatusRef.current[cid] = { lastAckedId: null, inFlight: false }; return false }
      await axios.post(`/api/messages/${cid}/ack`, { lastSeenMessageId }, { headers: { Authorization: `Bearer ${token}` } })
      // clear unread count for this conversation locally
      setUnreadCounts(prev => { const copy = { ...prev }; delete copy[cid]; return copy })
      // mark ack as complete
      ackStatusRef.current[cid] = { lastAckedId: lastSeenMessageId, inFlight: false }
      return true
    } catch (err) {
      // on error, clear so we can retry later
      ackStatusRef.current[cid] = { lastAckedId: null, inFlight: false }
      return false
    }
  }

  // fetch initial conversations and start SSE only after login/token available
  useEffect(() => {
    let cancelled = false
    async function initForAuthenticatedUser() {
      // derive current user id from JWT token (sub claim) to reliably detect sender identity
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        if (!token) return
        try {
          const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
          if (!cancelled && payload && payload.sub) setCurrentUser({ _id: payload.sub, email: payload.email })
        } catch (_) {
          // ignore decode errors
        }
        const data = await safeGet('/api/messages')
        const convsRaw = data && data.conversations ? data.conversations : (Array.isArray(data) ? data : [])
        // normalize conversations to ensure each has a string _id
        const convs = Array.isArray(convsRaw) ? convsRaw.map(c => ({ ...c, _id: String(c._id || c.id || c.conversationId || '') })) : []
        if (!cancelled && Array.isArray(convs)) {
          setConversations(convs)
          // previously we auto-opened the most recent conversation in the dock on page load.
          // That caused mini chat bubbles to pop open when users refresh — avoid that by
          // not opening windows automatically. We will still preload messages for the
          // most recent conversation for snappier UX, but keep it settled in the dock.
          if (convs.length) {
            const first = convs[0]
            try {
              // preload messages for the most recent conversation but do NOT open it
              await loadMessages(first._id, { limit: 100 })
            } catch (e) { /* ignore preload errors */ }
          }
        }
      } catch (_) {}
    }
    initForAuthenticatedUser()
    return () => { cancelled = true }
  }, [/* run when provider mounts and when other code reads token/localStorage */])

  // presence polling for participants in open conversations
  const presenceTimerRef = useRef(null)
  useEffect(() => {
    function startPolling() {
      if (presenceTimerRef.current) return
      // poll less frequently to reduce load
      presenceTimerRef.current = setInterval(async () => {
        try {
          // gather participant ids only for open windows or active conversation to avoid polling all conversations
          const ids = new Set()
          // prefer open windows (dock/main) participants
          openWindows.forEach(c => c.participants?.forEach(p => p.user && ids.add(String(p.user._id))))
          // also include activeConversation participants if not already present
          if (activeConversationId) {
            const active = conversations.find(c => String(c._id) === String(activeConversationId))
            if (active) active.participants?.forEach(p => p.user && ids.add(String(p.user._id)))
          }
          for (const id of ids) {
            const data = await safeGet(`/api/users/${id}/presence`)
            if (data) {
              // attach presence to any matching participant object
              setConversations(prev => prev.map(c => ({
                ...c,
                participants: c.participants?.map(p => p.user && String(p.user._id) === String(id) ? { ...p, presence: data } : p)
              })))
            }
          }
        } catch (_) {}
      }, 60 * 1000)
    }
    if (openWindows.length || activeConversationId) startPolling()
    return () => { if (presenceTimerRef.current) { clearInterval(presenceTimerRef.current); presenceTimerRef.current = null } }
  }, [conversations, openWindows, activeConversationId])

  // openConversation now takes an optional `options` object.
  // If `options.userInitiated` is true, we open a dock window. Otherwise this call
  // may be used for preloading/navigation without showing the mini-window.
  function openConversation(conv, options = {}) {
    const id = conv && (conv._id || conv.id || conv.conversationId)
    const normalized = { ...conv, _id: id ? String(id) : String(Date.now()) }
    // Only open the dock window if user explicitly initiated the action.
    if (!options.userInitiated && !options.forceOpen) return
    setOpenWindows((prev) => {
      if (prev.find((c) => String(c._id) === String(normalized._id))) return prev
      return [normalized, ...prev].slice(0, 3)
    })
  }

  function toggleMinimize(convId) {
    const cid = String(convId)
    setOpenWindows(prev => prev.map(w => String(w._id) === cid ? { ...w, minimized: !w.minimized } : w))
  }

  // open a conversation in the main messages view (independent of the dock)
  function openInMain(convOrId) {
    const id = convOrId && (convOrId._id || convOrId)
    if (!id) return
    setActiveConversationId(String(id))
  }

  function closeWindow(convId) {
    const cid = String(convId)
    setOpenWindows((prev) => prev.filter((c) => String(c._id) !== cid))
  }

  // SSE handlers
  const sse = useMemo(() => useSSE({
    onMessageCreated: (payload) => {
      // payload: { conversationId, message }
      const cid = String(payload.conversationId)
      setConversations((prev) => {
        const idx = prev.findIndex((c) => String(c._id) === cid)
        if (idx === -1) return prev
        const next = [...prev]
        next[idx] = { ...next[idx], lastMessage: payload.message }
        return next
      })

      // append to cache for open conversations (or create cache)
      setMessagesByConversation(prev => {
        const prevList = Array.isArray(prev[cid]) ? prev[cid] : []
        // ensure we don't duplicate if message already exists
        if (prevList.find(m => String(m._id) === String(payload.message._id) || String(m._id) === String(payload.message.messageId))) return prev
        return { ...prev, [cid]: [...prevList, payload.message] }
      })

      // increment unread count unless window is open
      setUnreadCounts((prev) => {
        const isOpenInDock = openWindows.some((w) => String(w._id) === cid)
        const isOpenInMain = activeConversationId && String(activeConversationId) === cid
        if (isOpenInDock || isOpenInMain) return prev
        return { ...prev, [cid]: (prev[cid] || 0) + 1 }
      })
    },
    onConversationCreated: (payload) => {
      // normalize incoming conversation id before adding
      const normalized = { ...payload, _id: String(payload._id || payload.id || payload.conversationId || '') }
      setConversations((prev) => [normalized, ...prev])
    },
    onAck: (payload) => {
      // payload: { conversationId }
      const cid = String(payload.conversationId)
      setUnreadCounts((prev) => { const copy = { ...prev }; delete copy[cid]; return copy })
      setConversations((prev) => prev.map((c) => String(c._id) === cid ? { ...c, lastSeenMessageId: payload.lastSeenMessageId } : c))
    }
  }), [openWindows])

  useEffect(() => {
    // only start SSE when we have an authenticated user/token
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return
    sse.start()
    return () => sse.stop()
  }, [sse, currentUser])

  const value = useMemo(() => ({
    conversations,
    openWindows,
    unreadCounts,
    openConversation,
    closeWindow,
    setConversations,
    setUnreadCounts,
    currentUser,
    activeConversationId,
    openInMain,
    messagesByConversation,
    loadMessages
    , ackConversation,
    sendMessage,
    toggleMinimize
  }), [conversations, openWindows, unreadCounts, currentUser, activeConversationId, messagesByConversation])

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  )
}

export function useMessaging() {
  const ctx = useContext(MessagingContext)
  if (!ctx) throw new Error('useMessaging must be used within MessagingProvider')
  return ctx
}
