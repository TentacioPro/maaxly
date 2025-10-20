# Project Context Overview — maaxly

This document provides a Notion-friendly, file-by-file overview of the repository to help onboard contributors, testers, and stakeholders. Import this Markdown into Notion and use the headings as navigation while linking to the companion Test Cases Dashboard.

Repository
- Name: maaxly
- Owner: TentacioPro
- Branch: main
- Monorepo style with frontend, backend, libraries, and docs

## How to use this in Notion
- Drag-and-drop this file into a Notion workspace to import.
- Use the table of contents to navigate by area.
- Link relevant sections to issues, tasks, or test cases in your Notion databases.

---

## Top-level files
- `README.md` — Project high-level info and quickstart.
- `package.json` — Workspace package metadata and scripts.
- `index.html` — Root HTML (used by Vite dev server for web entry).
- `vite.config.js` — Vite configuration for the app.
- `tailwind.config.js` — Tailwind CSS configuration (semantic tokens expected).
- `postcss.config.js` — PostCSS config for CSS processing.
- `eslint.config.js` — ESLint configuration for linting.
- `jsconfig.json` — JS path aliases and IntelliSense.
- `components.json` — Component registry/metadata (used by UI tooling).
- `docker-compose.kafka.yml` — Docker Compose stack for Kafka (and dependencies) for local event streaming.

Folders
- `docs/` — Documentation, progress logs, and system design notes.
- `.github/` — Project automation and instructions.
- `server/` — Node.js backend (API, Kafka, Redis, data models, scripts).
- `src/` — Frontend app code (React + Vite), pages, components, theme.
- `public/` — Static assets served by the frontend.
- `scripts/` — Repository-level scripts and utilities.
- `tests/` — Top-level test specs (e.g., profile visibility).
- `golden-repo/` — Reference app scaffold (structure, patterns, example components).
- `tweakcn-components/` — Reference UI/theme library (patterns to mirror in `src/`).

---

## docs/
- `Aug31-04AM Progress - Non-Technical.md` — Non-technical milestones and notes.
- `Aug31-04AM Progress - Technical.md` — Technical progress and tasks.
- `kafka-redis-ops.md` — Operational notes for Kafka/Redis.
- `ProjectBlueprint_LLM.md` and `ProjectBlueprint_Readable.md` — Design and blueprint summaries.
- `seed-data-schema.md` — Data models and seed shape notes.


## server/ (Backend API, Events, Storage)
- `server/index.js` — Backend entrypoint: sets up server, routes, and integrations.

### server/kafka/
- `consumer.js` — Kafka consumer(s) for subscribing to topics and handling events.
- `producer.js` — Kafka producer(s) for publishing messages/events.

### server/redis/
- `client.js` — Redis client initialization and export (caching, pub/sub, rate-limits, etc.).

### server/lib/
- `event-bus.js` — Event bus abstraction for internal publish/subscribe across modules.

### server/models/ (Data Models)
- `AdminProfile.js` — Data model for admin profile records.
- `AnalyticsEvent.js` — Data model for analytics events.
- `Application.js` — Data model for applications to opportunities.
- `Conversation.js` — Data model for chat conversations (participants, last message, etc.).
- `Education.js` — Data model for education entries on profiles.
- `EmployerProfile.js` — Data model for employer/company profiles.
- `Experience.js` — Data model for experience entries on profiles.
- `Message.js` — Data model for messages (chat content, sender, timestamps).
- `Opportunity.js` — Data model for opportunities/jobs.
- `Plan.js` — Data model for subscription plans/tiers.
- `Profile.js` — Base profile model (shared across roles or used by subtypes).
- `Skill.js` — Data model for tagged skills.
- `StudentProfile.js` — Data model for student profiles.
- `Subscription.js` — Data model for active subscriptions/billing metadata.
- `User.js` — Core user account model (auth identifiers, flags, roles).

### server/routes/ (HTTP Routes)
- `events.js` — Events-related endpoints (e.g., analytics, server-sent events, or event triggers).
- `messages.js` — Messaging endpoints (send, list, thread APIs).
- `profileRoutes.js` — Profile mutation endpoints (create/update specifics).
- `profiles.js` — Profile query endpoints (lookup, listing, visibility).
- `search.js` — Search endpoints (e.g., users, opportunities, skills, conversations).

