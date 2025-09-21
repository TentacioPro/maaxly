applyTo: 'server/**'
---

**Objective:** Implement backend for messaging (LinkedIn-style chat).  

**Models:**  
- `Conversation`: `{ participants: [ObjectId<User>], lastMessage, updatedAt }`.  
- `Message`: `{ conversation, sender, text, attachments, createdAt, readBy }`.  

**Routes:**  
- `GET /api/messages` → list conversations.  
- `GET /api/messages/:conversationId` → paginated history.  
- `POST /api/messages/new` → start conversation.  
- `POST /api/messages` → send message.  
- `PATCH /api/messages/:id/read` → mark as read.  
- `GET /api/users/search?query=` → search connections/global users.  

**Constraints:**  
- Use `authMiddleware` for all routes.  
- Use Mongoose populate for participants.  
- Return clean JSON for frontend consumption.  

**Output:**  
- `server/models/Conversation.js`  
- `server/models/Message.js`  
- `server/routes/messages.js`  
- Register routes in `server/index.js`.  
