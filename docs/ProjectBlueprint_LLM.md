# Project Blueprint (LLM-Readable Version)

This document is a structured representation of the project's architecture and implementation details intended for programmatic consumption, analysis, and context extraction by language models.

---

## Metadata

- **Repository Name:** maaxly
- **Owner:** TentacioPro
- **Branch:** main
- **Last Updated:** 2025-11-02
- **Runtime Services:** MongoDB, Redis, Kafka (Kafka is optional at runtime; app has fallback if unreachable)
- **Latest Commit:** f2061e6 (2025-10-20 23:15:23 +0530) - "Test cases Analysis Completed, Notion Test case Dashboard Template generated in JSON Format suitably"
- **Key Contributors:** TentacioPro, tentacioPro, Abishek M

---

## Structure Overview

- **Root:** Contains configuration files (`package.json`, `tailwind.config.js`, `vite.config.js`, etc.), documentation, and blueprint files (`blueprint.md`, `blueprint-tweakcn.md`).

- **docs/**
  - Contains project documentation, progress reports, and blueprint documents.
  - **notion/**: Test case batches (10 files) merged into `notion-master.json` with comprehensive test coverage.
  - Progress reports: `Aug31-04AM Progress - Technical.md`, `Aug31-04AM Progress - Non-Technical.md`.

- **golden-repo/**
  - Reference repository influencing layout, styling, and patterns.

- **server/**
  - **index.js:** Main server bootstrap using Express with comprehensive API surface (1536 lines).
  - **routes/**: Express route handlers for messaging, profiles, analytics, file uploads, events (SSE).
    - `messages.js`: Message CRUD, conversation management, acknowledgments.
    - `events.js`: Server-Sent Events (SSE) streaming endpoint.
    - `profiles.js`: Profile visibility service.
    - `profileRoutes.js`: Public profile endpoints.
    - `search.js`: User search and presence.
  - **kafka/**: Implements Kafka integration.
    - `producer.js`: Kafka producer using kafkajs with lazy connect.
    - `consumer.js`: Kafka consumer handling message persistence and notifications with idempotency.
  - **redis/**: Redis client configuration (using ioredis) in `client.js`.
  - **lib/**: Utility modules, e.g., `event-bus.js` for local event dispatching.
  - **models/**: Mongoose models for Users, Messages, Conversations, Profiles, Opportunities, Applications, Skills, Plans, Subscriptions, AnalyticsEvents, AdminProfiles.
  - **scripts/**: Comprehensive auxiliary scripts:
    - Admin management: `promote-admin.js`, `demote-admin.js`
    - Data seeding: `seed.js`, `seedSkills.js`, `seed-students-ai.js`, `seed-profiles-from-data.js`, `seed-profiles-complete.js`
    - Migrations: `migrateProfiles.js`, `migrateUserFlags.js`
    - Theme: `generate-theme-presets.cjs`, `generate-theme-presets.js`
    - Database: `reset-db.js`, `listProfiles.js`
  - **uploads/**: Storage directory for GridFS and file uploads.

- **src/** (Frontend)
  - **main.jsx:** Application entry point with provider setup.
  - **App.jsx:** Root application component.
  - **components/**: Rich component library
    - **ui/**: Comprehensive UI primitives (badge, button, card, checkbox, dialog, dropdown-menu, form, input, label, popover, radio-group, select, separator, slider, switch, tabs, textarea, toast, tooltip).
    - Layout: `MainLayout.jsx`, `Header.jsx`, `Sidebar.jsx`, `SidebarMenu.jsx`, `MainNavigation.jsx`
    - Messaging: `MessagingDock.jsx` (floating chat), `ConversationList.jsx`, `ConversationWindow.jsx`, `MessageInput.jsx`, `NewMessageModal.jsx`
    - Dashboards: `StudentDashboard.jsx`, `EmployerDashboard.jsx`, `DashboardKPI.jsx`, `MetricCard.jsx`, `StatGrid.jsx`, `StatsChart.jsx`
    - Profiles: `ProfileForm.jsx`, `ProfileEditForm.jsx`, `PublicProfilePage.jsx`, `ProfileVisibilitySettings.jsx`
    - Opportunities: `OpportunityForm.jsx`, `OpportunityInsightsPanel.jsx`, `OpportunityMiniTracker.jsx`
    - Applications: `ApplicationProgressStepper.jsx`, `ApplicationStatusStepper.jsx`, `ApplicationsListSkeleton.jsx`, `ApplicantProfileModal.jsx`, `ApplicantsManageModal.jsx`
    - Auth: `AuthForm.jsx`, `LoginForm.jsx`, `SignUpForm.jsx`
    - Utilities: `DatePicker.jsx`, `AvatarCropDialog.jsx`, `UploadCard.jsx`
    - Theme: `ThemeToggle.jsx`, `ThemeDropdown.jsx`
    - Personalization: `PersonalizationPanel.jsx`, `PersonalizationWindow.jsx`
    - Charts: Directory with visualization components
  - **pages/**: Complete page set
    - Dashboards: `DashboardPage.jsx`, `StudentDashboard.jsx`, `AdminDashboardPage.jsx`, `EmployerAnalyticsPage.jsx`, `AdminAnalyticsPage.jsx`
    - Opportunities: `OpportunitiesPage.jsx`, `OpportunitiesListPage.jsx`, `ListingDetailsPage.jsx`, `CreateOpportunityPage.jsx`
    - Profiles: `ProfilePage.jsx`, `ProfileViewPage.jsx`, `CreateStudentProfilePage.jsx`, `CreateEmployerProfilePage.jsx`, `CreateProfileStudent.jsx`, `CreateProfileEmployer.jsx`, `CompanyDetailsPage.jsx`, `PublicProfileRoute.jsx`
    - Auth & Onboarding: `LoginPage.jsx`, `SignupPage.jsx`, `OnboardingPage.jsx`
    - Messaging: `MessagesPage.jsx`
    - Personalization: `PersonalizationPage.jsx`
    - General: `Home.jsx`, `About.jsx`
    - Editor: Subdirectory with specialized editors
  - **providers/**: State management and context providers
    - `ThemeProvider.jsx`: Universal theming system with Tailwind v4 semantic tokens
    - `MessagingProvider.jsx`: Real-time messaging with SSE integration, conversation management, unread tracking
    - `ProfileProvider.jsx` (and `.js`): Centralized profile fetch/update flows
  - **hooks/**: Custom React hooks including `useSSE` for Server-Sent Events
  - **lib/**: Utility libraries including `utils.js` with `cn()` class merger
  - **theme/**: Theme configuration and token definitions
  - **assets/**: Static assets and images
  - **__tests__/**: Frontend test files

- **tweakcn-components/**
  - Contains theming and styling utilities adapted for the project.
  - Reference for theme patterns, presets, and semantic tokens.

- **tests/**
  - Contains unit and integration tests.
  - Example: `profile-visibility.test.js`

- **scripts/** (Root level)
  - `merge-notion-batches.js`: Utility for consolidating test case batches (now empty, moved to docs/notion/)
  - `migrate-profile-visibility.js`: Migration script for profile visibility feature

- **.github/instructions/**
  - Comprehensive instruction files for AI/LLM guidance:
    - `Master Prompt.instructions.md`, `Theme Integration Prompt.instructions.md`
    - Messaging-focused prompts, refactored backend/frontend prompts
    - Postman collection prompt, Codacy integration
    - Component-specific: `Wiring Chat Dock.instructions.md`

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

- **Vite:** Bundler and development server for fast frontend development with optimized chunking strategy.
- **React (JSX):** UI components and state management integrated with theming utilities. Uses React 19.1.1.
- **Theming:** Custom theme provider using patterns from tweakcn-components ensuring a consistent UI look and feel. Fully integrated with Tailwind v4 semantic tokens (bg-background, text-foreground, etc.).
- **UI Component Library:** Comprehensive set of primitives from Radix UI (checkbox, dialog, dropdown-menu, popover, radio-group, select, slider, switch, tabs) styled with class-variance-authority and tailwind-merge.
- **Real-time Messaging:** MessagingProvider with SSE (Server-Sent Events) integration for live updates, conversation management, and unread tracking.
- **Form Management:** React Hook Form integration with custom form components for validation and data handling.
- **Charts & Visualizations:** Recharts library for analytics dashboards and metrics display.
- **Image Handling:** React-easy-crop for avatar cropping and image manipulation.

### Additional Features

- **Analytics:** Tracks page views, user engagement, and opportunity metrics via dedicated REST endpoints and data aggregation.
- **Admin Functions:** Endpoints for managing users, profiles, opportunities, and statistics.
- **File Uploads:** Multer handles multipart form data; GridFS stores uploaded files.
- **Error Handling & Fallback:** Implements error logging, fallback mechanisms (e.g., direct DB writes if Kafka fails), and redundancy.

---

## Backend: API Endpoints (Summary)

**Root & Health**
- GET / - Server health check
- GET /api/test - Database connectivity test

**Authentication**
- POST /api/auth/signup - User registration with email/password
- POST /api/auth/login - User login returning JWT token

**Messages** (via `server/routes/messages.js`)
- GET /api/messages - Get all conversations for authenticated user
- GET /api/messages/history?conversationId=&limit=&before= - Paginated message history
- GET /api/messages/:conversationId - Get messages for specific conversation
- POST /api/messages/new - Create new conversation (legacy endpoint)
- POST /api/messages - Send new message (publishes to Kafka, falls back to direct DB)
- PATCH /api/messages/:id/read - Mark message as read
- POST /api/messages/:conversationId/ack - Acknowledge message receipt (last seen)

**Events (SSE)** (via `server/routes/events.js`)
- GET /api/events/stream?userId= - Server-Sent Events stream (Bearer token auth or token query param)

**Users & Search** (via `server/routes/search.js`)
- GET /api/users/search?query= - Search users by name/username
- GET /api/users/:id/presence - Get user presence status (online/offline/last seen)

**Profiles - Public** (via `server/routes/profileRoutes.js`)
- GET /api/profile/username/:username - Get public profile by username
- GET /api/profile/id/:publicId - Get public profile by publicId
- GET /api/profile/avatar/:publicId - Get avatar image by publicId
- GET /api/profile/avatar/username/:username - Get avatar image by username
- GET /api/profile/employer/:id - Get public employer profile

**Profiles - Protected** (via `server/index.js` and `server/routes/profiles.js`)
- GET /api/profile/me - Get authenticated user's profile
- PATCH /api/profile - Update authenticated user's profile (multiple fields)
- POST /api/profile/student - Create student profile for authenticated user
- POST /api/profile/student/:userId - Create student profile for specific user (admin)
- POST /api/profile/employer - Create employer profile for authenticated user
- POST /api/profile/employer/:userId - Create employer profile for specific user (admin)
- POST /api/onboarding/role - Set user role during onboarding (student/employer)
- GET /api/profiles/:userId - Get profile visibility info for user
- PATCH /api/profiles/:userId/visibility - Update profile visibility settings
- PATCH /api/profiles/me - Update own profile visibility

**Media Uploads (GridFS)** (via `server/index.js`)
- POST /api/profile/resume - Upload resume (Multer → GridFS)
- GET /api/profile/resume/download - Download own resume
- POST /api/profile/avatar - Upload avatar image (Multer → GridFS)
- GET /api/profile/avatar/download - Download own avatar
- POST /api/profile/video - Upload video (placeholder/future)
- GET /api/profile/media - List all media for authenticated user

**Opportunities** (via `server/index.js`)
- GET /api/opportunities - List all public opportunities (with filters)
- GET /api/opportunities/my - Get opportunities user has applied to
- GET /api/opportunities/my-listings - Get opportunities created by user (employer/admin)
- POST /api/opportunities - Create new opportunity (employer/admin only)
- GET /api/opportunities/:id - Get single opportunity details
- POST /api/opportunities/:id/track - Track opportunity view (analytics)
- GET /api/opportunities/:id/insights - Get analytics insights for opportunity (owner/admin)
- GET /api/opportunities/:id/applicants - Get list of applicants (owner/admin)
- GET /api/opportunities/:id/attachments - List attachments for opportunity
- POST /api/opportunities/:id/attachments - Upload attachment to opportunity (owner/admin)
- GET /api/opportunities/:id/attachments/:fileId - Download specific attachment

**Applications** (via `server/index.js`)
- POST /api/applications - Submit application to opportunity
- GET /api/applications/my - Get user's submitted applications
- PATCH /api/applications/:id/status - Update application status (employer/admin)
- GET /api/applications/check - Check if user has applied to opportunity

**Skills** (via `server/index.js`)
- GET /api/skills/suggest - Autocomplete skill suggestions
- POST /api/skills - Create new skill (admin/authenticated)

**Analytics** (via `server/index.js`)
- POST /api/analytics/track - Track custom analytics event
- GET /api/analytics/student/progress - Student progress metrics (authenticated)
- GET /api/analytics/employer/overview - Employer dashboard overview (authenticated)
- GET /api/analytics/employer/applicants - Employer applicant analytics (authenticated)

**Habits/Tasks** (via `server/index.js` - placeholder/future)
- GET /api/habits/tasks - Get user's habit tasks
- POST /api/habits/tasks/:id/toggle - Toggle task completion
- GET /api/habits/streak - Get user's habit streak

**Admin** (via `server/index.js`)
- GET /api/admin/profile - Get admin profile info
- GET /api/admin/profile/:userId - Get admin profile for specific user
- POST /api/admin/profile - Create/update admin profile
- GET /api/admin/users - List all users (admin only)
- GET /api/admin/stats - Platform-wide statistics
- GET /api/admin/analytics/visits - Page visit analytics
- GET /api/admin/analytics/top - Top content/users analytics
- GET /api/admin/analytics/engagement - User engagement metrics
- GET /api/admin/plans - List subscription plans
- POST /api/admin/plans - Create subscription plan
- PUT /api/admin/plans/:id - Update subscription plan
- DELETE /api/admin/plans/:id - Delete subscription plan
- GET /api/admin/subscriptions - List all subscriptions

**Total Endpoints:** 70+ REST endpoints across authentication, messaging, profiles, opportunities, applications, analytics, and administration.

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

- `KAFKA_BROKER`: Broker address for Kafka (default: `localhost:9092` for Docker, `localhost:9093` for local Java setup).
- `KAFKA_GROUP_ID`: Consumer group identifier (default: `chat-consumer-group`).
- `KAFKA_TOPIC`: Topic for chat messages (default: `chat-messages`).
- `KAFKA_PROFILE_TOPIC`: Topic for profile update messages (default: `profile-updates`).
- `REDIS_URL`: Redis connection URL (default: `redis://localhost:6379`).
- `JWT_SECRET`: Secret key for signing JWT tokens.
- `MONGODB_URI` and `MONGODB_DB`: Connection details for MongoDB.
- `PORT`: API port (default 4000)
- `CORS_ORIGIN`: Allowed origin for CORS (default http://localhost:5173)

---

## Docker Infrastructure (docker-compose.kafka.yml)

The project uses Docker Compose for running Kafka, Redis, and their management UIs in containerized environments.

### Services Configuration

**Kafka (Confluent Platform 7.5.0 - KRaft Mode)**
- **Image:** `confluentinc/cp-kafka:7.5.0`
- **Container:** `maaxly-kafka`
- **Ports:** 
  - `9092:9092` - External/host access (PLAINTEXT_HOST)
  - `29092` - Internal container-to-container communication (PLAINTEXT)
  - `9093` - Controller port (KRaft coordination)
- **Mode:** KRaft (Kafka Raft) - No Zookeeper dependency
- **Key Features:**
  - Single-node broker + controller configuration
  - Auto-topic creation enabled for development
  - Static cluster ID: `AakMZjBLTOSYY5j8_VEj5w`
  - Replication factor: 1 (suitable for local dev)
  - Min ISR: 1
  - Transaction state log replication: 1
- **Volume:** `kafka_data:/var/lib/kafka/data` (persistent storage)
- **Migration Note:** Transitioned from local Java-based Kafka setup to Docker-based Confluent distribution on **2025-10-19** (commit c0097fd)

**Kafka UI**
- **Image:** `provectuslabs/kafka-ui:latest`
- **Container:** `maaxly-kafka-ui`
- **Port:** `8081:8080` - Web interface for Kafka management
- **Features:** Topic browsing, message inspection, consumer group monitoring
- **Access:** http://localhost:8081

**Redis (7-alpine)**
- **Image:** `redis:7-alpine`
- **Container:** `maaxly-redis`
- **Port:** `6379:6379`
- **Configuration:**
  - AOF (Append-Only File) persistence enabled
  - Verbose logging for development debugging
- **Volume:** `redis_data:/data` (persistent storage)

**RedisInsight**
- **Image:** `redis/redisinsight:latest`
- **Container:** `maaxly-redisinsight`
- **Port:** `5540:5540` - Web interface for Redis management
- **Features:** Key inspection, memory analysis, CLI interface, performance monitoring
- **Volume:** `redisinsight_data:/data`
- **Access:** http://localhost:5540

### Volume Management
All services use named Docker volumes for data persistence:
- `kafka_data` - Kafka logs and topic data
- `redis_data` - Redis RDB/AOF files
- `redisinsight_data` - RedisInsight configurations

### Migration from Local to Docker Setup

**Before (Pre-October 2025):**
- Kafka run via local Java installation with separate Zookeeper
- Manual broker configuration and topic management
- Redis installed directly on host system

**After (October 19, 2025 - commit c0097fd):**
- Unified Docker Compose orchestration
- KRaft mode eliminates Zookeeper dependency
- Integrated management UIs (Kafka UI, RedisInsight)
- Simplified onboarding: `docker-compose -f docker-compose.kafka.yml up -d`
- Environment-agnostic: same setup across all developer machines

### Usage Commands
```bash
# Start all services
docker-compose -f docker-compose.kafka.yml up -d

# View logs
docker-compose -f docker-compose.kafka.yml logs -f kafka
docker-compose -f docker-compose.kafka.yml logs -f redis

# Stop services
docker-compose -f docker-compose.kafka.yml down

# Stop and remove volumes (reset all data)
docker-compose -f docker-compose.kafka.yml down -v
```

---

## Summary

This blueprint outlines a full-stack project with a robust backend (Express, Kafka, Redis, MongoDB) and a modern frontend (React 19.1.1 with Vite) that together form a real-time, interactive application for messaging, profile management, and analytics. The design emphasizes scalability, resilience, and live data feeds via SSE. The structured architecture separates concerns into clearly defined modules, making the project maintainable and extendable.

---

## Recent Updates (August-November 2025)

### Git Commit Timeline

**Major Milestones:**
1. **2025-10-20 (f2061e6)** - Test cases analysis completed; Notion test dashboard template in JSON format
2. **2025-10-19 (c0097fd)** - Redis & Kafka Docker setup migration (Confluent Kafka FOSS + Redis Insight UI)
3. **2025-10-12 (4d1761c)** - Comprehensive data seeding scripts
4. **2025-09-28 (8b60ad8)** - Public profile surfaces and theme foundation
5. **2025-09-21 (671cdcd)** - Major messaging overhaul: Redis/Kafka integration, MessagingDock, universal theming, profile pages, state management improvements
6. **2025-08-31 (020650a)** - App shell refactor, opportunities flow, theming infrastructure, new UI primitives
7. **2025-08-24 (e4574c9)** - Employer opportunities and authentication feature merge
8. **2025-08-23 (9d57e50)** - Initial user authentication and profile creation

### Major Architectural Changes (August 31, 2025)

**Frontend Modernization:**
- Comprehensive UI component library based on Radix UI with 15+ primitives (checkbox, dialog, dropdown-menu, form, popover, radio-group, select, slider, switch, tabs, textarea, toast, tooltip)
- MessagingDock floating chat interface with SSE-powered real-time updates
- Universal theme system with ThemeProvider, ThemeToggle, and ThemeScript supporting Tailwind v4 semantic tokens
- MessagingProvider with full SSE integration for live messaging, conversation management, and unread tracking
- Enhanced form handling with React Hook Form, DatePicker, and AvatarCropDialog components
- Refactored MainLayout with consistent header, sidebar, and navigation patterns
- Personalization infrastructure with PersonalizationPanel and PersonalizationWindow

**Backend Expansions:**
- New Mongoose models: AnalyticsEvent, Plan, Skill, Subscription (supporting analytics and commercial features)
- Enhanced admin tooling: demote-admin.js complements promote-admin.js for complete role lifecycle
- Comprehensive seeding: seed-students-ai.js (AI-powered), seed-profiles-complete.js, seedSkills.js
- Migration utilities: migrateUserFlags.js, migrateProfiles.js for schema evolution
- Theme preset generation: generate-theme-presets.cjs/.js for design token synchronization
- Server routes remain at ~1536 lines with enhanced error handling and fallback mechanisms

**Infrastructure & Tooling:**
- Vite 7.1.2 with optimized chunking (React core, Radix UI, Lucide icons in separate chunks)
- React 19.1.1 adoption with modern patterns and performance improvements
- Tailwind v4 integration with semantic token system (bg-background, text-foreground, etc.)
- Comprehensive test case integration: 10 Notion batches merged into notion-master.json covering profiles, messaging, Kafka/Redis, themes, accessibility, uploads, performance, privacy/GDPR
- Enhanced documentation: Technical and non-technical progress reports, AI/LLM instruction files

**Quality Improvements:**
- Accessibility groundwork: WCAG AA preparation with focus management and ARIA attributes
- Performance optimizations: debouncing, lazy loading, manual code splitting
- Developer experience: Clear provider patterns, consistent styling utilities (cn() with tailwind-merge)
- Type-aware patterns: Leveraging React 19.1.1 features for better component composition

### Component Inventory Expansion

**New Components (August 2025):**
- UI Primitives: checkbox, dialog, form, radio-group, select, slider, switch, tabs, textarea
- Messaging: MessagingDock, ConversationList, ConversationWindow, MessageInput, NewMessageModal
- Dashboards: StudentDashboard (page-level), EmployerDashboard (refactored), DashboardKPI, MetricCard, StatGrid, StatsChart
- Opportunities: OpportunityForm, OpportunityInsightsPanel, OpportunityMiniTracker
- Applications: ApplicationProgressStepper, ApplicationStatusStepper, ApplicantProfileModal, ApplicantsManageModal, ApplicationsListSkeleton
- Profiles: ProfileVisibilitySettings (enhanced), ProfileEditForm, AvatarCropDialog
- Layout: MainLayout (refactored), Header (enhanced), Sidebar, SidebarMenu, MainNavigation
- Theme: ThemeToggle, ThemeDropdown, PersonalizationPanel, PersonalizationWindow
- Forms: DatePicker, UploadCard

**Pages Added/Refactored:**
- PersonalizationPage, StudentDashboard (page-level), AdminAnalyticsPage, EmployerAnalyticsPage enhanced
- OpportunitiesPage and CreateOpportunityPage refactored to use OpportunityForm component

### Data Model Evolution

**Models confirmed operational:**
- User, Message, Conversation (core messaging)
- StudentProfile, EmployerProfile, AdminProfile (role-specific profiles)
- Opportunity, Application (job board features)
- Skill (tagging and search)
- AnalyticsEvent (tracking and metrics)
- Plan, Subscription (monetization readiness)
- Education, Experience (profile enrichment)
