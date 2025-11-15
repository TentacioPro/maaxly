# Maaxly Docker Deploy — Troubleshooting Log

This log captures the key Docker build/run issues encountered, their root causes, and the exact fixes/commands that resolved them. You can keep appending additional notes here.

## Context
- Stack: Node.js backend (Express/Mongoose), Vite React frontend, MongoDB, Redis, Kafka.
- Orchestration: Docker Compose with `dev` and `prod` profiles.
- Env files: `.env.dev` and `.env.prod`.

---

## Issue 1: MongoDB authentication failed (code 18)
- Symptom:
  - Backend logs: `MongoServerError: Authentication failed (code 18)` and container restart loop.
- Likely root causes:
  - DB volume already initialized with different creds than current `.env.prod`.
  - Backend not using the same credentials as the Mongo container.
  - Missing app user in Mongo or incorrect `authSource`.
- Resolutions applied:
  - Ensured backend uses a single source of truth `MONGODB_URI`.
  - Reset DB when credentials changed (remove old volume) or created an app user explicitly.
  - Standardized `authSource=admin` for the app user with role `root` (for simplicity). You can switch to least-privilege later.
- Key commands:
  - Stop and remove volume (data loss warning):
    ```powershell
    docker compose -f "docker-compose.kafka.yml" down
    docker volume rm "eom august 31_mongo_data"
    ```
  - Create app user (idempotent) inside container:
    ```powershell
    $rootUser = "maaxly"; $rootPass = "maaxlypass"
    $appUser  = "maaxly_prod_user"; $appPass = "REPLACE_WITH_STRONG_PASS"

    docker exec -it maaxly-mongodb mongosh admin -u $rootUser -p $rootPass --eval "db.createUser({user:'$appUser', pwd:'$appPass', roles:[{role:'root', db:'admin'}]})"
    ```
  - PowerShell variable parsing tip (colons):
    ```powershell
    docker exec -it maaxly-mongodb mongosh "mongodb://$($appUser):$($appPass)@localhost:27017/admin?authSource=admin" --eval "db.runCommand({ ping: 1 })"
    ```

---

## Issue 2: Compose error — `services.frontend-prod.build.args must be a mapping`
- Symptom: Running compose with `--env-file` failed validating YAML.
- Root cause: Bad indentation for `build.args` in `frontend-prod` service.
- Fix: Ensure `args:` is a mapping; indent `VITE_API_BASE` under it.
- Snippet:
  ```yaml
  frontend-prod:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        VITE_API_BASE: ${VITE_API_BASE:-/api}
  ```

---

## Issue 3: Frontend build fails — `sh: vite: not found`
- Symptom: Docker build step `npm run build` fails in builder stage.
- Root cause: `vite` is a devDependency; original Dockerfile used `npm ci --omit=dev` or set `NODE_ENV=production` before install.
- Fixes applied in `Dockerfile.frontend`:
  - Install all dependencies including devDependencies (no `--omit=dev`).
  - Do not set `NODE_ENV=production` before `npm ci` in the builder stage.
- Working pattern:
  ```dockerfile
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY package*.json ./
  COPY package-lock.json ./
  RUN npm ci
  COPY . .
  ARG VITE_API_BASE=/api
  ENV VITE_API_BASE=${VITE_API_BASE}
  RUN npm run build
  ```

---

## Issue 4: Backend not seeing `.env.prod`
- Symptom: Backend built but did not receive expected env vars.
- Root cause: Relying on container shell env vs compose env; missing defaults; conflicting variable sources.
- Fixes:
  - Use `--env-file .env.prod` with compose.
  - Standardize on `MONGODB_URI` as the only DB connection input.
  - Added safe defaults in compose or env file.

---

## Improvements added to Compose
- MongoDB healthcheck and orchestrated startup:
  - `mongodb` has a healthcheck with `mongosh ping`.
  - `backend` depends on `mongodb` healthy and `db-init` finished.
- `db-init` one-shot service (prod):
  - Creates the app user if it doesn’t exist (idempotent), using root credentials.
- `seed` one-shot service (prod):
  - Installs deps and runs `server/scripts/seed-docker.js` (falls back to `seed.js` if needed) after DB/user readiness.
- These ensure: user exists -> backend starts -> seed runs.

---

## Environment files — canonical settings
- `.env.prod` (app user + admin authSource):
  ```env
  COMPOSE_PROJECT_NAME=maaxly
  PORT=4000
  HOST=0.0.0.0
  MONGO_INITDB_ROOT_USERNAME=maaxly
  MONGO_INITDB_ROOT_PASSWORD=maaxlypass
  MONGODB_DB=maaxly_prod_db

  # App user used by the backend to connect to MongoDB
  MONGODB_APP_USER=maaxly_prod_user
  MONGODB_APP_PASS=maaxlypass

  # Backend connection string (auth via admin)
  MONGODB_URI=mongodb://maaxly_prod_user:${MONGODB_APP_PASS}@mongodb:27017/maaxly_prod_db?authSource=admin

  REDIS_URL=redis://redis:6379
  KAFKA_BROKERS=kafka:29092
  VITE_API_BASE=/api
  TZ=Asia/Kolkata
  JWT_SECRET=<long_random_secret>
  ```
