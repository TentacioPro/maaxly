# Test Cases Dashboard — Notion Template

Import this Markdown into Notion. It provides:
- A database-like table schema (columns) for managing test cases
- Example rows to get started
- Suggested Views (filters/sorts/grouping)
- A Test Case Page Template

You can paste this into an empty Notion page, convert the sections into a database (Table) and templates, or use it as documentation next to an existing database.

---

## Database Schema (Columns)
Create a new Notion database (Table) with these properties:

- Title: Name (Title)
- Status (Select): Draft, Ready, In Progress, Blocked, Failed, Passed, Deprecated
- Priority (Select): P0, P1, P2, P3
- Type (Select): Unit, Integration, Component, E2E, Contract, Performance, Security, Accessibility
- Area (Multi-select): Frontend, Backend, Kafka, Redis, Search, Profiles, Messaging, Auth, DevOps, UI, Theme
- Feature (Text): e.g., server/routes/messages.js or src/components/Chat/
- Preconditions (Text): Setup and assumptions
- Steps (Text): Numbered steps
- Expected Result (Text)
- Actual Result (Text)
- Environment (Select): Local, Staging, Production
- Reporter (Person)
- Owner (Person)
- Created (Created time)
- Last Run (Date)
- Run Result (Select): Passed, Failed, Blocked, Skipped
- Evidence (Files)
- Links (URL): PRs, commits, logs, dashboards
- Trace IDs (Text): Correlate logs/events
- Tags (Multi-select)
- Related Files (Relation to a Files DB) — optional
- Related Tickets (Relation to Tasks DB) — optional

---

## Suggested Views

- Kanban by Status
  - Group: Status
  - Sort: Priority (P0 -> P3), Last Run (desc)

- Table: All Test Cases
  - Sort: Priority (asc), Name (asc)
  - Filters: Status is not Deprecated

- Table: Ready to Run
  - Filters: Status is Ready AND Environment is Local
  - Sort: Priority (asc)

- Table: Recent Failures
  - Filters: Run Result is Failed
  - Sort: Last Run (desc)

- Table: By Area — Messaging
  - Filters: Area contains Messaging

- Table: Security & Performance
  - Filters: Type contains Security OR Performance

---

## Example Rows

Below are example test cases you can recreate in your Notion database:

1. Name: Profile visibility: public flag respected
   - Status: Ready
   - Priority: P1
   - Type: Unit
   - Area: Backend, Profiles
   - Feature: tests/profile-visibility.test.js; server/routes/profiles.js
   - Preconditions: Profile exists with visibility set to public
   - Steps: 
     1) Create profile with public visibility 
     2) Fetch profile via GET /profiles/:id 
     3) Assert visibility fields
   - Expected Result: Public profiles are returned with expected fields visible
   - Environment: Local

2. Name: Messaging: send message via API
   - Status: Draft
   - Priority: P0
   - Type: Integration
   - Area: Backend, Messaging, Kafka
   - Feature: server/routes/messages.js; server/kafka/producer.js
   - Preconditions: Kafka docker compose is running
   - Steps: 
     1) POST /messages with payload 
     2) Assert 200 response 
     3) Verify event produced to topic
   - Expected Result: Message persisted and event published
   - Environment: Local

3. Name: Theme toggling applies semantic tokens
   - Status: Draft
   - Priority: P2
   - Type: Component
   - Area: Frontend, UI, Theme
   - Feature: src/providers/ThemeProvider.jsx; src/components/ThemeToggle.jsx; src/index.css
   - Preconditions: App running via Vite
   - Steps: 
     1) Click ThemeToggle 
     2) Inspect DOM classes/tokens 
     3) Verify bg-background/text-foreground update
   - Expected Result: Theme tokens change consistently across components
   - Environment: Local

4. Name: Search endpoint returns results
   - Status: Draft
   - Priority: P2
   - Type: Integration
   - Area: Backend, Search
   - Feature: server/routes/search.js
   - Preconditions: Seed data present
   - Steps: 
     1) GET /search?q=student 
     2) Assert 200 and non-empty results
   - Expected Result: JSON results with expected shape
   - Environment: Local

---

## Test Case Page Template (Copy into Notion Template)

Title: Test: <Short Descriptive Name>

- Status: Draft
- Priority: P2
- Type: Unit
- Area: <Pick relevant>
- Feature: <file(s) or module(s)>
- Preconditions:
  - <list>
- Steps:
  1) <step 1>
  2) <step 2>
  3) <step 3>
- Expected Result:
  - <expected>
- Actual Result:
  - <to be filled on run>
- Environment: Local
- Last Run: <date>
- Run Result: <Passed/Failed/Blocked/Skipped>
- Evidence:
  - <screenshots, logs>
- Links:
  - PR: <url>
  - Commit: <url>
  - Logs/Dashboards: <url>
- Trace IDs:
  - <ids>
- Notes:
  - Edge cases, regressions, gotchas

---

## Areas and File Map (for Relations/Tags)

Use these sections as a reference to tag test cases and relate them back to files or features.

- Frontend
  - src/main.jsx, src/App.jsx, src/index.css
  - src/components/* (UI elements and composite features)
  - src/providers/* (ThemeProvider, context wrappers)
  - src/hooks/*
  - src/lib/* (cn and utilities)
  - src/pages/*
  - src/theme/*

- Backend
  - server/index.js
  - server/routes/* (profiles, messages, search, events)
  - server/models/* (User, Profile, Message, etc.)
  - server/kafka/* (producer, consumer)
  - server/redis/* (client)
  - server/lib/event-bus.js
  - server/scripts/* (migrations, ops)

- Tests
  - tests/profile-visibility.test.js
  - src/__tests__/*

- Ops & Config
  - docker-compose.kafka.yml (Kafka stack)
  - tailwind.config.js, postcss.config.js
  - vite.config.js, index.html
  - eslint.config.js, jsconfig.json

---

## How to Use in Notion

1) Create a new page called "Test Cases" and add a Table database.
2) Add the properties listed in the Database Schema section.
3) Create the Suggested Views (Kanban by Status, Ready to Run, etc.).
4) Add the Page Template using the template section above so new test cases start with the right structure.
5) Link this database from the Project Context page for quick navigation.
6) Optionally, create a separate "Files" database to relate test cases to specific modules/files.
