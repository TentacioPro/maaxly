# Project Blueprint (LLM-Readable Version)

This document is a structured representation of the project's architecture and implementation details intended for programmatic consumption, analysis, and context extraction by language models.

---

## Metadata

- **Repository Name:** maaxly
- **Owner:** TentacioPro
- **Branch:** main
- **Last Updated:** 2025-10-12
- **Runtime Services:** MongoDB, Redis, Kafka (Kafka is optional at runtime; app has fallback if unreachable)

---

## Structure Overview

- **Root:** Contains configuration files (`package.json`, `tailwind.config.js`, `vite.config.js`, etc.), documentation, and blueprint files.

- **docs/**
  - Contains project documentation, progress reports, and blueprint documents.

- **golden-repo/**
  - Reference repository influencing layout, styling, and patterns.

- **server/**
  - **index.js:** Main server bootstrap using Express.
  - **routes/**: Express route handlers for messaging, profiles, analytics, file uploads, etc.
  - **kafka/**: Implements Kafka integration.
    - `producer.js`: Kafka producer using kafkajs.
    - `consumer.js`: Kafka consumer handling message persistence and notifications.
  - **redis/**: Redis client configuration (using ioredis) in `client.js`.
  - **lib/**: Utility modules, e.g., `event-bus.js` for local event dispatching.
  - **models/**: Mongoose models for Users, Messages, Conversations, Profiles, etc.
  - **scripts/**: Various auxiliary scripts (data migration, theming, etc.).

- **src/** (Frontend)
  - **main.jsx:** Application entry point.
  - **components/**, **pages/**, **hooks/**, **providers/**, etc. for UI building and state management.
  - **assets, stores, lib:** Static assets and utility libraries.

- **tweakcn-components/**
  - Contains theming and styling utilities adapted for the project.

- **tests/**
  - Contains unit and integration tests.

---

## Key Technologies and Patterns

### Backend

- **Express.js:** Web server framework providing REST endpoints.
- **MongoDB (Mongoose):** Primary database for persisting user data, messages, profiles, and analytics.
- **GridFS:** Used for file storage (resumes, avatars) within MongoDB.
- **JWT Authentication:** Secures endpoints via bearer tokens; authentication middleware validates tokens and sets user context.
- **Kafka (kafkajs):** Messaging system for decoupled, idempotent message publishing and consumption.
  - Producer: Publishes JSON payloads to designated topics.
  - Consumer: Listens for messages, persists them, updates conversations, and triggers notifications.
- **Redis (ioredis):** Deployed for caching, counters, pub/sub messaging (real-time notifications via SSE), and unread message tracking.
- **Server-Sent Events (SSE):** Implements live updates by subscribing to Redis channels and streaming events to clients.

### Frontend

- **Vite:** Bundler and development server for fast frontend development.
- **React (JSX):** UI components and state management integrated with theming utilities.
- **Theming:** Custom theme provider using patterns from tweakcn-components ensuring a consistent UI look and feel.

### Additional Features

- **Analytics:** Tracks page views, user engagement, and opportunity metrics via dedicated REST endpoints and data aggregation.
- **Admin Functions:** Endpoints for managing users, profiles, opportunities, and statistics.
- **File Uploads:** Multer handles multipart form data; GridFS stores uploaded files.
- **Error Handling & Fallback:** Implements error logging, fallback mechanisms (e.g., direct DB writes if Kafka fails), and redundancy.

---

## Backend: API Endpoints (Summary)

auth
- POST /api/auth/signup
- POST /api/auth/login

messages
- GET /api/messages
- GET /api/messages/history?conversationId=&limit=&before=
- GET /api/messages/:conversationId
- POST /api/messages/new
- POST /api/messages
- PATCH /api/messages/:id/read
- POST /api/messages/:conversationId/ack

events (SSE)
- GET /api/events/stream?userId= (or Auth Bearer token; token query also supported)

users
- GET /api/users/search?query=
- GET /api/users/:id/presence

profiles (public/private)
- GET /api/profile/username/:username
- GET /api/profile/id/:publicId
- GET /api/profile/avatar/:publicId
- GET /api/profile/avatar/username/:username
- GET /api/profile/employer/:id
- GET /api/profile/me
- PATCH /api/profile
- POST /api/onboarding/role
- GET /api/profiles/:userId
- PATCH /api/profiles/:userId/visibility
- PATCH /api/profiles/me

media (GridFS)
- POST /api/profile/resume
- GET /api/profile/resume/download
- POST /api/profile/avatar
- GET /api/profile/avatar/download

opportunities
- GET /api/opportunities
- GET /api/opportunities/my
- GET /api/opportunities/my-listings
- POST /api/opportunities
- GET /api/opportunities/:id
- POST /api/opportunities/:id/track
- GET /api/opportunities/:id/insights
- GET /api/opportunities/:id/applicants
- GET /api/opportunities/:id/attachments
- POST /api/opportunities/:id/attachments
- GET /api/opportunities/:id/attachments/:fileId

applications
- POST /api/applications
- GET /api/applications/my
- PATCH /api/applications/:id/status
- GET /api/applications/check

analytics
- POST /api/analytics/track

admin
- GET /api/admin/profile
- GET /api/admin/profile/:userId
- POST /api/admin/profile
- GET /api/admin/users
- GET /api/admin/stats
- GET /api/admin/analytics/visits
- GET /api/admin/analytics/top
- GET /api/admin/analytics/engagement
- GET /api/admin/plans
- POST /api/admin/plans
- PUT /api/admin/plans/:id
- DELETE /api/admin/plans/:id
- GET /api/admin/subscriptions

---

## Backend: Data Models (High-Level)

- User: { email, password, role, isAdmin, isStudent, isEmployer, hasCompletedOnboarding }
- Conversation: { participants: [{ user, lastSeenMessageId?, lastSeenAt? }], lastMessage, updatedAt }
- Message: { conversation, sender, text, attachments[], readBy[], createdAt }
- StudentProfile: { userId, username, publicId, fullName, skills[], resume*, avatar*, visibility, bio, education, experience }
- EmployerProfile: { userId, companyName, companyWebsite, fullName, about, industry, contact*, social*, location, size }
- Opportunity: { owner, title, type, description, skillset/skills, applicationsCount, detailViews, companySiteViews, attachments[] }
- Application: { applicant, opportunity, status, history[], createdAt }
- Skill: { name, nameLower }
- AnalyticsEvent: { path, role, userId, referrer, ua, ts }
- Plan, Subscription, AdminProfile: supporting admin/commercial features

---

## Messaging: Kafka and Redis

Kafka (kafkajs)
- Brokers: env KAFKA_BROKER (comma-separated; default localhost:9093)
- Producer: lazy connect; JSON messages
- Topics: chat-messages, profile-updates
- Consumer: groupId from KAFKA_GROUP_ID (default chat-consumer-group), subscribes to KAFKA_TOPIC (default chat-messages)
- Idempotency: API pre-sets messageId; consumer upserts Message by _id
- Startup guard: TCP reachability probe per broker; skip consumer if none reachable

Redis (ioredis)
- URL: env REDIS_URL (default redis://localhost:6379)
- Keys: messages:{userId} (list), unread:{userId} (hash), presence:{userId} (string)
- Channels: inbox:{userId}, profiles:updates, analytics:opportunity:{ownerId}
- Usage: message fanout, unread counters, presence lookups, realtime analytics

SSE
- Endpoint: /api/events/stream
- Auth: Bearer token preferred; supports token/userId query
- Subscriptions: inbox:{userId}, profiles:updates, analytics:opportunity:{userId}
- Events: message, ack, profile, analytics

---

## Error Handling & Fallbacks

- Messaging API falls back to direct Mongo write + Redis pub/sub when Kafka publish fails
- Consumer errors are caught and logged; per-message try/catch prevents consumer crash
- SSE handles JSON parse errors defensively; invalid messages are ignored with warnings

---

## Security

- JWT-based auth; authMiddleware sets req.userId for protected routes
- adminRequired middleware restricts admin endpoints
- ObjectId validation and access control on per-resource routes (conversations, opportunities)

---

## Scripts & Tooling

package.json scripts (subset)
- dev, build, preview, lint, test
- server (nodemon), start
- seeds: seed:skills, seed:data, seed:all, seed:students:ai, seed:profiles, seed:profiles:complete
- db:reset, migrate:profile-visibility, presets:sync

---

## Integration Flow Diagrams (Descriptive)

1. **Messaging Flow:**
   - Client POST to `/api/messages` -> Generates messageId -> Publishes payload to Kafka topic (default: `chat-messages`) -> Kafka consumer processes message -> Persists in MongoDB -> Updates conversation and notifies recipients via Redis (using lists, hashes, and pub/sub) -> SSE streams deliver updates in real-time.

2. **Profile & Analytics Flow:**
   - Profile updates are persisted and also published to Kafka (profile-updates topic) and Redis for SSE notifications.
   - Analytics endpoints aggregate data from MongoDB and push updates via Redis channels.

3. **File Upload Flow:**
   - Resumes and avatars are uploaded using Multer, then stored via GridFS, with metadata updates in user profile documents.

---

## Environment Variables

- `KAFKA_BROKER`: Broker address for Kafka (default: `localhost:9093`).
- `KAFKA_GROUP_ID`: Consumer group identifier (default: `chat-consumer-group`).
- `KAFKA_TOPIC`: Topic for chat messages (default: `chat-messages`).
- `KAFKA_PROFILE_TOPIC`: Topic for profile update messages (default: `profile-updates`).
- `REDIS_URL`: Redis connection URL (default: `redis://localhost:6379`).
- `JWT_SECRET`: Secret key for signing JWT tokens.
- `MONGODB_URI` and `MONGODB_DB`: Connection details for MongoDB.
- `PORT`: API port (default 4000)
- `CORS_ORIGIN`: Allowed origin for CORS (default http://localhost:5173)

---

## Summary

This blueprint outlines a full-stack project with a robust backend (Express, Kafka, Redis, MongoDB) and a modern frontend (React with Vite) that together form a real-time, interactive application for messaging, profile management, and analytics. The design emphasizes scalability, resilience, and live data feeds via SSE. The structured architecture separates concerns into clearly defined modules, making the project maintainable and extendable.
