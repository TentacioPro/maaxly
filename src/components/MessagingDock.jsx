import React, { useEffect, useState } from 'react'
import { MessageSquare, X, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import ConversationList from './ConversationList'
import NewMessageModal from './NewMessageModal'
import ConversationWindow from './ConversationWindow'
import { useTheme } from '@/providers/ThemeProvider'
import { useMessaging } from '@/providers/MessagingProvider'

export default function MessagingDock() {
  // read theme context safely; ThemeProvider sets CSS vars on :root
  let themeCtx = null
  try {
    themeCtx = useTheme()
  } catch (e) {
    themeCtx = null
  }
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ui:messaging:collapsed') === '1'
    } catch (e) {
      return true
    }
  })
  const { conversations, openWindows, unreadCounts, openConversation, closeWindow, setConversations, setUnreadCounts } = useMessaging()

  useEffect(() => {
    try {
      localStorage.setItem('ui:messaging:collapsed', collapsed ? '1' : '0')
    } catch (_) {}
  }, [collapsed])

  // conversations are loaded by MessagingProvider; open/close are provided by the context

  const dockWidthClass = 'w-56' // 224px
  const dockHeightClass = 'h-[540px]' // ~85% height on typical desktop; adjust if needed

  // Track viewport vs device screen to avoid reacting to pinch-zoom
  const [viewport, setViewport] = useState(() => {
    const vv = typeof window !== 'undefined' && window.visualViewport
    return {
      innerWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
      innerHeight: typeof window !== 'undefined' ? window.innerHeight : 768,
      scale: vv ? vv.scale : 1,
      screenWidth: typeof window !== 'undefined' ? window.screen.width : 1024,
      screenHeight: typeof window !== 'undefined' ? window.screen.height : 768,
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const vv = window.visualViewport

    function getState() {
      return {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scale: vv ? vv.scale : 1,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
      }
    }

    let prev = getState()

    function onChange() {
      const next = getState()

      // If device/screen dimensions changed (orientation, external display), update
      const screenChanged = next.screenWidth !== prev.screenWidth || next.screenHeight !== prev.screenHeight

      // If inner layout dims changed meaningfully, update. This catches browser window resize.
      const innerChanged = Math.abs(next.innerWidth - prev.innerWidth) > 2 || Math.abs(next.innerHeight - prev.innerHeight) > 2

      // If only the visual viewport scale changed (pinch-zoom) and inner dims did not change, ignore.
      const scaleOnly = !screenChanged && !innerChanged && next.scale !== prev.scale

      if (screenChanged || innerChanged) {
        setViewport(next)
        prev = next
      } else if (scaleOnly) {
        // do not update viewport for pinch-zoom so layout-size stays the same
        prev = next // still update prev so future diffs are correct
      }
    }

    // Listen to a few events - visualViewport resize often fires on pinch/zoom; window resize fires on layout changes
    window.addEventListener('resize', onChange)
    window.addEventListener('orientationchange', onChange)
    if (vv) {
      vv.addEventListener('resize', onChange)
      vv.addEventListener('scroll', onChange)
    }

    return () => {
      window.removeEventListener('resize', onChange)
      window.removeEventListener('orientationchange', onChange)
      if (vv) {
        vv.removeEventListener('resize', onChange)
        vv.removeEventListener('scroll', onChange)
      }
    }
  }, [])

  // compute responsive dimensions based on the current layout viewport (but only updated when appropriate)
  function computeDockDims() {
    const w = viewport.innerWidth
    const h = viewport.innerHeight

    // small screens: use nearly full width, modest height
    if (w < 640) {
      const widthPx = Math.max(280, Math.min(w - 32, 420))
      const heightPx = Math.round(h * 0.45)
      return { widthPx, heightPx }
    }

    // medium screens
    if (w < 1024) {
      const widthPx = 360
      const heightPx = Math.round(h * 0.65)
      return { widthPx, heightPx }
    }

    // large screens
    return { widthPx: 360, heightPx: Math.round(h * 0.75) }
  }

  const { widthPx: dockWidthPxRaw, heightPx: dockHeightPx } = computeDockDims()

  // slightly reduce the computed width so the dock isn't too wide visually
  // increase the minimum so docked compose windows are usable on small screens
  const dockWidthPx = Math.max(320, Math.round(dockWidthPxRaw - 24))

  // collapsed tab should be slightly narrower than full dock, with a sensible cap
  const collapsedWidthPx = Math.min(dockWidthPx - 8, 320)

  // expose styles through CSS variables so ThemeProvider can override them.
  const collapsedWidthStyle = `var(--dock-collapsed-width, ${collapsedWidthPx}px)`
  const collapsedHeightStyle = `var(--dock-collapsed-height, 48px)`
  const dockWidthStyle = `var(--dock-width, ${dockWidthPx}px)`
  const dockHeightStyle = `var(--dock-height, ${dockHeightPx}px)`
  const dockBoxShadow = `var(--dock-shadow, 0 10px 15px -3px rgba(0,0,0,0.1))`

  return (
    // root anchor bottom-right, flush to corner
    <div
      className={cn(
        'fixed z-50 bottom-0 right-0 flex items-end gap-3 pointer-events-none',
      )}
      aria-hidden={false}
    >
      {/* no spacer — dock sits in the bottom-right corner */}
  <div className="h-0" aria-hidden="true" />
      {/* Floating conversation windows stack to the left of the dock */}
      <div className="flex items-end gap-3 pointer-events-auto">
        {openWindows.map((c, i) => (
          <ConversationWindow
            key={c._id}
            conversation={c}
            offset={i}
            docked={true}
            minimized={Boolean(c.minimized)}
            dockWidth={dockWidthPx}
            onClose={() => closeWindow(String(c._id))}
          />
        ))}
      </div>

      {/* Dock: collapsed -> small tab; expanded -> full panel */}
      <div className={cn('pointer-events-auto flex flex-col items-end')}>
      {collapsed ? (
          // Collapsed dock: small horizontal tab sitting at bottom area to match dock behaviour
      <div
            role="button"
            tabIndex={0}
            onClick={() => setCollapsed(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCollapsed(false) }}
    className="bg-background border border-border rounded-md flex items-center justify-between px-3 py-2 cursor-pointer"
    style={{ width: collapsedWidthStyle, height: collapsedHeightStyle, boxShadow: dockBoxShadow }}
            title="Open messages"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" style={{ color: 'var(--icon-foreground, var(--foreground))' }} />
              <div className="text-sm font-medium">Messages</div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Plus className="w-4 h-4" />
              <ChevronDown className="w-4 h-4" />
              <X className="w-4 h-4" />
            </div>
          </div>
        ) : (
          // Expanded dock panel
          <div
            className={cn('flex flex-col bg-background border border-border rounded-t-lg overflow-hidden')}
            style={{ width: dockWidthStyle, height: dockHeightStyle, minWidth: 224, boxShadow: dockBoxShadow }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-medium">
                  M
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">Messages</span>
                  <span className="text-xs text-muted-foreground">Recent conversations</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1">
                  <NewMessageModal />
                </div>

                <button
                  title="Collapse"
                  className="p-1 rounded-md hover:bg-muted/50"
                  onClick={() => setCollapsed(true)}
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

                <button
                  title="Close dock"
                  className="p-1 rounded-md hover:bg-muted/50"
                  onClick={() => {
                    // totally hide dock if needed - for now collapse to tab
                    setCollapsed(true)
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search / conversation list */}
            <div className="p-2 overflow-hidden flex-1 flex flex-col">
              <div className="mb-2">
                <input
                  placeholder="Search people..."
                  className="w-full px-3 py-2 rounded-md bg-muted/10 border border-border text-sm text-foreground focus:outline-none"
                  onChange={() => {}}
                />
              </div>

              <div className="flex-1 overflow-auto">
                <ConversationList
                  conversations={conversations}
                  onOpenConversation={(c) => openConversation(c, { userInitiated: true })}
                  onSelect={(id) => openConversation(conversations.find(c => String(c._id) === String(id)) || id, { userInitiated: true })}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