- `.env.dev` (root user acceptable for local):
  ```env
  COMPOSE_PROJECT_NAME=maaxly_dev
  PORT=4000
  HOST=0.0.0.0
  MONGO_INITDB_ROOT_USERNAME=maaxly
  MONGO_INITDB_ROOT_PASSWORD=maaxlypass
  MONGODB_DB=maaxly_dev_db
  MONGODB_URI=mongodb://maaxly:maaxlypass@mongodb:27017/maaxly_dev_db?authSource=admin
  REDIS_URL=redis://redis:6379
  KAFKA_BROKERS=kafka:29092
  CORS_ORIGIN=http://localhost:5173
  VITE_API_BASE=http://localhost:4000
  TZ=Asia/Kolkata
  JWT_SECRET=<dev_secret>
  ```

---

## Run commands (reference)
- Dev:
  ```powershell
  docker compose -f docker-compose.kafka.yml --profile dev --env-file .env.dev up -d --build
  ```
- Prod:
  ```powershell
  docker compose -f docker-compose.kafka.yml --profile prod --env-file .env.prod up -d --build --force-recreate
  ```
- Check backend logs:
  ```powershell
  docker logs -f maaxly-backend --tail 200
  ```
- Seed manually (if needed):
  ```powershell
  docker exec maaxly-backend node server/scripts/seed-docker.js
  # or
  docker exec maaxly-backend node server/scripts/seed.js
  ```

---

## Verification checklist
- Backend log shows:
  - `Connected to MongoDB at mongodb://maaxly_prod_user...`
  - `Server listening on http://localhost:4000`
  - Redis connected; Kafka consumer started (optional).
- DB ping:
  ```powershell
  docker exec -it maaxly-backend sh -lc 'mongosh "$MONGODB_URI" --eval "db.runCommand({ ping: 1 })"'
  ```
- Auth endpoints:
  ```powershell
  $body = @{ email="tester@example.com"; password="Test123!" } | ConvertTo-Json
  Invoke-RestMethod -Uri "http://localhost:4000/api/auth/signup" -Method Post -ContentType "application/json" -Body $body
  Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login"  -Method Post -ContentType "application/json" -Body $body
  ```

---

## Observations / misc
- KafkaJS: occasional `Response without match` warnings can appear during broker (re)starts; usually transient.
- PowerShell: when interpolating credentials in URIs, wrap variables: `mongodb://$($user):$($pass)@host:27017/...`.
- If you switch from `authSource=admin` to DB-scoped least-privilege, update user creation and `MONGODB_URI` accordingly.

---

## To-do / future hardening
- Switch app user to least-privilege (`readWrite` on app DB) and move `authSource` to the app DB.
- Add a seed sentinel (collection or doc) to make the seed step fully idempotent.
- Add log redaction for secrets; ensure secrets are not printed.
- Add Nginx/Proxy Manager only when needed; keep dev UIs behind profiles.

---

## Append your own notes below
- 

---

## Consolidated Struggles & Resolutions (Chat-Derived)
This section aggregates every distinct issue, confusion, or friction point mentioned or inferred in our recent debugging conversation. Each item includes current status and recommended follow‑ups.

### Core Infrastructure / Environment
- MongoDB authentication failures (code 18): Credentials in volume drift; required standardized single `MONGODB_URI` and occasional volume reset.
- Environment drift: Backend not picking up `.env.prod` → enforced `--env-file` usage; need periodic env diff checks.
- Volume contamination: Legacy data causing auth/user mismatch; sometimes required full volume removal.
- Lack of idempotent DB user creation: Introduced concept of a one‑shot `db-init` pattern (still to be fully implemented/hardened).
- Need for seed sentinel: Seeding reruns risk duplication; suggestion to add collection/document marker.
- Time‑of‑start race: Backend could start before Mongo or Redis readiness → added healthcheck (Mongo) and dependency gating; Kafka/Redis reachability pre-check logic highlighted.

### Build & Compose
- Compose schema error (`services.frontend-prod.build.args must be a mapping`): Indentation/structure fix under `build.args`.
- Frontend build failure (`vite: not found`): Caused by devDependencies omission when `NODE_ENV=production` or `--omit=dev`; fixed by building with full dependencies.
- Backend image not reflecting code changes: Layer caching + mounted volumes hiding edits; used `--force-recreate` and `--no-cache` builds when necessary.

