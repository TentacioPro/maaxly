applyTo: "src/**"
---

**Objective:** Refactor messaging UI to mimic LinkedIn chat dock with floating windows and resizable conversation windows.  

**Backend Context (already implemented):**  
- REST: `/api/messages`, `/api/messages/:conversationId`, `/api/messages/new`, `/api/messages`, `/api/messages/:id/read`, `/api/messages/:conversationId/ack`, `/api/users/search?query=`  
- SSE: `/api/events/stream` (new messages, unread updates, read receipts)  
- Auth: All routes JWT-protected  

---

### UI Requirements  

1. **Dock Bar (bottom-left)**  
   - Component: `MessagingDock.jsx`  
   - Anchored at `fixed bottom-0 left-0`.  
   - Shows user’s conversation list in a small collapsible dock.  
   - Clicking a conversation → opens a floating conversation window.  

2. **Floating Windows (like LinkedIn)**  
   - Component: `ConversationWindow.jsx`  
   - Anchored next to dock: `fixed bottom-0 left-[dockWidth+spacing]`.  
   - Additional windows line up horizontally (flex-row).  
   - Window defaults:  
     - `w-72` (fixed width, like LinkedIn)  
     - `h-96` collapsed → expandable up to `h-[80vh]`.  
     - Tailwind classes: `bg-background border border-border shadow-lg rounded-t-lg flex flex-col`.  
   - Header:  
     - Show participant avatar + name.  
     - Close button (`X` from `lucide-react`) to remove from `openWindows[]`.  
     - Expand/collapse button (ChevronUp / ChevronDown icons).  
   - Body:  
     - Scrollable messages list.  
     - “Seen” marker under last message when ack succeeds.  
   - Footer:  
     - Message input + send button (optimistic send).  

3. **Resizable / Expandable Logic**  
   - Conversation windows support **drag-to-resize height**:  
     ```jsx
     <div
       onMouseDown={startDrag}
       className="h-2 cursor-ns-resize bg-border"
     />
     ```  
   - Maintain `windowHeight` in state.  
   - While dragging, update height with mouse move (min: `h-48`, max: `h-[80vh]`).  
   - On collapse button click → reset to collapsed `h-96`.  

4. **Dock + Windows Layout**  
   ```jsx
   <div className="fixed bottom-0 left-0 flex items-end gap-2 p-2">
     <MessagingDock />
     {openWindows.map((c, i) => (
       <ConversationWindow
         key={c._id}
         conversation={c}
         offset={i}
       />
     ))}
   </div>
