import React from 'react'
import { useMessaging } from '@/providers/MessagingProvider'
import ConversationList from '@/components/ConversationList'
import ConversationWindow from '@/components/ConversationWindow'

export default function MessagesPage() {
  const { conversations = [], openWindows = [], openConversation, closeWindow, unreadCounts = {}, activeConversationId, openInMain } = useMessaging()

  // layout inspired by golden-repo: left nav, center thread, right meta/details
  const activeId = activeConversationId || (conversations[0]?._id || null)
  const activeConv = conversations.find(c => String(c._id) === String(activeId))

  return (
    <div className="w-full h-full flex bg-background rounded shadow-sm overflow-hidden">
        <div className="w-80 border-r h-full bg-background">
        <ConversationList conversations={conversations} activeId={activeId} onSelect={(id) => openInMain(id)} unreadCounts={unreadCounts} />
      </div>

      <div className="flex-1 h-full p-4">
        {activeConv ? (
          <div className="h-full flex flex-col">
            <ConversationWindow conversation={activeConv} onClose={() => closeWindow(activeConv._id)} />
          </div>
        ) : (
          <div className="p-6 text-muted-foreground">No conversation selected</div>
        )}
      </div>

      {/* Details pane removed: profile overlay now replaces the static right panel */}
    </div>
  )
}
