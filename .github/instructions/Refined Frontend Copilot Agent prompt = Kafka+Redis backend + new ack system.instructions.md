---
applyTo: "src/**"
---

**Objective:** Implement LinkedIn-style messaging UI, fully wired to the Kafka+Redis messaging backend.  

**Backend Context (available APIs):**  
- **Conversations & Messages (REST)**  
  - `GET /api/messages` → list conversations  
  - `GET /api/messages/:conversationId?limit=&before=` → fetch history (paginated)  
  - `POST /api/messages/new` → start a conversation  
  - `POST /api/messages` → send message (returns 202 Accepted; delivery is async via Kafka/Redis)  
  - `PATCH /api/messages/:id/read` → mark individual message as read  
  - `POST /api/messages/:conversationId/ack` → bulk ack → reset unread, update `lastSeenMessageId`, emit SSE event  
  - `GET /api/users/search?query=` → search users (connections/global)  
- **Live Updates (SSE)**  
  - `GET /api/events/stream` → JWT-secured SSE; emits:  
    - `message:created` (new message in conversation)  
    - `conversation:created` (new conversation started)  
    - `ack` (read receipts / unread reset)  
- **Presence**  
  - `GET /api/users/:id/presence` → returns `online: true/false, lastSeenAt`.  

**UI Components (create under `src/components/messaging/`):**  
- `MessagingDock.jsx` → floating dock toggleable from header; resizable, draggable; hosts `ConversationList` and open windows.  
- `ConversationList.jsx` → scrollable list of conversations; shows name, lastMessage, unread badge; click → open window.  
- `ConversationWindow.jsx` → header (name, presence dot, last active, actions), scrollable thread, `MessageInput`.  
- `NewMessageModal.jsx` → searchable modal for starting new conversation; supports connection-first priority, fallback to global.  
- `MessageInput.jsx` → text field + send button; posts to `/api/messages`.  

**State & Behavior:**  
- Global state: `conversations[]`, `selectedConversation`, `openWindows[]`, `unreadCounts{}`.  
- SSE subscription:  
  - `message:created` → append to correct conversation, increment unread unless focused.  
  - `ack` → reset unread + update `lastSeenMessageId` in state.  
  - `conversation:created` → add to conversation list.  
- When user focuses a conversation:  
  - Call `POST /api/messages/:conversationId/ack`.  
  - Reset unread + show “Seen” marker under last message.  
- Presence:  
  - Poll `/api/users/:id/presence` every 30s or listen for future SSE event.  
  - Show green dot for active, “last seen at …” otherwise.  

**Constraints:**  
- React 19, JSX only (no TypeScript).  
- Styling: Tailwind semantic tokens (`bg-background`, `text-foreground`, `border-border`).  
- Utilities: `cn()` from `@/lib/utils`.  
- Use local UI primitives (`src/components/ui/*` → `Button`, `DropdownMenu`, `Dialog`, `Input`, `Badge`).  

**Integration Point:**  
- Wire `MessagingDock` into `src/components/MainLayout.jsx`.  
- Add header toggle button (chat bubble icon) to open/close dock.  

**Output Required:**  
- JSX for all listed messaging components.  
- Integration snippet for `MainLayout.jsx`.  
- SSE client hook (e.g., `useSSE.js`) to handle event subscription, cleanup, and dispatch updates to state.  