### Application Runtime / API Layer
- Path-to-RegExp startup crash (`Missing parameter name at 1`): Root cause was Express wildcard `app.get('*', ...)`; modern `path-to-regexp` rejects bare `*`. Correct pattern should be a regex excluding `/api` (e.g. negative lookahead). Crash persisted until replaced.
- Misdiagnosis cycle: Initially attributed to a nonexistent trailing-colon route (e.g. `/my-listings:`) and phantom malformed param (`/:username/:`). Attempts to patch failed because those routes were not present. Lesson: inspect actual code before pattern replacement.
- SPA fallback overshadowing API routes: `*` catch-all placed too early hijacked `/api/*` paths, yielding confusing 404/JSON/HTML mismatches.
- 500 errors phase: Caused primarily by startup crash (path-to-regexp) rather than internal route handlers; resolved after addressing wildcard.
- Persistent 404 differentiation struggle: Need systematic triage (API missing vs asset vs SPA fallback). Adopt status + content-type + body heuristic.
- Missing route enumeration: Harder to audit coverage; recommend simple script to list registered Express paths.
- Inconsistent error logging: Early crashes lacked contextual route logs; suggestion to prepend subsystem tags and implement structured logging (pino/winston).
- JWT secret & auth header validation noise: Debug prints helped; ensure secrets are never fully logged.
- CORS vs fallback confusion: SPA fallback returned HTML for API paths when CORS misconfiguration suspected; actual cause was wildcard route.

### Data & Domain Logic
- Need to drop unique indexes (student/employer `userId`) to permit multiple profile evolutions—implemented defensive drops.
- Profile backfill for `publicId`: Added post-listen backfill; potential performance impact if scaled (future batching suggested).
- Skills normalization complexity: Repeated logic handling multiple input shapes; could be extracted for testability.

### Messaging / Realtime Stack
- Kafka broker reachability uncertainties: Added sync TCP probe before consumer start to avoid noisy timeouts.
- Redis transient failures: Wrapped publish/push in try/catch to avoid cascading 500s (best-effort pattern).

### Tooling / Process Friction
- Replace attempts failing (no match): Root cause—trying to patch strings not present (colon-suffixed routes). Need pre‑grep verification before automated edits.
- Lack of a quick health endpoint aggregating Mongo/Redis/Kafka: Manual checks repeated; recommended unified `/health` JSON.
- Differentiating 404 asset vs SPA vs API required ad-hoc curl checks—can automate with a small diagnostic script.

### Security / Hardening Gaps (Identified)
- Using `root` Mongo role for app user in prod; plan to downgrade to least-privilege `readWrite` on app DB.
- Potential exposure of environment via `docker inspect`; recommend scanning logs for accidental secret leakage.
- No rate limiting / brute-force guard on auth endpoints yet (future enhancement).

### Observational / Diagnostic Lessons
- Path-to-RegExp v6 stricter semantics: Bare `*` invalid; must use named wildcard `/*splat` or explicit regex. Helpful upgrade note.
- Error message misdirection: “Missing parameter name” prompted hunt for `/:` patterns; actual culprit was solitary `*`.
- Ordering of middleware and static/fallback routes is critical; place SPA fallback last with a safe pattern.

### Current Open Items (Post-500, Focusing on 404)
- Replace `app.get('*', ...)` with safe regex fallback excluding `/api`.
- Add route audit script (`app._router.stack` introspection) to confirm coverage & ordering.
- Implement `/health` endpoint (Mongo ping, Redis PING, Kafka broker check summary).
- Add seed sentinel & idempotent `db-init` container formalization.
- Create automated 404 classifier script for local + container run (curl matrix).

### Recommended Next Actions (Prioritized)
1. Patch SPA fallback route safely (prevent future path-to-regexp crash & 404 confusion).
2. Add `/health` endpoint + structured logging baseline.
3. Introduce route enumeration script for faster audits.
4. Seed sentinel & idempotent DB user init container refinement.
5. Implement least-privilege Mongo user + credential rotation plan.
6. Create diagnostic script to classify 404 responses (API vs asset vs SPA).

---

## Quick Heuristic for 404 Source (Cheat Sheet)
- HTML body + 200/304 or generic 404 → SPA fallback served, not API route.
- JSON `{ message: '...' }` + explicit status → API layer (missing route or auth gating).
- Empty body + 404 + `Content-Type: text/html` + path under `/assets/` → static asset not built or path mismatch.
- Repeated HTML for `/api/*` calls → fallback pattern not excluding `/api` correctly.

---

## Express Route Enumeration (Snippet Example)
```js
// scripts/list-routes.js
import app from '../server/index.js'
function list() {
  const routes = []
  app._router.stack.forEach(layer => {
    if (layer.route) {
      const path = layer.route.path
      const methods = Object.keys(layer.route.methods).join(',')
      routes.push({ path, methods })
    } else if (layer.name === 'router' && layer.handle.stack) {
      layer.handle.stack.forEach(r => {
        if (r.route) {
          const m = Object.keys(r.route.methods).join(',')
          routes.push({ path: r.route.path, methods: m })
        }
      })
    }
  })
  console.table(routes)
}
list()
```

