---
applyTo: "src/**"
---

**Objective:** Implement LinkedIn-style messaging UI connected to the Kafka+Redis backend.  

**Backend Context:**  
- REST endpoints:  
  - `GET /api/messages` → list conversations  
  - `GET /api/messages/:conversationId` → paginated history  
  - `POST /api/messages/new` → start conversation  
  - `POST /api/messages` → send message (returns 202 Accepted, async delivery via Kafka)  
  - `PATCH /api/messages/:id/read` → mark messages as read  
  - `GET /api/users/search?query=` → search users  
- Live delivery:  
  - `GET /api/events/stream` → SSE stream (JWT required) with new messages + conversation updates  

**Task Steps:**  
1. Create messaging components under `src/components/messaging/`:  
   - `MessagingDock.jsx` → floating dock w/ search + list of conversations  
   - `ConversationList.jsx` → scrollable list of user conversations  
   - `ConversationWindow.jsx` → chat thread w/ header, messages, input  
   - `NewMessageModal.jsx` → search users + start new conversation  
   - `MessageInput.jsx` → input + send button (POST /api/messages)  
2. State Management:  
   - Track `conversations`, `selectedConversation`, `openWindows[]`, `newMessageModalOpen`.  
   - On SSE event, update local state immediately.  
3. Integration:  
   - Fetch initial conversations via `GET /api/messages`.  
   - Fetch history lazily when a conversation is opened.  
   - Post new messages via `POST /api/messages`.  
   - Subscribe to `/api/events/stream` for new messages, update UI in real-time.  
4. Unread Counts:  
   - Use unread counters from backend (Redis).  
   - Reset via `PATCH /api/messages/:id/read` when conversation window focused.  
5. Responsive Design:  
   - Desktop → dock ~25% width, 85% height.  
   - Mobile → fullscreen chat window.  

**Constraints:**  
- Use React 19, plain JSX (no TypeScript).  
- Use `cn()` utility for merging classNames.  
- Style with Tailwind semantic tokens (`bg-background`, `text-foreground`, `border-border`).  
- No external UI library imports — reuse primitives from `/src/components/ui/*`.  

**Output:**  
- Generate JSX files for all new messaging components.  
- Show example integration into `MainLayout.jsx` (dock toggle in header).  
- Ensure real-time delivery works with SSE events.  
