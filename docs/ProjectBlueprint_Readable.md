# Project Blueprint (Human-Readable Version)

This document provides an overview of the architecture, technologies, and implementation details of the project. It is written in plain language for clarity.

## 1. Project Overview

- **Repository Name:** maaxly
- **Owner:** TentacioPro
- **Primary Purpose:** A web application with real-time messaging, user profiles, analytics, and administration features. It integrates a modern frontend with a robust backend.

- **Core Capabilities:**
  - Authenticated user system (JWT) with student, employer, and admin roles
  - 1:1 messaging with Kafka-backed queue and Redis-powered realtime updates (SSE)
  - Public/private profiles with media uploads (GridFS for resumes/avatars)
  - Opportunities listings, applications, and employer analytics
  - Admin area: users, plans, subscriptions, analytics dashboards

## 2. Directory Structure

- **Root Files:** Various configuration files (e.g., package.json, tailwind.config.js, vite.config.js), README, and blueprint documents.
- **docs/**: Contains documentation, including progress reports and blueprints.
- **golden-repo/**: Reference repository which influences layout and design patterns.
- **server/**: Contains backend code including Express routes, Kafka/Redis integrations, models, and scripts.
- **src/**: Contains frontend code built with Vite. Includes components, pages, hooks, providers, and configuration.
- **tweakcn-components/**: Contains components and styling utilities for theming the UI.
- **tests/**: Contains automated tests for critical features.

Notable subfolders:
- `server/models/` Mongoose schemas (User, Message, Conversation, Student/EmployerProfile, Opportunity, Application, etc.)
- `server/routes/` Express routers (messages, events/SSE, profiles, public profiles, search)
- `server/kafka/` Kafka producer and consumer
- `server/redis/` Redis client
- `server/scripts/` seed and maintenance scripts
- `src/providers/` React providers for theme, profile, messaging

## 3. Backend Architecture

- **Express Server:** The main entry point is in `server/index.js` which sets up the Express app. It integrates middleware for JSON parsing, CORS, and authentication (JWT-based).
- **Authentication:** Uses JWT tokens for securing endpoints. The authMiddleware validates tokens and sets user context for subsequent routes.
- **REST Endpoints:** Endpoints cover user sign-up/login, messaging, profile operations, file uploads via GridFS, analytics, and admin functions.

Key architecture choices:
- Stateless REST API with JWT auth middleware for protected routes
- Kafka decouples message ingestion from persistence and fanout
- Redis powers realtime pub/sub and lightweight counters/queues
- SSE (Server-Sent Events) streams realtime notifications without WebSockets complexity
- GridFS used for binary media within MongoDB

## 4. Messaging System

- **Message Flow:**
  - New messages are initiated from a client POSTing to `/api/messages`.
  - A message ID is generated and a message payload is published to Kafka.
  - The Kafka consumer (in `server/kafka/consumer.js`) listens on topic `chat-messages`, persists the message to MongoDB, updates conversation details, and triggers notifications.

- **Kafka Integration:**
  - **Producer:** Implemented in `server/kafka/producer.js` using the `kafkajs` library. It lazily connects to the broker (default: `localhost:9093`).
  - **Consumer:** Implemented in `server/kafka/consumer.js` with a configurable consumer group (default: `chat-consumer-group`) and topic subscription. It handles idempotency and updates related documents.

- **Topics (defaults):**
  - `chat-messages`: primary message pipeline
  - `profile-updates`: broadcast profile changes (producer present; consumer can be added later)

- **Idempotency:**
  - API pre-generates `messageId` and includes it in Kafka payloads
  - Consumer upserts Message by `_id=messageId` if present, preventing duplicates on retries

## 5. Redis Integration

- **Redis Client:** Configured in `server/redis/client.js` using `ioredis` connecting to the URL (default: `redis://localhost:6379`).
- **Usage:**
  - **Caching & Counters:** Maintains per-user message queues and unread message counters using Redis lists and hashes.
  - **Pub/Sub:** Used for real-time notifications via channels like `inbox:{userId}`, and broadcasting profile and analytics updates.
  - **Server-Sent Events (SSE):** The SSE endpoint in `server/routes/events.js` subscribes to Redis channels and streams updates to connected clients.

  Redis keys and channels used:
  - Lists: `messages:{userId}` — recent message notifications
  - Hashes: `unread:{userId}` — per-conversation unread counts
  - Strings: `presence:{userId}` — optional user presence last-seen/status
  - Pub/Sub Channels:
    - `inbox:{userId}` — per-user realtime events (message, ack)
    - `profiles:updates` — profile update fanout
    - `analytics:opportunity:{ownerId}` — employer analytics signals

## 6. Database

- **MongoDB:** Managed using Mongoose in the server. Data models include `User`, `Message`, `Conversation`, `Profile`, `Opportunity`, and more.
- **GridFS:** Used for handling file uploads (resumes, avatars) in endpoints related to user profiles.

Primary data models (high-level):
- User: email, password (bcrypt hash), role (student/employer/admin), flags (`isAdmin`, `isStudent`, `isEmployer`), onboarding
- Conversation: participants [{ user, lastSeenMessageId, lastSeenAt }], `lastMessage`, `updatedAt`
- Message: conversation, sender, text, attachments[], `readBy`[], timestamps
- StudentProfile: userId, username, skills[], resume/avatar GridFS metadata, visibility, bio, education/experience
- EmployerProfile: userId, companyName/website, contact, about, industry, social links
- Opportunity: owner, title, type, description, metrics (views, site views, applicationsCount), skills, attachments[]
- Application: applicant, opportunity, status history, createdAt
- Skill: name, nameLower
- AnalyticsEvent: path, role, userId, referrer, user-agent, ts
- Plan, Subscription, AdminProfile: admin/commercial features

## 7. Frontend Architecture

- **Vite-based Setup:** The frontend is built with Vite, residing in the `src/` directory, with main entry point `main.jsx`.
- **Components & Pages:** Organized under `src/components/` and `src/pages/` focusing on UI, theming, and interactions.
- **Theming:** Integrated with components from the `tweakcn-components` module and a custom theme provider in the project.

Providers and realtime:
- `src/providers/MessagingProvider.jsx` likely manages SSE subscription to `/api/events/stream` and dispatches message/ack events to UI state
- `src/providers/ProfileProvider.(js|jsx)` centralizes profile fetch/update flows
- `src/providers/ThemeProvider.jsx` applies application-wide theme semantics (Tailwind v4 tokens)

## 8. Additional Functionalities

- **Analytics & Admin:** Endpoints for tracking user activities, aggregating metrics, and managing users/opportunities.
- **File Uploads:** Uses Multer for handling multipart uploads and GridFS for storage.
- **Error Handling & Fallbacks:** The messaging API includes fallbacks (e.g., direct database writes if Kafka fails) and extensive error logging.

Selected REST API surface (high-level):
- Auth: `POST /api/auth/signup`, `POST /api/auth/login`
- Messaging: `GET /api/messages`, `GET /api/messages/history`, `GET /api/messages/:conversationId`, `POST /api/messages/new`, `POST /api/messages`, `PATCH /api/messages/:id/read`, `POST /api/messages/:conversationId/ack`
- Events (SSE): `GET /api/events/stream?userId=...` (or Bearer token)
- Users: `GET /api/users/search?query=...`, `GET /api/users/:id/presence`
- Profiles (public/private):
  - Public: `GET /api/profile/username/:username`, `GET /api/profile/id/:publicId`, `GET /api/profile/avatar/:publicId`, `GET /api/profile/avatar/username/:username`, `GET /api/profile/employer/:id`
  - Protected: `GET /api/profile/me`, `PATCH /api/profile`, onboarding `POST /api/onboarding/role`
  - Visibility service: under `/api/profiles` — `GET /api/profiles/:userId`, `PATCH /api/profiles/:userId/visibility`, `PATCH /api/profiles/me`
- Media: `POST /api/profile/resume`, `GET /api/profile/resume/download`, `POST /api/profile/avatar` (private download via `/api/profile/avatar/download`)
- Opportunities: list/my-listings/get one, create (employer/admin), track views (`POST /api/opportunities/:id/track`), insights, applicants, attachments (owner/admin upload; protected read)
- Applications: `POST /api/applications`, `GET /api/applications/my`, `PATCH /api/applications/:id/status`, `GET /api/applications/check`
- Analytics: `POST /api/analytics/track`
- Admin: users, stats, analytics (visits/top/engagement), plans CRUD, subscriptions list

## 9. Configuration & Environment Variables

Common environment variables include:
- `KAFKA_BROKER` (default: localhost:9093)
- `KAFKA_GROUP_ID` (default: chat-consumer-group)
- `KAFKA_TOPIC` (default: chat-messages)
- `REDIS_URL` (default: redis://localhost:6379)
- `JWT_SECRET` for token signing
- `MONGODB_URI` and `MONGODB_DB` for database access

Other relevant:
- `PORT` (default 4000)
- `CORS_ORIGIN` (default http://localhost:5173)
- `KAFKA_PROFILE_TOPIC` (default profile-updates)

---

This blueprint aims to provide a clear view of the system for future development and debugging.

## 10. Realtime Flow Summary

1) Client sends message -> API pre-allocates messageId -> publish to Kafka `chat-messages` -> 202 Accepted returned
2) Consumer persists Message, updates Conversation -> for each recipient: Redis LPUSH + HINCRBY + PUBLISH to `inbox:{userId}`
3) Frontend SSE client receives events from `/api/events/stream` and updates UI (new message, unread counters, acks, profile/analytics events)

Kafka/Redis offline behavior:
- If Kafka unreachable: API falls back to direct Mongo write and Redis notifications, returning 201 Created
- Server probes Kafka brokers at boot and conditionally starts consumer (skips noisy timeouts)

## 11. Scripts & Tooling

NPM scripts (selected):
- `dev`, `build`, `preview`, `lint`, `test`
- Backend: `start`, `server` (nodemon)
- Seeds/migrations: `seed:skills`, `seed:data`, `seed:all`, `seed:students:ai`, `seed:profiles`, `seed:profiles:complete`, `db:reset`, `migrate:profile-visibility`
- Theme presets: `presets:sync`

Server scripts directory contains utilities for seeding, migrations, admin elevation, and profile data generation.

## 12. Testing

- Test stack: Jest + Supertest
- Example tests: `tests/profile-visibility.test.js`
- Aim to expand with messaging API tests (publish fallback), SSE smoke tests, and admin endpoints

## 13. Security Notes

- JWT-based authentication; always send Authorization: Bearer token to protected endpoints
- Input validation is minimal in some endpoints — consider adding schema validators (e.g., zod/joi) for tighter contracts
- GridFS download endpoints sanitize and validate ObjectIds; ensure rate-limiting and file-type checks in production
- Admin endpoints gated by `adminRequired` middleware; verify role checks remain strict

## 14. Deployment Notes

- Required services: MongoDB, Redis, Kafka (optional at boot; app operates with fallback if Kafka is down)
- Environment variables should be set via `.env`/secrets managers
- Frontend served by Vite dev in development; production should serve static build via a web server and run Node server separately

## 15. Future Improvements

- Add Kafka consumer for `profile-updates` to trigger downstream processors
- Introduce WebSocket option alongside SSE for bi-directional features (typing, presence)
- Harden validation and add rate limiting
- Expand automated tests and add CI