---

## Unified Health Endpoint (Proposed Sketch)
```js
app.get('/health', async (req, res) => {
  const out = { mongo: false, redis: false, kafka: false }
  try { await mongoose.connection.db.admin().ping(); out.mongo = true } catch {}
  try { await redisClient.ping(); out.redis = true } catch {}
  try {
    const brokers = (process.env.KAFKA_BROKERS||'').split(',').filter(Boolean)
    out.kafka = brokers.length > 0 // refine with actual socket probe
  } catch {}
  res.json(out)
})
```

---

## Notes on Path-to-RegExp Upgrade Handling
- Avoid bare `*`; use regex or named wildcard.
- Prefer negative lookahead regex: `^\/((?!api\/).)*$` for SPA fallback.
- Always place fallback AFTER all API routes & static middleware.

---

## Summary
Startup crashes (500) resolved; remaining friction centers around accurate classification of 404 sources and backlog of hardening tasks. Above list consolidates issues, fixes, and forward plan for clarity and onboarding continuity.


---

## Extended Issues & Addendum

### Quick Index
- Issue A: `TypeError: Missing parameter name` (path-to-regexp)
- Issue B: Persistent 404 vs 500 differentiation (SPA + API)
- Issue C: Mongo auth (code 18) recurrence & drift detection
- Issue D: Environment drift / wrong `.env` loaded
- Issue E: Container rebuild not picking up code change
- Issue F: Kafka / Redis reachability checks pre-start
- Issue G: Volume contamination & data reset strategy
- Patterns: Systematic API vs Asset vs SPA path triage
- Toolbelt: One-liners for inspection & verification
- Preventative Hardening Checklist

### Issue A: Path-to-RegExp Startup Crash
**Symptom:** `TypeError: Missing parameter name at 1: https://git.new/pathToRegexpError` during Express boot; stack pointed to `node_modules/path-to-regexp/dist/index.js`.

**Original Route:**
```js
app.get('*', (req, res) => { res.sendFile('index.html', { root: 'public' }) })
```
**Root Cause:** Newer `path-to-regexp` versions reject bare `*` patterns; wildcard was parsed as an invalid token. Also swallowed `/api/*` routes causing confusing 404/500 interplay.

**Fix Implemented:**
```js
app.get(/^\/((?!api\/).)*$/, (req, res) => {
  res.sendFile('index.html', { root: 'public' })
})
```
Excludes `/api/` paths while preserving SPA routing.

**Alternatives:** Negative lookahead or explicit route allow‑list. Verify removal of fragile pattern:
```powershell
git grep "app.get('*'" server\
```

### Issue B: 404 vs 500 Differentiation
**Need:** Distinguish missing API endpoint from SPA fallback or asset absence.

| Scenario | Cause | Check |
|----------|-------|-------|
| `/api/...` JSON 404 | No route / auth gating | Grep server routes |
| Asset `/assets/...` 404 | Build artifact missing | Inspect `public` or `dist` |
| SPA navigation returns index.html | Fallback regex too broad | Confirm regex exclusion of `/api` |
| Favicon only loads | Partial build / wrong static root | Verify build output & mount |

Heuristic: HTML body + no JSON shape → SPA fallback; JSON `{ message: ... }` → API layer.

### Issue C: Mongo Auth (Code 18) Recurrence & Drift
Repeated auth failures after credential edits point to volume data seeded with prior users or mismatched `MONGODB_URI` vs created users. Use drift check:
```powershell
docker exec maaxly-backend printenv | Select-String MONGODB
Get-Content .env.prod | Select-String MONGODB_URI
```
If different → recreate backend with updated env or re-init user.

**Idempotent Init Pattern (pseudo):** Create `db-init` one‑shot that ensures app user exists before backend starts.

### Issue D: Wrong / Missing `.env` Application
Symptoms: CORS mismatch, root credential fallback logs, missing JWT secret.
Mitigation: Always run compose with `--env-file`. Inspect env inside container:
```powershell
docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' maaxly-backend | Select-String JWT_SECRET
```

### Issue E: Code Change Not Reflected
Causes: Cached image layer, dev volume masking image, missing `--force-recreate`.
Force fresh build:
```powershell
docker compose -f docker-compose.kafka.yml --profile prod --env-file .env.prod build --no-cache backend
```
Confirm freshness:
```powershell
docker history maaxly-backend | Select-Object -First 5
```

