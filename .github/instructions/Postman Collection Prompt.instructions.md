---
applyTo: "server/**"
---

**Objective:** Generate a complete Postman Collection JSON (v2.1) for the entire backend API of this app, exportable into Postman directly.  

**Scope:** Include all current backend routes, grouped logically into folders:  
- **Auth & Users**  
  - `POST /api/auth/login`  
  - `POST /api/auth/signup`  
  - `GET /api/profile/me`  
  - `POST /api/profile/student`  
  - `POST /api/profile/employer`  
  - `GET /api/users/search?query=`  
  - `GET /api/users/:id/presence`  
- **Opportunities**  
  - `GET /api/opportunities`  
  - `POST /api/opportunities`  
  - `GET /api/opportunities/my`  
  - `GET /api/opportunities/:id`  
- **Messaging**  
  - `GET /api/messages`  
  - `GET /api/messages/:conversationId?limit=&before=`  
  - `POST /api/messages/new`  
  - `POST /api/messages`  
  - `PATCH /api/messages/:id/read`  
  - `POST /api/messages/:conversationId/ack`  
- **Events (SSE)**  
  - `GET /api/events/stream?userId=` (JWT required)  
- **Admin & Scripts (if applicable)**  
  - `POST /api/admin/promote`  
  - `POST /api/admin/demote`  

**Postman Setup:**  
- **Collection Metadata:**  
  - Name: `"Maaxly API Collection"`  
  - Schema: `https://schema.getpostman.com/json/collection/v2.1.0/collection.json`  
- **Environment Variables (at collection level):**  
  - `baseUrl` → default `http://localhost:4000`  
  - `token` → JWT string for Authorization  
  - `conversationId`, `messageId`, `userId`, `opportunityId` → used in path params  
- **Auth Handling:**  
  - All protected routes include `Authorization: Bearer {{token}}` header.  
- **Request Examples:**  
  - For each POST/PUT/PATCH → include a minimal example body.  
  - For each GET with query params → include example query string.  
- **Folder Structure:**  
  - Auth & Users  
  - Profiles  
  - Opportunities  
  - Messaging  
  - Events  
  - Admin  

**Output Format:**  
- A single valid Postman Collection JSON object.  
- Must conform to Postman v2.1 schema.  
- No TypeScript, no pseudocode → just clean JSON ready for import.  

**Validation:**  
- JSON should import directly into Postman (no syntax errors).  
- Verify all environment variables (`{{baseUrl}}`, `{{token}}`, etc.) are used consistently in request URLs and headers.  
