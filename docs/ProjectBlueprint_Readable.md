# Project Blueprint (Human-Readable Version)

This document provides an overview of the architecture, technologies, and implementation details of the project. It is written in plain language for clarity.

## 1. Project Overview

- **Repository Name:** maaxly
- **Owner:** TentacioPro
- **Branch:** main
- **Last Updated:** November 2, 2025
- **Latest Commit:** f2061e6 (October 20, 2025) - Test cases analysis and Notion dashboard integration
- **Primary Purpose:** A web application with real-time messaging, user profiles, analytics, and administration features. It integrates a modern frontend with a robust backend.

- **Core Capabilities:**
  - Authenticated user system (JWT) with student, employer, and admin roles
  - 1:1 messaging with Kafka-backed queue and Redis-powered realtime updates (SSE)
  - Public/private profiles with media uploads (GridFS for resumes/avatars)
  - Opportunities listings, applications, and employer analytics
  - Admin area: users, plans, subscriptions, analytics dashboards

## 2. Directory Structure

- **Root Files:** Various configuration files (e.g., package.json, tailwind.config.js, vite.config.js), README, and blueprint documents (`blueprint.md`, `blueprint-tweakcn.md`).
- **docs/**: Contains documentation, including progress reports (`Aug31-04AM Progress - Technical.md`, `Aug31-04AM Progress - Non-Technical.md`) and blueprints.
  - **notion/**: Test case batches (10 files) merged into `notion-master.json` with comprehensive test coverage across profiles, messaging, Kafka/Redis, themes, accessibility, uploads, and performance.
- **golden-repo/**: Reference repository which influences layout and design patterns.
- **server/**: Contains backend code including Express routes, Kafka/Redis integrations, models, and scripts.
- **src/**: Contains frontend code built with Vite. Includes components, pages, hooks, providers, and configuration.
- **tweakcn-components/**: Contains components and styling utilities for theming the UI.
- **tests/**: Contains automated tests for critical features.

Notable subfolders:
- `server/models/` Mongoose schemas (User, Message, Conversation, Student/EmployerProfile, Opportunity, Application, Skill, AnalyticsEvent, Plan, Subscription, AdminProfile)
- `server/routes/` Express routers (messages, events/SSE, profiles, public profiles, search)
- `server/kafka/` Kafka producer and consumer
- `server/redis/` Redis client
- `server/scripts/` Comprehensive seed and maintenance scripts:
  - Admin management: `promote-admin.js`, `demote-admin.js`
  - Data seeding: `seed.js`, `seedSkills.js`, `seed-students-ai.js`, `seed-profiles-from-data.js`, `seed-profiles-complete.js`
  - Migrations: `migrateProfiles.js`, `migrateUserFlags.js`
  - Theme presets: `generate-theme-presets.cjs`, `generate-theme-presets.js`
  - Database: `reset-db.js`, `listProfiles.js`
- `src/components/` Rich component library:
  - `ui/` directory: Comprehensive UI primitives (badge, button, card, checkbox, dialog, dropdown-menu, form, input, label, popover, radio-group, select, separator, slider, switch, tabs, textarea, toast, tooltip)
  - Layout components: `MainLayout.jsx`, `Header.jsx`, `Sidebar.jsx`, `SidebarMenu.jsx`, `MainNavigation.jsx`
  - Messaging: `MessagingDock.jsx` (floating chat interface), `ConversationList.jsx`, `ConversationWindow.jsx`, `MessageInput.jsx`, `NewMessageModal.jsx`
  - Dashboard components: `StudentDashboard.jsx`, `EmployerDashboard.jsx`, `DashboardKPI.jsx`, `MetricCard.jsx`, `StatGrid.jsx`, `StatsChart.jsx`
  - Profile components: `ProfileForm.jsx`, `ProfileEditForm.jsx`, `PublicProfilePage.jsx`, `ProfileVisibilitySettings.jsx`
  - Opportunity components: `OpportunityForm.jsx`, `OpportunityInsightsPanel.jsx`, `OpportunityMiniTracker.jsx`
  - Application components: `ApplicationProgressStepper.jsx`, `ApplicationStatusStepper.jsx`, `ApplicationsListSkeleton.jsx`, `ApplicantProfileModal.jsx`, `ApplicantsManageModal.jsx`
  - Theme & Personalization: `ThemeToggle.jsx`, `ThemeDropdown.jsx`, `PersonalizationPanel.jsx`, `PersonalizationWindow.jsx`
  - Utilities: `DatePicker.jsx`, `AvatarCropDialog.jsx`, `UploadCard.jsx`
  - Auth: `AuthForm.jsx`, `LoginForm.jsx`, `SignUpForm.jsx`
- `src/pages/` Complete page set including dashboards, opportunities, profiles, auth/onboarding, messaging, personalization, and editor subdirectory
- `src/providers/` React providers for theme (`ThemeProvider.jsx`), messaging (`MessagingProvider.jsx` with SSE integration), and profile management (`ProfileProvider.jsx`)
- `src/hooks/` Custom React hooks including `useSSE` for Server-Sent Events
- `src/theme/` Theme configuration and token definitions
- `.github/instructions/` Comprehensive AI/LLM instruction files for consistent development patterns

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

- **Vite-based Setup:** The frontend is built with Vite (v7.1.2), residing in the `src/` directory, with main entry point `main.jsx`. Features optimized chunking strategy for better performance with manual chunks for React ecosystem, Radix UI components, and Lucide icons.
- **React 19.1.1:** Modern React with improved features and performance.
- **Components & Pages:** Organized under `src/components/` and `src/pages/` focusing on UI, theming, and interactions.
- **Theming:** Integrated with components from the `tweakcn-components` module and a custom theme provider (`ThemeProvider.jsx`) in the project. Uses Tailwind v4 with semantic tokens (bg-background, text-foreground, etc.).
- **UI Component Library:** Comprehensive set of reusable primitives built on Radix UI including:
  - Form controls: checkbox, radio-group, select, slider, switch, input, textarea
  - Overlays: dialog, dropdown-menu, popover, tooltip
  - Layout: tabs, separator, card
  - Feedback: toast, badge
  - All styled with class-variance-authority and tailwind-merge for consistency
- **Real-time Features:** MessagingDock component provides floating chat interface with real-time updates via SSE.

Providers and realtime:
- `src/providers/MessagingProvider.jsx` manages SSE subscription to `/api/events/stream`, dispatches message/ack events to UI state, handles conversation list, unread counters, and message acknowledgments
- `src/providers/ProfileProvider.(js|jsx)` centralizes profile fetch/update flows for both student and employer profiles
- `src/providers/ThemeProvider.jsx` applies application-wide theme semantics with Tailwind v4 tokens, provides theme toggle (light/dark/system), font selection, and custom color tokens

UI Patterns:
- MainLayout wraps authenticated pages with consistent header, sidebar, and content area
- Form components use React Hook Form for validation and state management
- DatePicker for consistent date selection across forms
- AvatarCropDialog for image cropping before upload
- Charts directory contains Recharts-based visualization components for analytics

## 8. Additional Functionalities

- **Analytics & Admin:** Endpoints for tracking user activities, aggregating metrics, and managing users/opportunities.
- **File Uploads:** Uses Multer for handling multipart uploads and GridFS for storage.
- **Error Handling & Fallbacks:** The messaging API includes fallbacks (e.g., direct database writes if Kafka fails) and extensive error logging.

Complete REST API surface (70+ endpoints):

**Authentication & Users:**
- Auth: `POST /api/auth/signup`, `POST /api/auth/login`
- Users: `GET /api/users/search?query=...`, `GET /api/users/:id/presence`

**Messaging & Real-time:**
- Messaging: `GET /api/messages`, `GET /api/messages/history`, `GET /api/messages/:conversationId`, `POST /api/messages/new`, `POST /api/messages`, `PATCH /api/messages/:id/read`, `POST /api/messages/:conversationId/ack`
- Events (SSE): `GET /api/events/stream?userId=...` (or Bearer token)

**Profiles:**
- Public: `GET /api/profile/username/:username`, `GET /api/profile/id/:publicId`, `GET /api/profile/avatar/:publicId`, `GET /api/profile/avatar/username/:username`, `GET /api/profile/employer/:id`
- Protected: `GET /api/profile/me`, `PATCH /api/profile`
- Creation: `POST /api/profile/student`, `POST /api/profile/student/:userId`, `POST /api/profile/employer`, `POST /api/profile/employer/:userId`
- Onboarding: `POST /api/onboarding/role`
- Visibility service: `GET /api/profiles/:userId`, `PATCH /api/profiles/:userId/visibility`, `PATCH /api/profiles/me`

**Media Uploads (GridFS):**
- Resume: `POST /api/profile/resume`, `GET /api/profile/resume/download`
- Avatar: `POST /api/profile/avatar`, `GET /api/profile/avatar/download`
- Video: `POST /api/profile/video` (placeholder)
- List: `GET /api/profile/media`

**Opportunities & Applications:**
- Opportunities: `GET /api/opportunities`, `GET /api/opportunities/my`, `GET /api/opportunities/my-listings`, `POST /api/opportunities`, `GET /api/opportunities/:id`, `POST /api/opportunities/:id/track`, `GET /api/opportunities/:id/insights`, `GET /api/opportunities/:id/applicants`
- Attachments: `GET /api/opportunities/:id/attachments`, `POST /api/opportunities/:id/attachments`, `GET /api/opportunities/:id/attachments/:fileId`
- Applications: `POST /api/applications`, `GET /api/applications/my`, `PATCH /api/applications/:id/status`, `GET /api/applications/check`

**Skills:**
- `GET /api/skills/suggest`, `POST /api/skills`

**Analytics:**
- `POST /api/analytics/track`, `GET /api/analytics/student/progress`, `GET /api/analytics/employer/overview`, `GET /api/analytics/employer/applicants`

**Habits/Tasks (Future):**
- `GET /api/habits/tasks`, `POST /api/habits/tasks/:id/toggle`, `GET /api/habits/streak`

**Admin:**
- Profile: `GET /api/admin/profile`, `GET /api/admin/profile/:userId`, `POST /api/admin/profile`
- Users: `GET /api/admin/users`
- Stats: `GET /api/admin/stats`
- Analytics: `GET /api/admin/analytics/visits`, `GET /api/admin/analytics/top`, `GET /api/admin/analytics/engagement`
- Plans: `GET /api/admin/plans`, `POST /api/admin/plans`, `PUT /api/admin/plans/:id`, `DELETE /api/admin/plans/:id`
- Subscriptions: `GET /api/admin/subscriptions`

## 9. Configuration & Environment Variables

Common environment variables include:
- `KAFKA_BROKER` - Kafka broker address (default: `localhost:9092` for Docker setup, previously `localhost:9093` for Java setup)
- `KAFKA_GROUP_ID` - Consumer group identifier (default: `chat-consumer-group`)
- `KAFKA_TOPIC` - Topic for chat messages (default: `chat-messages`)
- `KAFKA_PROFILE_TOPIC` - Topic for profile updates (default: `profile-updates`)
- `REDIS_URL` - Redis connection URL (default: `redis://localhost:6379`)
- `JWT_SECRET` - Secret key for signing JWT tokens
- `MONGODB_URI` and `MONGODB_DB` - MongoDB connection details
- `PORT` - API server port (default: `4000`)
- `CORS_ORIGIN` - Allowed CORS origin (default: `http://localhost:5173`)

---

## 9a. Docker Infrastructure

The project uses Docker Compose (`docker-compose.kafka.yml`) for running essential services in development.

### Services Overview

**Kafka (Confluent Platform 7.5.0)**
- Modern KRaft mode (no Zookeeper needed)
- Ports: `9092` (external access), `29092` (internal), `9093` (controller)
- Auto-topic creation enabled
- Single-node configuration suitable for development
- Persistent storage via Docker volume

**Kafka UI (provectuslabs)**
- Web interface at http://localhost:8081
- Topic browsing, message inspection, consumer group monitoring
- Connect to Kafka cluster for visual management

**Redis (7-alpine)**
- Port: `6379`
- AOF (Append-Only File) persistence enabled
- Verbose logging for debugging
- Persistent storage via Docker volume

**RedisInsight**
- Web interface at http://localhost:5540
- Key inspection, memory analysis, performance monitoring
- Visual CLI and data browser

### Infrastructure Migration (October 19, 2025)

The project transitioned from a manual Java-based Kafka setup to a Docker-based infrastructure:

**Before:**
- Local Kafka installation with separate Zookeeper
- Manual broker configuration
- Redis installed directly on host

**After (commit c0097fd):**
- Unified Docker Compose orchestration
- KRaft mode eliminates Zookeeper complexity
- Integrated management UIs for both Kafka and Redis
- Simple startup: `docker-compose -f docker-compose.kafka.yml up -d`
- Consistent environment across all development machines

**Benefits:**
- Faster onboarding for new developers
- Isolated service dependencies
- Easy cleanup and reset
- Version-locked services (Kafka 7.5.0, Redis 7-alpine)
- Visual management tools included

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

---

## 16. Recent Updates (August-November 2025)

### Project Timeline (Git History)

**Key Development Milestones:**

1. **October 20, 2025 (f2061e6)** - Test Cases Comprehensive Analysis
   - Completed Notion test case analysis across 10 batches
   - Generated structured JSON dashboard template
   - Covered profiles, messaging, Kafka/Redis, themes, accessibility, uploads, performance, GDPR

2. **October 19, 2025 (c0097fd)** - Infrastructure Modernization
   - Migrated to Docker-based Kafka (Confluent Platform 7.5.0 with KRaft mode)
   - Added Redis with RedisInsight UI
   - Eliminated Zookeeper dependency
   - Integrated Kafka UI for topic management

3. **October 12, 2025 (4d1761c)** - Data Seeding Infrastructure
   - Comprehensive data seeding scripts
   - AI-powered student profile generation
   - Skills database population
   - Complete profile seeding utilities

4. **September 28, 2025 (8b60ad8)** - Public Profiles & Theme Foundation
   - Public profile surfaces implementation
   - Theme foundation infrastructure
   - Profile visibility controls

5. **September 21, 2025 (671cdcd)** - Major Messaging & Theme Overhaul
   - Universal theming with ThemeProvider and semantic tokens
   - Redis for key storage and pub/sub
   - Kafka integration for 5k+ concurrent message streaming
   - MessagingDock (LinkedIn-style floating chat)
   - Message acknowledgments with last-seen timestamps
   - Real-time notifications via SSE
   - Profile pages and dummy dashboards
   - Login/signup refactor with product functionality abstraction
   - Schema migration from old to new structure
   - Kafka stability testing with debouncing
   - Universal state management

6. **August 31, 2025 (020650a)** - Application Shell Refactor
   - Complete app shell restructuring
   - Opportunities flow improvements
   - Theming infrastructure foundation
   - New UI primitives library
   - Server models and scripts expansion
   - Configuration updates

7. **August 24, 2025 (e4574c9)** - Employer Features Merge
   - Merged employer opportunities and authentication branch
   - Core functionalities for all user roles

8. **August 23, 2025 (9d57e50)** - Foundation
   - Initial user authentication implementation
   - Profile creation framework

### Major Refactoring (August 31, 2025)
- **Application Shell:** Complete rework of main layout, header, and navigation for consistent UI/UX
- **UI Component Library:** Added comprehensive set of Radix UI primitives (checkbox, dialog, form, radio-group, select, slider, switch, tabs, textarea)
- **Messaging System:** Introduced MessagingDock floating chat interface with real-time SSE integration
- **Theme System:** Implemented universal ThemeProvider with Tailwind v4 semantic tokens, ThemeToggle component, and personalization infrastructure
- **Forms & Validation:** Enhanced form handling with React Hook Form integration, DatePicker component, and AvatarCropDialog
- **Dashboards:** Cleaned up Employer dashboard and added dedicated Student dashboard page
- **Opportunities:** Refactored to use dedicated OpportunityForm component with improved filters and layout

### Backend Enhancements
- **New Data Models:** Added AnalyticsEvent, Plan, Skill, and Subscription models to support analytics and commercial features
- **Admin Management:** Added demote-admin.js script alongside existing promote-admin.js for complete role management
- **Data Seeding:** Comprehensive seed scripts including AI-powered student profile generation and complete profile seeding
- **Migration Scripts:** Added migrateUserFlags.js and migrateProfiles.js for data migrations
- **Theme Presets:** Implemented generate-theme-presets scripts for syncing design tokens

### Infrastructure Improvements
- **Vite Optimization:** Configured manual chunking strategy for React, Radix UI, and Lucide icons to improve bundle size and loading performance
- **Testing Infrastructure:** Integrated comprehensive test case batches from Notion (10 batches covering all major features)
- **Documentation:** Added detailed progress reports, instruction files for AI/LLM agents, and blueprint documents
- **Configuration:** Standardized ESLint, Tailwind v4, and PostCSS configurations

### Quality & Developer Experience
- **Type Safety:** Leveraging React 19.1.1 features for better component patterns
- **Code Organization:** Clear separation of concerns with dedicated providers for messaging, profiles, and theming
- **Accessibility:** Foundation laid for WCAG AA compliance with focus management and ARIA attributes
- **Performance:** Implemented debouncing for search, optimized re-renders, and lazy loading patterns