### Issue F: Kafka / Redis Reachability Guard
Pre-check brokers to avoid noisy timeouts:
```powershell
docker exec maaxly-backend sh -lc 'for b in $KAFKA_BROKERS; do nc -z ${b%%:*} ${b##*:} && echo OK $b || echo FAIL $b; done'
docker exec maaxly-backend sh -lc 'redis-cli -u $REDIS_URL PING'
```

### Issue G: Volume Contamination
Data drift or auth failures after env changes. Full reset (danger):
```powershell
docker compose -f docker-compose.kafka.yml down
docker volume rm "eom august 31_mongo_data"
```
Selective DB drop:
```powershell
docker exec -it maaxly-mongodb mongosh admin -u maaxly -p maaxlypass --eval "db.getSiblingDB('maaxly_prod_db').dropDatabase()"
```

### Patterns: Systematic 404 Diagnostics
1. Capture status & headers:
```powershell
curl -i http://localhost:4000/api/opportunities | Select-String HTTP
```
2. Confirm route exists:
```powershell
docker exec maaxly-backend grep -n "opportunities" server/index.js
```
3. If HTML for `/api/*` → fallback regex wrong.
4. Validate frontend build presence inside prod container.

### Toolbelt Commands
```powershell
# Multi-service tail
for ($s in 'maaxly-backend','maaxly-mongodb','maaxly-redis','maaxly-kafka') { docker logs --tail 50 $s }

# Env diff
(Get-Content .env.prod | Sort-Object) | Compare-Object -ReferenceObject ((docker exec maaxly-backend printenv) | Sort-Object)

# Connectivity matrix
docker exec maaxly-backend sh -lc 'ping -c1 mongodb; ping -c1 redis; nc -z kafka 29092 || echo kafka-fail'

# Listening ports
docker exec maaxly-backend sh -lc 'netstat -tlnp'
```

### Preventative Hardening Checklist
- [ ] Idempotent DB user init (`db-init`).
- [ ] Seed sentinel to ensure idempotent seeding.
- [ ] Regex SPA fallback excluding `/api` (no raw `*`).
- [ ] Healthchecks gate backend start.
- [ ] Distinct dev/prod project names & DBs.
- [ ] Log prefixes per subsystem.
- [ ] Secrets never logged fully.
- [ ] Consistent volume naming.
- [ ] Route enumeration script.

### Future Enhancements
- Unified `/health` endpoint (Mongo, Redis, Kafka reachability).
- Structured JSON logging (pino/winston) for aggregation.
- Least-privilege Mongo user (`readWrite` only) post-seed stabilization.
- Post-deploy integration test container (auth + CRUD smoke).
- Metrics exporter counting 4xx vs 5xx.

### Reference Fix Timeline
| Issue | Fix | Status |
|-------|-----|--------|
| Path-to-RegExp crash | Replace `*` route with regex | Resolved |
| Mongo auth loop | Standardize URI / create user | Resolved |
| Startup 500s | Env corrections & validation | Resolved |
| Emerging 404s | Classification in progress | In progress |

### Open 404 Investigation Notes
- Determine HTML vs JSON responses to classify source.
- Map failing paths to expected server or client routes.
- Verify frontend router base and build artifacts.

---
### Additional Notes
- Continue appending new findings below this section.

---

## Newly Added Struggles (Post Chat Consolidation)
These items were encountered during the recent 500→404 triage and were not explicitly enumerated earlier or required clearer separation.

### Issue H: Host Port Conflicts (80)
- Symptom: `bind: An attempt was made to access a socket ...` for `nginx-proxy-manager`; frontend prod also tried to claim host port 80.
- Root Cause: Multiple services mapping `80:80` concurrently (frontend-prod static Nginx and nginx-proxy-manager).
- Fix: Remap to non-conflicting host ports (e.g. `frontend-prod` → `8080:80`, `nginx-proxy-manager` → `8088:80`).
- Recommendation: Reserve 80/443 only for the final public ingress layer; document a host port map table.

### Issue I: Blank Mongo Credential Warnings in Compose
- Symptom: Compose startup warnings: `The "MONGO_INITDB_ROOT_USERNAME" variable is not set. Defaulting to a blank string.` followed by auth failures (code 18).
- Root Cause: Variables defined in `.env.prod` not injected where expected; relying solely on shell substitution without per‑service `env_file`.
- Fix: Add `env_file: [.env.prod]` to both `mongodb` and `backend` services; avoid silent fallback to empty strings.
- Lesson: Prefer explicit `env_file` for critical secrets; validate inside container via `printenv`.

### Issue J: Oversized Docker Build Context
- Symptom: Slow frontend image builds; occasional local resource contention.
- Root Cause: Missing `.dockerignore`, sending `node_modules`, `.git`, build artifacts to daemon.
- Fix: Introduced `.dockerignore` excluding heavy/irrelevant paths (node_modules, coverage, dist, logs).
- Impact: Significantly faster build times; reduced network I/O to daemon.

