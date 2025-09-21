import React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from './ui/badge'
import { useMessaging } from '@/providers/MessagingProvider'

export default function ConversationList({ conversations = [], activeId, onSelect, onOpenConversation, unreadCounts = {} }) {
  const { currentUser } = useMessaging()
  return (
    <div className="h-full overflow-auto bg-background">
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold">Messages</h3>
      </div>
      <ul>
        {conversations.map(conv => {
          // find the other participant by comparing against currentUser
          const other = conv.participants?.find(p => p?.user && currentUser && String(p.user._id) !== String(currentUser._id || currentUser.id))?.user
            || conv.participants?.find(p => p?.user)?.user || null
          const title = other ? (other.profile?.fullName || other.email || other._id) : (conv.title || 'Conversation')
          const unread = (unreadCounts && unreadCounts[conv._id]) || 0
          const isActive = String(conv._id) === String(activeId)
          return (
            <li key={conv._id} className={cn('p-3 border-b cursor-pointer flex items-start gap-3', isActive ? 'bg-muted/30' : '')} onClick={() => { if (onSelect) onSelect(conv._id); else if (onOpenConversation) onOpenConversation(conv) }}>
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">{other?.email?.[0]?.toUpperCase() || 'U'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium truncate">{title}</div>
                  {unread > 0 && <Badge variant="destructive">{unread}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground truncate">{conv.lastMessage?.text?.slice(0, 60) || 'No messages yet'}</div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
