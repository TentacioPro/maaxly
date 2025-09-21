---
applyTo: "server/**"
---

**Objective:** Implement a robust message acknowledgement (Ack) system for chat, combining conversation-level read state (LinkedIn-style) with optional per-message receipts (WhatsApp-style).  

**New Endpoint:**  
- `POST /api/messages/:conversationId/ack`  
  - Auth required (JWT).  
  - Payload: `{ "lastSeenMessageId": "<messageId>" }`.  
  - Behavior:  
    1. Validate that the current user is a participant in the conversation.  
    2. **Conversation-level update**:  
       - In `Conversation`, update participant entry with `lastSeenMessageId` and `lastSeenAt`.  
    3. **Message-level update** (optional, fidelity):  
       - In `Message`, add userId to `readBy` for all messages in that conversation up to and including `lastSeenMessageId`.  
    4. **Redis updates**:  
       - Reset unread counter for this conversation in `unread:<userId>` hash.  
       - Publish an `ack` event on `inbox:<userId>` channel with `{ conversationId, userId, lastSeenMessageId, timestamp }`.  
    5. Respond with `{ success: true, conversationId, lastSeenMessageId, lastSeenAt }`.  

**Schema Adjustments:**  
- `Conversation`:  
  - `participants: [{ user: ObjectId<User>, lastSeenMessageId, lastSeenAt }]`.  
- `Message`:  
  - Ensure `readBy: [ObjectId<User>]` exists for optional per-message tracking.  

**Files to Modify:**  
- `server/models/Conversation.js` → extend participants schema.  
- `server/models/Message.js` → confirm `readBy` array.  
- `server/routes/messages.js` → add `/:conversationId/ack` route.  
- `server/consumer.js` → helper to reset unread count.  
- `server/events.js` → support publishing `ack` events.  
- `server/index.js` → ensure route is mounted.  

**Constraints:**  
- All routes protected by `authMiddleware`.  
- Clean JSON responses (no raw Mongoose docs).  
- Mongo + Redis updates should be attempted in the same request; log errors if partial failures occur.  
- Paginated history and unread counters must remain consistent with ack state.  

**Output:**  
- Updated `Conversation.js` and `Message.js`.  
- New route in `messages.js`.  
- Updated Redis helper(s).  
- SSE emits `ack` events that the frontend can consume to update conversation state.  