### Issue K: Lockfile Mismatch (pnpm vs npm)
- Symptom: Build failed expecting `pnpm-lock.yaml`; using npm tooling.
- Root Cause: Dockerfile referenced `pnpm-lock.yaml` while project uses `package-lock.json`.
- Fix: Adjust builder stage to copy `package-lock.json` and run `npm ci`.
- Preventative Step: Align tooling (pnpm vs npm) early; warn if both lockfiles appear.

### Issue L: DevDependencies Omission Causing Vite Not Found (Clarified)
- Symptom: `sh: vite: not found` during production build.
- Root Cause: Earlier attempt used production-only install (`npm ci --omit=dev`) removing devDependencies where build tool (Vite) lives.
- Fix: Install full dependency set in builder stage; only prune in final stage if desired.
- Note: Already captured under Issue 3 but reiterated here for cross-link with Lockfile mismatch.

### Issue M: 404 Emergence After 500 Resolution
- Symptom: Transition from startup 500s to runtime 404s for certain API paths/assets.
- Root Cause (In Progress): Need to distinguish SPA fallback scope vs genuinely missing API endpoints vs missing static assets.
- Current Action: Building classifier heuristic; planning route enumeration script & `/health` endpoint to reduce ambiguity.
- Next: Confirm fallback regex excludes `/api` and ensure static build artifacts mounted correctly in `frontend-prod`.

### Issue N: Incomplete Environment Variable Hygiene
- Symptom: Drift between `.env.dev`, `.env.prod`, and service runtime causing confusion (e.g., differing `VITE_API_BASE`).
- Root Cause: Manual edits without a diffing step across profiles.
- Fix: Suggested periodic automated diff (`Compare-Object` in PowerShell) + single canonical DB URI (`MONGODB_URI`).
- Future: Introduce a validation script that fails startup if required vars are blank.

### Issue O: Missing Early Failure for Bad Wildcard Route
- Symptom: Misdiagnosis cycle around unexplained 500s attributed to Mongo or random routes.
- Root Cause: Lack of preflight validation of route patterns; wildcard `*` only surfaced deep in path-to-regexp stack.
- Fix: Replace with safe regex and propose a startup self-test enumerating and validating route patterns before listening.
- Benefit: Earlier surfacing of misconfigured patterns prevents cascading unrelated debugging effort.

### Issue P: Absent Structured Startup Assertions
- Symptom: Time spent verifying each subsystem manually post‑launch.
- Root Cause: No consolidated startup assertion block.
- Fix (Proposed): Add a bootstrap routine that verifies Mongo auth, Redis ping, Kafka broker reachability, and prints a single structured JSON line summarizing readiness.
- Outcome: Faster human triage; machine‑parsable deployment logs.

### Issue Q: 404 Debug Friction Without Tooling
- Symptom: Manual curl cycles to classify 404 types.
- Root Cause: Lack of small scripted matrix for endpoints & assets.
- Fix (Planned): Add `scripts/diagnose-404.sh|ps1` performing matrix queries and tagging responses (HTML vs JSON vs empty).
- Value: Compress reproducibility time; onboards new contributors quicker.

### Issue R: Port Allocation Strategy Not Documented
- Symptom: Accidental reuse of ports (80, 81, 443).
- Root Cause: No reserved port map; reliance on memory.
- Fix (Planned): Document a `PORTS.md` with categories (Core, Dev UI, External Proxy, Diagnostics) and reserved ranges.
- Benefit: Prevents subtle collisions when adding new observability or admin UIs.

### Issue S: Lack of Least-Privilege DB User Separation (Clarified)
- Symptom: Using root-like roles for app logic.
- Root Cause: Expedience during initial setup; seeding convenience.
- Plan: Transition to app user with `readWrite` on app DB; rotate credentials; update seed & init flows.
- Security Impact: Reduces blast radius of a compromised container.

### Issue T: Missing Seed Idempotence Sentinel (Clarified)
- Symptom: Potential duplicate inserts when seed reruns.
- Root Cause: No marker collection or checksum approach.
- Fix (Proposed): Store a `seed_meta` document with version/hash; skip if unchanged.
- Advanced: Add integrity verification (counts, indexes) before concluding seed success.

### Issue U: Slow Manual Investigation of Registered Routes
- Symptom: Repeated grep operations to confirm presence of handlers.
- Root Cause: Absent route enumeration script.
- Fix: Provide `scripts/list-routes.js` (already sketched) and integrate into `npm run diagnose`.
- Enhancement: Output diff vs expected route manifest to catch accidental deletions.

### Issue V: Unclear Separation Between Dev/Prod Profiles in Logs
- Symptom: Ambiguity when scanning logs for which profile is active.
- Root Cause: Lack of profile tag in log prefix.
- Fix (Proposed): Inject `PROFILE=dev|prod` env and prepend all log lines via a wrapper logger.
- Benefit: Faster filtering, lower cognitive load during mixed-profile debugging.

