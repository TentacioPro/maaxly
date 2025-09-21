applyTo: '**'
---

**Objective:** Implement LinkedIn-style messaging UI and APIs in my app.

**Source of Truth:**
- `/docs/blueprint.md` → Layouts, Sidebar/Drawer, DataTable patterns (use for messaging windows).
- `/docs/blueprint-tweakcn.md` → Theme + UI primitives (consistent styling for chat UI).
- Frontend: React 19 + Vite + Tailwind v4 tokens.
- Backend: Express + Mongoose (existing auth/session middleware).

**Task Steps:**
1. **Frontend (src/**):  
   - Create `src/components/Messaging/` directory with:
     - `MessagePrimaryWindow.jsx` → floating dock with search, conversations list.
     - `MessageSecondaryWindow.jsx` → active chat thread (responsive, resizable).
     - `NewMessageWindow.jsx` → modal for searching connections and starting conversations.  
   - Add entry point: `src/pages/MessagesPage.jsx` or integrate dock into dashboards.  
   - Use `cn()` util + theme tokens (`bg-background`, `text-foreground`) for styling.  

2. **Backend (server/**):  
   - Models: `Conversation.js`, `Message.js`.  
   - Routes: `routes/messages.js`, `routes/search.js`.  
   - Endpoints: list conversations, fetch messages, send message, start new conversation, search users.  
   - Reuse existing JWT middleware (`authMiddleware`).  

3. **Integration:**  
   - Frontend components must consume backend APIs (`/api/messages/*`, `/api/users/search`).  
   - Support live updates via WebSocket or SSE later; scaffold event emitter placeholders.  

**Constraints:**  
- Code in **JSX (no TS)**.  
- Keep imports consistent with my local alias (`@` → `src`).  
- Don’t import from golden-repo or tweakcn directly — mirror patterns.  

**Output Format:**  
- Provide:  
  - `src/components/Messaging/*` files (frontend).  
  - `server/models/Conversation.js`, `server/models/Message.js`, `server/routes/messages.js` (backend).  
- Ensure theme integration + API endpoints align with frontend usage.
