applyTo: 'server/**'
---

Title: Add Profile Visibility + In-Chat Profile Card (Remove Static Details Pane)

Repository Context:
- Frontend key files: `src/components/ConversationWindow.jsx`, `src/components/ConversationList.jsx`, `src/components/MessageInput.jsx`, `src/components/MessagingDock.jsx`, `src/components/MainLayout.jsx`, `src/providers/MessagingProvider.js`, profile settings UI files (search `Profile`/`Settings`).
- Backend key files: `server/models/Profile.js`, `server/models/StudentProfile.js`, `server/models/EmployerProfile.js`, `server/routes/profile.js` (or `server/routes/users.js`), `server/routes/messages.js`, `server/redis/client.js`, `server/lib/event-bus.js`.

Goal (one-sentence): Replace the messaging details side panel with a modal/overlay profile card shown on avatar/name click, and add per-user profile visibility controls (stored in the profile model and editable in user profile settings) so the card only shows fields owners permit.

High-level tasks (deliverables):

- Backend: add visibility to profile models, add endpoints:
	- `GET /api/profiles/:userId` — returns public profile per visibility flags.
	- `PATCH /api/profiles/:userId/visibility` — owner-only update endpoint.
	- (Optional) `GET /api/profiles/me` — owner view including visibility flags.
	- Migration script to add default visibility for existing profiles.
- Frontend: profile settings UI for toggling visibility; replace static messaging details pane; in `ConversationWindow.jsx` open profile overlay when avatar/name clicked and render only visible fields.
- UX: overlay uses blurred backdrop, fade+scale animation, dismissible by outside click/Escape, shows polite message when profile is fully private.
- Tests: unit/integration tests for new endpoints and frontend overlay behavior.
- PR: branch `feat/profile-visibility-chat-card`, structured commits, migration script, test results in PR description.

Detailed Backend Spec

- Schema change (Mongoose example):
	- Add nested `visibility` object on profile schema:

```js
visibility: {
	displayName: { type: Boolean, default: true },
	fullName: { type: Boolean, default: false },
	email: { type: Boolean, default: false },
	title: { type: Boolean, default: false },
	bio: { type: Boolean, default: false },
	avatarUrl: { type: Boolean, default: true },
}
```

	- Default policy: conservative (only `displayName` and `avatarUrl` visible by default).
- `GET /api/profiles/:userId`
	- Behavior: returns only fields with `visibility[field] === true`. If request is authenticated and requester is the owner, return full profile (including visibility flags).
	- Security: never return fields not allowed by visibility (email, phone, etc.) for non-owners.
- `PATCH /api/profiles/:userId/visibility`
	- Authenticated. Only profile owner or admin can update.
	- Body: partial visibility object, validate boolean values.
	- Response: updated visibility object.
- Migration
	- Create `server/migrations/add-profile-visibility.js` to add visibility defaults on existing profiles.
	- Document migration command in README or scripts (e.g., `node scripts/migrate-profile-visibility.js`).
- Optional caching
	- Cache public profile responses in Redis with short TTL (e.g., 60s) to reduce DB hits for overlays.

Detailed Frontend Spec

Profile settings UI
- File: `src/components/ProfileVisibilitySettings.jsx` (new) or integrate into existing settings component:
	- Toggles for each visibility flag.
	- Call `PATCH /api/profiles/:userId/visibility` on save.
	- Preview area showing what public profile will look like based on current toggles.

Messaging UI changes
- Remove static "Details" side panel from messaging page and any code that unconditionally renders it.
- `ConversationWindow.jsx`:
	- Make avatar and name clickable (`button` or `role="button"`, `aria-haspopup="dialog"`).
	- On click: open overlay/modal; fetch `GET /api/profiles/:userId`.
	- Render only fields returned by API (i.e., fields allowed by visibility).
	- Show "This user has chosen to keep their profile private." if API response contains no visible fields.
	- Overlay behavior: fixed positioned card aligned right or centered (design choice), blurred backdrop (`backdrop-blur`), fade+scale animation, dismiss on outside click or Escape, trap focus if modal for accessibility.
	- Cache fetched profile in a `ProfileProvider` or inside `MessagingProvider` with short TTL. Invalidate cache on `PATCH` of visibility.
	- Accessibility: aria labels, keyboard dismiss, focus management.

Visual/UX details
- Animation: combine `opacity` and `transform: scale(0.98->1)` for gentle appearance.
- Card should render `avatar`, `displayName`/`fullName`, `title`, `bio`, and any other visible fields.
- If requesting user is the owner (profile owner), show the full profile including visibility flags.

Acceptance Criteria (testable)

- Clicking participant avatar/name in conversation header opens a profile overlay that shows only permitted fields.
- Messaging details side panel is removed and no longer visible in messaging routes.
- Users can toggle visibility flags in profile settings and changes reflect in subsequent overlay fetches.
- PATCH endpoint enforces ownership; GET endpoint respects visibility for non-owners.
- Unit tests exist for backend endpoints and frontend overlay behavior.

Tests

- Backend:
	- `tests/profile-visibility.test.js`: tests for `GET /api/profiles/:userId` (owner vs non-owner), `PATCH /api/profiles/:userId/visibility` (owner-only), migration script side effects.
- Frontend:
	- `tests/ConversationWindow.test.jsx`: clicking avatar opens overlay, overlay shows allowed fields, dismiss works.
	- Optionally Storybook story for the overlay.

Suggested PR structure & commands

- Branch: `feat/profile-visibility-chat-card`
- Commits: small atomic commits (schema, migration, backend endpoints, frontend settings, messaging overlay, tests).
- Run locally:
	- Install: `pnpm install` (or `npm install`)
	- Start server: `pnpm --filter server dev` (or `node server/index.js`) — adjust to repo dev script.
	- Start frontend: `pnpm dev` or `npm run dev`
	- Tests: `pnpm test` or `npm test`
- PR title: `feat: profile visibility controls + chat profile overlay`
- PR description: include migration instructions (`node scripts/migrate-profile-visibility.js`), list of changed files, and test output.

Implementation hints for Copilot agent

- Prefer minimal, safe defaults for visibility (email false by default).
- When returning public profile payload, omit private fields entirely rather than returning nulls.
- Ensure PATCH endpoint validates request body fields (only allow the known visibility keys).
- Use existing `MessagingProvider` to store fetched profile cache keyed by `userId`.
- In `ConversationWindow.jsx` integrate overlay fetch in `onClick` handler: show loader then cached or fetched profile.
- Consider reusing existing `Avatar` component (fallback initials) for consistency.
- Add telemetry/analytics event (optional) when profile overlay is viewed.

Edge questions to confirm with reviewer (include in PR description):

- Should owners see the public view or full profile when they click their own avatar? (Recommended: full profile.)
- Which exact profile fields must be toggleable beyond the listed set? (Provide list.)
- Should there be a default visibility policy for newly created profiles other than the conservative default?

Deliverable request for Copilot agent mode:

- Implement changes across backend and frontend described above, add migration script and tests, open PR, and attach test output & migration instructions in the PR body.