### Issue W: Absence of Centralized 4xx/5xx Metrics
- Symptom: Harder to quantify improvement after fixes.
- Root Cause: No middleware counting status class distribution.
- Fix (Proposed): Lightweight Express middleware increments counters; expose at `/metrics` or integrate with Prometheus client.
- Use: Track 404 trend while refining fallout from wildcard route changes.

---
## Updated Prioritized Follow-Up List
1. Implement route fallback validation + bootstrap assertions (Issues O, P).
2. Add 404 diagnostic script and route enumeration automation (Issues Q, U).
3. Formalize env validation script (Issue N) + PORTS.md (Issue R).
4. Introduce seed sentinel & least-privilege DB user transition (Issues T, S).
5. Add structured health & metrics endpoints (Issues P, W).
6. Security: Credential rotation & secret scanning integration.

---

## Comprehensive Struggle Index (Chronological + Categorized)
This section enumerates every distinct struggle encountered so far (build, runtime, routing, security, observability). Use it as a master checklist for audits and onboarding. Each item lists: (Category) – Symptom/Core Cause → Resolution Status.

### A. Core Infrastructure / Environment
1. (Mongo Auth) Repeated `Authentication failed (code 18)` → Volume credential drift & inconsistent `MONGODB_URI` → Standardized URI + optional volume reset (Resolved).
2. (Env Drift) Backend not loading `.env.prod` → Missing `--env-file` usage → Enforced compose invocation with explicit env file (Resolved).
3. (Volume Contamination) Legacy data conflicting with new creds → Old volume retained previous users → Documented safe removal procedure (Resolved, repeatable risk).
4. (Init Idempotence) Lack of guaranteed app user creation → Manual user creation steps → Proposed `db-init` one-shot pattern (Pending Hardening).
5. (Seed Idempotence) Possible duplicate seed inserts → No sentinel marker → Sentinel + version hash proposed (Pending).
6. (Time-of-Start Race) Backend started before Mongo healthy → Missing health/dependency gates → Added Mongo healthcheck & service dependency (Resolved, extend to Redis/Kafka).
7. (Least-Privilege Gap) App user uses root role → Expedience over security → Plan to downgrade to `readWrite` (Pending).

### B. Build & Compose Process
8. (Compose YAML Mapping Error) `services.frontend-prod.build.args must be a mapping` → Bad indentation → Corrected structure (Resolved).
9. (Frontend Build Failure) `vite: not found` → DevDependencies omitted (`--omit=dev`) → Install full deps in builder stage (Resolved).
10. (Lockfile Mismatch) Expecting pnpm vs npm → Dockerfile referencing wrong lockfile → Copied `package-lock.json` & used `npm ci` (Resolved).
11. (Oversized Build Context) Slow image builds → Missing `.dockerignore` → Added ignore list (Resolved).
12. (Code Change Not Reflected) Image layer caching & mounted volume masking → Absent `--force-recreate` → Used forced rebuild flags (Operational Procedure Established).
13. (Port Conflicts 80/443) Multiple services mapping host ports → Colliding ingress → Introduced overridable ports & reserved mapping strategy (Resolved).
14. (Blank Env Variable Warnings) Compose defaulting to empty Mongo creds → Missing `env_file` directives → Added explicit env injection (Resolved).

### C. Runtime / Routing / API Layer
15. (Wildcard Route Crash) `TypeError: Missing parameter name` from bare `*` → Incompatible path-to-regexp v6 semantics → Replaced with negative lookahead regex excluding `/api` (Resolved).
16. (SPA Fallback Overreach) Catch-all hijacked `/api/*` → Fallback placed too early & too broad → Reordered & refined pattern (Resolved).
17. (404 vs 500 Misclassification) HTML vs JSON confusion → Lacked heuristics & diagnostics → Introduced classification cheat sheet (Resolved Guidance, continue tooling).
18. (Route Discovery Friction) Hard to audit existing endpoints → No enumeration script → Provided `scripts/list-routes.js` concept (Pending Implementation).
19. (Missing Structured Startup Assertions) Manual multi-service readiness checks → No summary log → Proposed bootstrap readiness JSON (Pending).
20. (Fallback Regex Validation Absent) Risk of future pattern regressions → No self-test → Plan for startup route validation routine (Pending).

### D. Data / Domain Logic
21. (Unique Index Rigidity) Blocking profile evolution → Dropped/adjusted indexes → Allowed flexible updates (Resolved).
22. (PublicId Backfill) Needed after startup for existing docs → Added post-listen routine → Performance considerations flagged (Resolved with Caveat).
23. (Skills Normalization Duplication) Repeated ad-hoc logic → Harder testability → Refactor into single util proposed (Pending).

