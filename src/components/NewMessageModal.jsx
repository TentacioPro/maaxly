import React, { useState } from 'react'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'
import axios from 'axios'
import { useMessaging } from '@/providers/MessagingProvider'

export default function NewMessageModal() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const { setConversations, openConversation } = useMessaging()
  const { conversations } = useMessaging()

  async function search(q) {
    setQuery(q)
    if (!q || q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await axios.get(`/api/users/search?query=${encodeURIComponent(q)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  // API returns { success: true, users: [...] }
  setResults((res && res.data && res.data.users) || [])
    } catch (e) {
      setResults([])
    } finally { setLoading(false) }
  }

  async function startConversation(user) {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const participantId = user.id || user._id || (user._id && user._id.toString())
      const res = await axios.post('/api/messages/new', { participantId }, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      // Support API shapes: { success:true, conversation } OR { success:true, conversation: {...} } OR direct conversation
      let conv = null
      if (res && res.data) {
        if (res.data.conversation) conv = res.data.conversation
        else if (res.data._id || res.data.participants) conv = res.data
      }
        if (conv) {
        // prepend to conversations
        setConversations((prev) => [conv, ...prev])
        // open the conversation in the UI (user initiated)
        try { openConversation(conv, { userInitiated: true }) } catch (e) { /* ignore */ }
      }
      setOpen(false)
    } catch (e) {
      // ignore for now
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">New</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>Search your connections or the global directory to start a conversation.</DialogDescription>
        </DialogHeader>
        <div className="p-4">
          <Input placeholder="Search people..." value={query} onChange={(e) => search(e.target.value)} />
          <div className="mt-3">
            {loading ? <div className="text-sm text-muted-foreground">Searching…</div> : null}
            <ul className="mt-2 space-y-2">
              {results.map(u => {
                const uid = u.id || u._id || u._id?.toString()
                const displayName = u.profile?.fullName || u.name || u.email
                const subtitle = u.profile?.companyName || u.profile?.college || u.title || ''
                // if user has an existing conversation, prefer 'Open' instead of creating a new conv
                const existing = conversations.find(c => c.participants && c.participants.some(p => {
                  const pid = p.user?._id || p.user?.id || p._id || p.id
                  return pid && String(pid) === String(uid)
                }))
                return (
                  <li key={uid} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="text-sm font-medium">{displayName}</div>
                      <div className="text-xs text-muted-foreground">{subtitle}</div>
                    </div>
                    <div>
                      {existing ? (
                        <Button size="sm" onClick={() => { openConversation(existing, { userInitiated: true }); setOpen(false) }}>Open</Button>
                      ) : (
                        <Button size="sm" onClick={() => startConversation(u)}>Start</Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
