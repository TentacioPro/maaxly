import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { cn } from '@/lib/utils'
import { useTheme } from '@/providers/ThemeProvider.jsx'
import { X, ChevronUp, ChevronDown } from 'lucide-react'
import MessageInput from '@/components/MessageInput'
import { useMessaging } from '@/providers/MessagingProvider'
import { useProfile } from '@/providers/ProfileProvider'

// helpers
function normalizeMessage(msg) {
  if (!msg) return msg
  // ensure sender is either 'me' or an object { _id, id, email }
  if (!msg.sender) return { ...msg }
  if (typeof msg.sender === 'string') {
    // if string 'me' leave it; if it's an id, convert to object
    if (msg.sender === 'me') return { ...msg }
    return { ...msg, sender: { _id: msg.sender } }
  }
  // if sender is object but missing id fields, keep as-is
  return { ...msg, sender: { ...(msg.sender._id ? { _id: msg.sender._id } : {}), ...(msg.sender.id ? { id: msg.sender.id } : {}), ...(msg.sender.email ? { email: msg.sender.email } : {}) } }
}

function getSender(msg) {
  if (!msg) return null
  if (msg.sender === 'me') return 'me'
  if (!msg.sender) return null
  if (typeof msg.sender === 'string') return { _id: msg.sender }
  return msg.sender
}
export default function ConversationWindow({ conversation, offset = 0, onClose, docked = false, dockWidth = 320, minimized = false }) {
  const { tokens } = useTheme()
  const { currentUser, messagesByConversation, loadMessages, ackConversation, sendMessage, toggleMinimize } = useMessaging()
  const [messages, setMessages] = useState([])
  const [expanded, setExpanded] = useState(false)
  const [visibleTimeFor, setVisibleTimeFor] = useState(null)
  const [isMaximized, setIsMaximized] = useState(false)
  // when docked we start smaller so the dock behaves like a compact composer; expand makes it tall
  // increase default docked height so the compose area is usable
  const [height, setHeight] = useState(docked ? 220 : 384)
  const mountedRef = useRef(false)
  const dragRef = useRef(null)

  const convId = conversation?._id

  function fmtTime(d) {
    if (!d) return ''
    const dt = (d instanceof Date) ? d : new Date(d)
    const today = new Date()
    const isToday = dt.toDateString() === today.toDateString()
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
    const isYesterday = dt.toDateString() === yesterday.toDateString()
    if (isToday) return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    if (isYesterday) return dt.toLocaleDateString()
    return dt.toLocaleString()
  }

  useEffect(() => {
    mountedRef.current = true
    if (!convId) return () => { mountedRef.current = false }

    // load messages from provider cache or fetch and normalize senders, then ack last seen
    const loadAndAck = async () => {
      try {
        const msgs = await loadMessages(convId, { limit: 100 })
        if (!mountedRef.current) return
        const normalized = Array.isArray(msgs) ? msgs.map(normalizeMessage) : []
        setMessages(normalized)

        // (no transient chip for last message time by default)

  // ack when opened - include lastSeenMessageId to satisfy server validation
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
          // pick last message id from returned messages (newest message)
          const lastMsg = Array.isArray(msgs) && msgs.length ? msgs[msgs.length - 1] : null
          const lastSeenMessageId = lastMsg && (lastMsg._id || lastMsg.id) ? (lastMsg._id || lastMsg.id) : null
          if (!token || !lastSeenMessageId) return
          await ackConversation(convId, lastSeenMessageId)
  } catch (e) { /* ignore ack errors */ }

      } catch (_) {}
    }

    loadAndAck()

    return () => { mountedRef.current = false }
  }, [convId, loadMessages, ackConversation])

  // Drag to resize handlers
  function startDrag(e) {
    const startY = e.clientY
    const startH = height
    function onMove(ev) {
      const delta = startY - ev.clientY
      const next = Math.max(192, Math.min(window.innerHeight * 0.8, startH + delta))
      setHeight(next)
    }
    function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function toggleExpand() {
    if (expanded) {
      // back to docked or default collapsed height
      setHeight(docked ? 160 : 384)
      setExpanded(false)
    } else {
      setHeight(Math.floor(window.innerHeight * 0.8))
      setExpanded(true)
    }
  }

  // optimistic send
  async function handleSendMessage(text) {
    if (!text) return
    const res = await sendMessage(convId, text)
    if (res) {
      // update local messages state from provider cache
      setMessages(Array.isArray(messagesByConversation[convId]) ? messagesByConversation[convId] : messages)
    }
  }

  // subscribe to provider cache updates for this conversation
  useEffect(() => {
    if (!convId) return
    // if provider cache changes, reflect it locally
    setMessages(Array.isArray(messagesByConversation[convId]) ? messagesByConversation[convId] : messages)
  }, [messagesByConversation, convId])

  const lastMessage = messages.length ? messages[messages.length - 1] : null
  const [showProfileCard, setShowProfileCard] = useState(false)
  const [profileForCard, setProfileForCard] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const { fetchProfile } = useProfile()
  const overlayRef = useRef(null)
  const lastActiveRef = useRef(null)

  // compute header title and other participant (prefer a non-current user participant)
  const myIdStr = currentUser ? String(currentUser._id || currentUser.id) : null
  const myEmail = currentUser ? currentUser.email : null
  const participantsList = Array.isArray(conversation?.participants) ? conversation.participants : []

  function getParticipantId(p) {
    if (!p) return null
    // participant may be { user: {...} } or a raw user id/string
    const u = p.user || p
    if (!u) return null
    if (typeof u === 'string') return String(u)
    return u._id ? String(u._id) : (u.id ? String(u.id) : null)
  }
  function getParticipantEmail(p) {
    if (!p) return null
    const u = p.user || p
    if (!u) return null
    return u.email || u.profile?.email || null
  }

  let otherParticipant = null
  if (participantsList.length === 1) {
    otherParticipant = participantsList[0]
  } else if (participantsList.length > 1) {
    // prefer participant whose id is different from current user
    otherParticipant = participantsList.find(p => {
      const pid = getParticipantId(p)
      if (!pid) return false
      return myIdStr ? pid !== myIdStr : true
    })
    // if not found by id, try by email mismatch
    if (!otherParticipant) {
      otherParticipant = participantsList.find(p => {
        const email = getParticipantEmail(p)
        return email && myEmail ? email !== myEmail : Boolean(email)
      })
    }
    // fallback to first participant
    if (!otherParticipant) otherParticipant = participantsList[0]
  }

  const headerTitle = conversation?.name
    || (otherParticipant && (otherParticipant.user?.profile?.fullName || otherParticipant.user?.profile?.displayName || otherParticipant.user?.email))
    || getParticipantEmail(otherParticipant)
    || getParticipantId(otherParticipant)
    || 'Conversation'

  // Manage focus trap and Escape-to-close for profile overlay
  useEffect(() => {
    if (showProfileCard) {
      lastActiveRef.current = document.activeElement
      // focus overlay container
      setTimeout(() => { try { overlayRef.current && overlayRef.current.focus() } catch (_) {} }, 0)
      function onKey(e) {
        if (e.key === 'Escape') setShowProfileCard(false)
      }
      document.addEventListener('keydown', onKey)
      return () => { document.removeEventListener('keydown', onKey) }
    } else {
      // restore focus
      try { if (lastActiveRef.current && lastActiveRef.current.focus) lastActiveRef.current.focus() } catch (_) {}
    }
  }, [showProfileCard])

  // Page-friendly layout: behave as a normal block so it can be embedded in pages.
  // When docked we expose an inline height so the dock can expand/collapse vertically.
  // Make minimized windows larger so composing is easier and remove translucent feel
  // If maximized (user clicked maximize), increase height to a comfortable size.
  const effectiveHeight = isMaximized ? Math.min(Math.floor(window.innerHeight * 0.6), 640) : (minimized ? Math.max(140, Math.round(dockWidth * 0.35)) : height)
  const rootStyle = docked ? { height: `${effectiveHeight}px`, width: `${dockWidth}px`, minWidth: Math.max(280, dockWidth - 40) + 'px', transition: 'height 260ms cubic-bezier(.2,.9,.2,1)' } : { height: '100%' }

  return (
    <div style={rootStyle} className={cn((docked ? 'shadow-xl border border-border rounded-md' : ''), 'relative bg-background h-full flex flex-col', docked ? 'pointer-events-auto' : 'h-full')}
      aria-live="polite">
  <div className="flex items-center justify-between px-3 py-2 bg-background border-b border-border">
          <div className="flex items-center gap-2">
          <button onClick={async () => {
            const userId = otherParticipant?.user?._id || otherParticipant?.user?.id
            if (!userId) return
            setShowProfileCard(true)
            setProfileForCard(null)
            setLoadingProfile(true)
            try {
              const prof = await fetchProfile(userId)
              setProfileForCard(prof)
            } finally {
              setLoadingProfile(false)
            }
          }} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-sm">
            {(otherParticipant?.user?.email || otherParticipant?.user?.profile?.fullName || 'U')[0]?.toUpperCase() || 'U'}
          </button>
          <div>
            <div className="text-sm font-medium">{headerTitle}</div>
          </div>
        </div>
          <div className="flex items-center gap-2">
          {docked ? (
            <>
              <button title={isMaximized ? 'Restore' : 'Maximize'} onClick={() => { setIsMaximized(v => !v); }} className="p-1 rounded hover:bg-muted/20"><span className="sr-only">{isMaximized ? 'Restore' : 'Maximize'}</span>{isMaximized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</button>
              <button title="Close" onClick={() => { if (onClose) onClose(); }} className="p-1 rounded hover:bg-muted/20"><span className="sr-only">Close dock</span><X size={16} /></button>
            </>
          ) : null}
        </div>
      </div>

  <div className={cn('flex-1 overflow-auto p-3 transition-all', expanded ? 'animate-expand' : 'animate-collapse')} style={{ paddingBottom: 96, background: docked ? 'var(--background)' : undefined }}>
        <ul className="space-y-3">
      {messages.map((m, idx) => {
    // determine if this message was sent by the current user using normalized sender info
    const myId = currentUser ? String(currentUser._id || currentUser.id) : null
    const myEmail = currentUser ? currentUser.email : null
    const sender = getSender(m)
    const senderId = sender && (sender._id || sender.id) ? String(sender._id || sender.id) : null
    const senderEmail = sender && sender.email ? sender.email : null
    const isMe = Boolean(
      m.sender === 'me' ||
      (senderId && myId && String(senderId) === String(myId)) ||
      (senderEmail && myEmail && senderEmail === myEmail)
    )
    const time = m.createdAt ? new Date(m.createdAt) : null
    const seen = isMe && (m.readBy && m.readBy.length > 0)
    function fmtTime(d) {
      if (!d) return ''
      const dt = (d instanceof Date) ? d : new Date(d)
      return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    }
    // compute date separator (if this message starts a new day compared to previous)
    const prev = idx > 0 ? messages[idx - 1] : null
    const currDate = m.createdAt ? new Date(m.createdAt) : null
    const prevDate = prev && prev.createdAt ? new Date(prev.createdAt) : null
    const showDateSeparator = !prevDate || (currDate && prevDate && currDate.toDateString() !== prevDate.toDateString())

    function dateLabel(d) {
      if (!d) return ''
      const dt = (d instanceof Date) ? d : new Date(d)
      const today = new Date()
      const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
      if (dt.toDateString() === today.toDateString()) return 'Today'
      if (dt.toDateString() === yesterday.toDateString()) return 'Yesterday'
      return dt.toLocaleDateString()
    }

    // decide if this message is a short single-line (no whitespace/newline) so bubble can expand
    const textStr = typeof m.text === 'string' ? m.text.trim() : ''
    const isShortSingleToken = textStr && !/\s/.test(textStr) && textStr.length <= 36 && !textStr.includes('\n')
    return (
      <li key={m._id} className="w-full">
        {showDateSeparator ? (
          <div className="w-full flex justify-center my-3">
            <div className="px-3 py-1 rounded-full bg-surface border border-border text-xs text-muted-foreground">{dateLabel(currDate)}</div>
          </div>
        ) : null}
        <div className={cn('w-full flex items-center', isMe ? 'justify-end' : 'justify-start')}>
          <div className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}>
            <div
              onClick={() => setVisibleTimeFor(prev => (prev === (m._id || m.id) ? null : (m._id || m.id)))}
              className={cn('px-4 py-2 rounded-lg shadow-sm cursor-pointer', isMe ? 'bg-primary text-white' : 'bg-white text-foreground border border-border')}
              style={{
                // Use dockWidth to compute a reasonable max width for bubbles when docked
                maxWidth: docked ? Math.min(dockWidth * 0.9, 520) : undefined,
                // if the message is a short single token, allow it to stay on one line and expand the bubble
                whiteSpace: isShortSingleToken ? 'nowrap' : 'normal',
                wordBreak: isShortSingleToken ? 'normal' : 'break-word',
                textAlign: isMe ? 'center' : 'left',
                display: 'inline-block'
              }}
            >
              <div className="text-sm whitespace-pre-wrap">{m.text}</div>
            </div>
            {/* show time only when the bubble is clicked */}
            {visibleTimeFor && String(visibleTimeFor) === String(m._id || m.id) ? (
              isMe && lastMessage && String(m._id) === String(lastMessage._id) && seen ? (
                <div className="mt-1 text-[11px] text-muted-foreground italic">Seen {fmtTime(m.readAt ? new Date(m.readAt) : time)}</div>
              ) : (
                <div className="mt-1 text-[11px] text-muted-foreground">{fmtTime(time)}</div>
              )
            ) : null}
          </div>
        </div>
        
      </li>
    )
  })}
        </ul>
      </div>
      {showProfileCard && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-6">
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" onClick={() => setShowProfileCard(false)} />
          <div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-label="Profile card"
            tabIndex={-1}
            className="relative transform transition-all duration-180 ease-out"
          >
            <div className="relative bg-background border border-border rounded-lg p-4 shadow-xl w-80 animate-fade-in-up">
            {loadingProfile ? (
              <div className="flex items-center justify-center h-24">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : profileForCard ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg">{profileForCard?.fullName?.[0]?.toUpperCase() || 'U'}</div>
                  <div>
                    <div className="text-sm font-semibold">{profileForCard?.fullName || profileForCard?.displayName || profileForCard?.email}</div>
                    <div className="text-xs text-muted-foreground">{profileForCard?.title || ''}</div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  {profileForCard?.bio || 'No additional profile details.'}
                </div>
              </>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">This profile is not public or could not be loaded.</div>
            )}
            </div>
          </div>
        </div>
      )}
      <div className="p-2 border-t border-border/50 bg-background">
        <div className="flex items-center gap-2">
          <MessageInput onSend={handleSendMessage} />
        </div>
      </div>
    </div>
  )
}