### E. Messaging / Realtime
24. (Kafka Reachability Noise) Consumers start before broker ready → Transient timeouts → Added suggestion for TCP pre-check (Partial Adoption).
25. (Redis Transient Failures) Occasional publish errors → Unwrapped calls throwing 500 → Added defensive try/catch (Resolved).
26. (Partitioner Warning) Legacy partitioner noise → Environment var suppression `KAFKAJS_NO_PARTITIONER_WARNING=1` (Resolved).

### F. Security & Secrets
27. (JWT Secret Drift) Inconsistent secrets across profiles → Manual oversight → Centralized `.env.*` entries & reminders on rotation (Resolved, Rotation Pending).
28. (Secrets Logging Risk) Potential accidental secret prints → No redaction layer → Recommendation for structured logger with redaction (Pending).
29. (Credential Rotation Lack) Static Mongo & JWT values → Increased risk window → Rotation workflow proposed (Pending).

### G. Observability & Diagnostics
30. (No Health Endpoint) Manual subsystem pinging → Slower triage → Proposed `/health` endpoint (Pending).
31. (404 Diagnostic Overhead) Manual curl loops → High time cost → Plan for scripted matrix (Pending).
32. (No Metrics Aggregation) Missing 4xx/5xx counts → Hard improvement tracking → Proposed middleware metrics + `/metrics` (Pending).
33. (Unstructured Logs) Hard to filter by profile/subsystem → No logger abstraction → Add prefixed/JSON logging recommendation (Pending).

### H. Environment Hygiene & Configuration
34. (Env Diff Visibility) Difficult to notice drift between dev/prod → No diff script → PowerShell diff pattern documented (Resolved Guidance, Script Pending).
35. (Port Allocation Strategy Undocumented) Accidental reuse risk → Memory-based allocation → Plan for `PORTS.md` (Pending).
36. (Inconsistent `VITE_API_BASE`) Different expectations for dev/prod → Clarified path-based single-domain strategy (Resolved).
37. (Profile Ambiguity in Logs) Hard to attribute log lines → Missing `PROFILE` tag → Proposed env tag & prefix (Pending).

### I. Backup & Persistence
38. (Unverified Backup Integrity) `mongodump` + tar running without validation → Potential silent failures → Need checksum & restoration test routine (Pending).
39. (Backup Frequency Hardcoded) Fixed 24h sleep loop → Inflexible scheduling → Dynamic interval env var proposed (Pending).

### J. SSL / Reverse Proxy
40. (Let’s Encrypt Failure) Duplicate `proxy_http_version` directive in NPM Advanced config → Nginx test fails, cert not requested → Remove duplicate directives (Resolved Pending Reattempt).
41. (External Port Forwarding Uncertainty) Router mapping vs overridden internal ports → Potential LE challenge failure → Document port forwarding requirements (Guidance Provided, Verification Pending).

### K. Tooling & Developer Experience
42. (Slow Manual Route Audits) Need repeated grep → Enumeration script missing → Provided concept (Pending Implementation).
43. (No Startup Self-Test) Early failures misattributed (e.g., Mongo vs wildcard route) → Add route & service assertion block (Pending).
44. (Lack of Automated Env Validation) Empty critical vars slip through → Need startup validator (Pending).
45. (No Seed Meta Tracking) Hard to know if data current → Add `seed_meta` doc plan (Pending).

### L. Future Hardening / Strategic Items
46. (Least-Privilege Enforcement) Still full root roles → Credential rotation & reduced roles (Planned).
47. (Secret Scanning) No automated scan pipeline → Recommend integration (Pending).
48. (Structured Metrics Exporter) No Prometheus/OpenTelemetry integration → Proposed incremental approach (Pending).
49. (Automated Integration Smoke Tests) Post-deploy manual checks → Plan for test container (Pending).
50. (Route Manifest Drift Detection) Unexpected route removals → Compare against expected manifest (Pending).

### M. 404-Focused Specific Struggles (Deep Dive)
51. (SPA vs API Ambiguity) HTML on `/api/*` → Fallback regex too broad → Regex adjusted (Resolved).
52. (Asset 404 Identification) Missing static build vs SPA fallback confusion → Introduced heuristic table (Resolved Guidance).
53. (Diagnostic Latency) Repeated manual curls → Need classifier script (Pending Implementation).
54. (Misleading 500 to 404 Transition) Initial crash masked route issues → After wildcard fix, true missing routes surfaced (Resolved Cause, Tooling Pending).

### Quick Actionable Next Steps Snapshot
- Implement scripts: route enumeration, 404 classifier, env validator.
- Add `/health`, `/metrics`, and bootstrap readiness JSON.
- Introduce seed sentinel + least-privilege Mongo user.
- Clean up NPM Advanced config; reattempt LE certificate; verify ports.
- Formalize PORTS.md & profile log prefixing.
- Begin credential rotation plan (Mongo app user + JWT secret).

---

---