### server/scripts/ (Ops & Maintenance)
- `demote-admin.js` — Revoke admin role from a user.
- `promote-admin.js` — Grant admin role to a user.
- `generate-theme-presets.cjs` / `generate-theme-presets.js` — Generate theme preset files from config.
- `listProfiles.js` — Utility to list or audit profiles.
- `migrateProfiles.js` — Data migration for profile documents.
- `migrateUserFlags.js` — Migrate or normalize user flags.
- `reset-db.js` — Reset or seed database content.
- `...` — Additional maintenance/ops scripts.

### server/uploads/
- Storage directory for files uploaded through APIs (if enabled by routes).

---

## src/ (Frontend App)
- `main.jsx` — Frontend entrypoint that mounts the React app.
- `index.css` — Global styles (Tailwind + semantic tokens).
- `App.jsx` and `App.css` — App shell and layout styling.

Folders
- `components/` — Reusable UI building blocks (buttons, cards, tables, chat UI, etc.).
- `pages/` — Page-level route components (views/screens).
- `providers/` — App-wide context providers (e.g., theme provider wrapper).
- `hooks/` — Custom React hooks shared across features.
- `lib/` — Utilities (e.g., `cn()` class merge, formatters, fetch wrappers).
- `assets/` — Images, icons, and media used by the app.
- `theme/` — Theme tokens, presets, or helpers used by the UI.
- `__tests__/` — Frontend tests colocated with the app.


## tests/
- `profile-visibility.test.js` — Test spec(s) for profile visibility rules.


## scripts/
- `migrate-profile-visibility.js` — Script to migrate or adjust profile visibility state.


## public/
- Static files served by the frontend (favicons, manifest, images). Place shared assets here.

---

## golden-repo/ (Reference App)
A reference implementation that informs structure and patterns for the main app.

- `src/` — Contains reference components, hooks, routes, and styles.
- `public/images/` — Assets for reference app.
- `vite.config.ts`, `eslint.config.js`, etc. — Tooling configs used by the reference setup.
- Use this folder to mirror layout, data table patterns, and dashboard structure into `src/` in plain JSX.


## tweakcn-components/ (Reference UI + Theme System)
A reference UI and theme infrastructure used to mirror design patterns into the main app (not imported directly at runtime).

- `components/`, `utils/`, `hooks/` — Source of truth for theme provider, theme toggle, tokens, and UI primitives.
- `actions/`, `app/`, `store/` — Example Next.js app structure showcasing usage.
- Use this to implement `src/providers/ThemeProvider.jsx` and `src/components/ThemeToggle.jsx` in plain JSX.

---

## Architecture at a glance
- Frontend (React + Vite)
  - Tailwind CSS with semantic tokens (bg-background, text-foreground, etc.).
  - Theme patterns mirrored from tweakcn-components.
- Backend (Node.js)
  - API routes under `server/routes/*` expose domain functionality (profiles, messages, search, events).
  - Kafka (`server/kafka/*`) enables event streaming; producers publish, consumers handle topics.
  - Redis (`server/redis/client.js`) for caching, pub/sub, or rate limiting.
  - Data models under `server/models/*` represent core domain entities.
  - Scripts under `server/scripts/*` for ops, migrations, and admin tasks.

---

## Environments & Local Services
- Kafka stack via `docker-compose.kafka.yml` for local development.
- Consider .env files (not shown) for secrets and configuration.
- Public uploads under `server/uploads/` when file APIs are enabled.

---

## Conventions & Notes
- All app code in `src/` is plain JavaScript (JSX), no TypeScript.
- Use `src/lib/utils.js` `cn()` for class merging.
- Theme integration should follow tweakcn patterns mirrored locally (no direct imports from reference folders at runtime).
- Keep UI components theme-agnostic; tokens drive styles.

---

## Suggested Links in Notion
- Link this page to your "Test Cases Dashboard" for quick navigation.
- Create relations from test cases to relevant files/areas (e.g., Feature = server/routes/messages.js or src/components/Chat/*).
- Add a "Runbook" page referencing Kafka/Redis ops from `docs/kafka-redis-ops.md`.

## .github/
- `instructions/` — Operational prompts and guidance for automated coding agents, including:
  - `codacy.instructions.md` — Rules for Codacy MCP Server integration and required analyses after edits.
  - `Master Prompt.instructions.md` — Guidance on mirroring golden-repo and tweakcn patterns in plain JSX.
  - `Theme Integration Prompt.instructions.md` — Universal theming integration instructions.
  - Other frontend/backend wiring prompts to keep implementation consistent.
