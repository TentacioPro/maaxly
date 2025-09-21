---
applyTo: "server/**"
---

**Objective:** Refactor messaging backend to use Kafka + Redis for scalable delivery.  

**Current State:**  
- Models: `Conversation.js`, `Message.js` (Mongo, Mongoose).  
- Routes: `/api/messages`, `/api/users/search`, `/api/events/stream` (SSE).  
- Auth: JWT middleware in place.  
- SSE: streams conversation/message events (unauthenticated).

**Target Architecture:**  
- **MongoDB** → persistent storage of conversations + messages.  
- **Kafka** → message backbone:  
  - Topic: `chat-messages` → all messages published here.  
  - Producer: on `POST /api/messages`, push to Kafka.  
  - Consumer: listen to `chat-messages`, store into Mongo + Redis.  
- **Redis** → fast delivery + session state:  
  - Per-user inboxes (`LPUSH messages:<userId>`).  
  - Unread counts (`HINCRBY unread:<userId>`).  
  - Used by `/api/events/stream` to push new messages.  
- **Express** → REST API + SSE/WebSocket gateway:  
  - API unchanged (`/api/messages`, `/api/users/search`).  
  - Delivery path enhanced (read from Redis, not Mongo, for live updates).

**Task Steps:**  
1. **Kafka Setup:**  
   - `server/kafka/producer.js` → publish message events.  
   - `server/kafka/consumer.js` → consume and push into Mongo + Redis.  
   - Register consumer in `server/index.js`.  

2. **Redis Setup:**  
   - `server/redis/client.js` → shared Redis client.  
   - Inbox logic: push new messages into `messages:<userId>`.  
   - Maintain unread counts (`unread:<userId>`).  

3. **Routes:**  
   - Update `POST /api/messages`:  
     - Validate, then produce to Kafka instead of writing directly to Mongo.  
   - Update `GET /api/messages/:conversationId`:  
     - Read history from Mongo (persistent).  
   - Update `/api/events/stream`:  
     - Subscribe to Redis inbox for userId, emit messages in SSE.  
     - Secure with JWT auth.  

4. **Optional:**  
   - Add `POST /api/messages/ack` → client marks a batch delivered (reset Redis unread count).  
   - Add presence tracking (Redis `SET user:<id>:online = true/false`).  

**Constraints:**  
- Keep existing REST routes stable for frontend.  
- Use async/await + clean error handling.  
- All new code in plain JavaScript.  

**Output:**  
- `server/kafka/producer.js`  
- `server/kafka/consumer.js`  
- `server/redis/client.js`  
- Updated `messages.js` routes.  
- Updated `index.js` to register Kafka + Redis integrations.  
