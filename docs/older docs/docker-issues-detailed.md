# Docker Deployment Issues - Detailed Analysis

## Table of Contents
1. [Infrastructure Issues](#infrastructure-issues)
2. [Build & Compose Issues](#build--compose-issues)
3. [Runtime & API Issues](#runtime--api-issues)
4. [Security Issues](#security-issues)
5. [Docker Commands Reference](#docker-commands-reference)
6. [File Changes Made](#file-changes-made)
7. [Code Changes Summary](#code-changes-summary)

---

## Infrastructure Issues

### Issue 1: MongoDB Authentication Failed (Code 18)
**Symptom:** `MongoServerError: Authentication failed (code 18)` with container restart loop

**Root Cause Analysis:**
- DB volume initialized with different credentials than current `.env.prod`
- Backend not using same credentials as MongoDB container
- Missing app user or incorrect `authSource`

**Debugging Process:**
1. Checked backend logs: `docker logs maaxly-backend --tail 200`
2. Verified environment variables: `docker exec maaxly-backend printenv | grep MONGODB`
3. Compared .env.prod contents with runtime environment
4. Discovered credential mismatch between volume data and current config

**Solutions Tried:**
1. ❌ Updated environment variables only (failed - volume retained old data)
2. ❌ Restarted containers (failed - persistent volume issue)
3. ✅ **WORKING FIX:** Volume reset + standardized MONGODB_URI

**Final Resolution:**
```bash
# Stop services and reset volume
docker compose -f "docker-compose.kafka.yml" down
docker volume rm "eom august 31_mongo_data"

# Create app user explicitly
$rootUser = "maaxly"; $rootPass = "maaxlypass"
$appUser = "maaxly_prod_user"; $appPass = "maaxlypass"
docker exec -it maaxly-mongodb mongosh admin -u $rootUser -p $rootPass --eval "db.createUser({user:'$appUser', pwd:'$appPass', roles:[{role:'root', db:'admin'}]})"
```

**Files Modified:**
- `.env.prod`: Added MONGODB_APP_USER, MONGODB_APP_PASS
- `docker-compose.kafka.yml`: Added db-init service for user creation

### Issue 2: Time-of-Start Race Conditions
**Symptom:** Backend attempting connection before MongoDB ready

**Solution:** Added MongoDB healthcheck and service dependencies
```yaml
mongodb:
  healthcheck:
    test: ["CMD-SHELL","mongosh --eval 'db.adminCommand({ping:1})' --quiet || exit 1"]
    interval: 5s
    timeout: 5s
    retries: 10

backend:
  depends_on:
    mongodb:
      condition: service_healthy
    db-init:
      condition: service_completed_successfully
```

### Issue 3: Environment Variable Drift
**Symptom:** Backend not receiving expected environment variables

**Root Cause:** Relying on shell environment vs explicit compose env file loading

**Fix:** Enforced `--env-file` usage and added `env_file` directives to services

---

## Build & Compose Issues

### Issue 4: Frontend Build Failure - `vite: not found`
**Symptom:** Docker build step fails during `npm run build`
```
ERROR [builder 7/7] RUN npm run build
> vite build
sh: vite: not found
```

**Root Cause Analysis:**
1. Checked Dockerfile.frontend build process
2. Discovered `npm ci --omit=dev` excluding devDependencies
3. Confirmed `vite` listed as devDependency in package.json

**Solution:**
```dockerfile
# BEFORE (failing)
RUN npm ci --omit=dev

# AFTER (working)
RUN npm ci  # Install all dependencies including devDependencies
```

**File Modified:** `Dockerfile.frontend`

### Issue 5: Compose YAML Validation Error
**Symptom:** `services.frontend-prod.build.args must be a mapping`

**Root Cause:** Incorrect YAML indentation
```yaml
# BEFORE (failing)
args:
VITE_API_BASE: ${VITE_API_BASE:-/api}

# AFTER (working)
args:
  VITE_API_BASE: ${VITE_API_BASE:-/api}
```

**File Modified:** `docker-compose.kafka.yml`

### Issue 6: Oversized Build Context
**Symptom:** Slow Docker builds, high resource usage

**Solution:** Created comprehensive `.dockerignore`
```
node_modules/
.git/
dist/
coverage/
logs/
*.log
```

---

## Runtime & API Issues

### Issue 7: Path-to-RegExp Startup Crash
**Symptom:** `TypeError: Missing parameter name at 1` during Express startup

**Root Cause Analysis:**
1. Stack trace pointed to path-to-regexp library
2. Located problematic route: `app.get('*', ...)`
3. Discovered newer path-to-regexp versions reject bare `*` patterns
4. Route also hijacked `/api/*` paths causing 404 confusion

**Solution:**
```javascript
// BEFORE (crashing)
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'public' })
})

// AFTER (working)
app.get(/^\/((?!api\/).)*$/, (req, res) => {
  res.sendFile('index.html', { root: 'public' })
})
```

**File Modified:** `server/index.js`

### Issue 8: 404 vs 500 Classification Difficulty

## SSH Access — Successful Login (audit)

During the deployment and verification steps an SSH connection to the GCP VM was established successfully. This section records the commands used, observed host keys and public-key fingerprint, and a sanitized log excerpt for future audits.

Connection command used (PowerShell):
```pwsh
ssh -vvv -i $env:USERPROFILE\.ssh\id_ed25519 -p 22 maharajanabishekyt@34.133.48.104
```

Observed server host key fingerprints (added to local `~/.ssh/known_hosts`):
- ED25519: `SHA256:nVvkgOzxb6rknOtP+io/SMLKmHF5WiO2JuZ4B96f6Og`
- RSA: `SHA256:Awu/4MFJIVaHSwSBQ0YFqGsbiaWJHovQafG4eNDa9x4`
- ECDSA: `SHA256:tdrH7+X0R8cdNm849K6dcQXSwlYjdRD4BCcjqH0/ie8`

Client public-key fingerprint (the key offered by the client):
- ED25519 client key fingerprint: `SHA256:YAfGcP2tjzjJw4NITGmZMH9Bza7JNb024+DjKd8G6XA`

Sanitized verbose log excerpt (auth succeeded):
```
debug1: Server host key: ssh-ed25519 SHA256:nVvkgOzxb6rknOtP+io/...
debug1: Found key in C:\Users\Abishek/.ssh/known_hosts:1
debug1: Authenticating to 34.133.48.104:22 as 'maharajanabishekyt'
debug1: Offering public key: C:\Users\Abishek\.ssh\id_ed25519 ED25519 SHA256:YAfG...
debug1: Server accepts key: C:\Users\Abishek\.ssh\id_ed25519
Authenticated to 34.133.48.104 using "publickey".
Last login: Sun Nov 16 12:14:15 2025 from 35.240.214.69
```

Notes and next steps
- For GitHub Actions: store the private key in `SSH_PRIVATE_KEY` repository secret and store the host fingerprint in `SSH_FINGERPRINT` (preferred over `known_hosts` for the action version in use).
- To extract the host fingerprint on your workstation:
```pwsh
ssh-keyscan -t ed25519 34.133.48.104 2>$null | ssh-keygen -lf -
```
- Do not commit private keys to the repo. If a key is suspected exposed, remove it from `~/.ssh/authorized_keys` and rotate.

**Problem:** Hard to distinguish API missing routes from SPA fallback issues

**Solution Developed:** Classification heuristic table
| Response Type | Cause | Check Method |
|---------------|-------|-------------|
| HTML body + 200/404 | SPA fallback | Verify regex excludes /api |
| JSON + explicit status | API layer | Grep server routes |
| Empty + 404 + text/html | Static asset missing | Check build artifacts |

---

## Security Issues

### Issue 9: JWT Secret Missing/Inconsistent
**Symptom:** 500 errors during login attempts

**Root Cause:** Empty or placeholder JWT_SECRET values

**Solution:** Generated secure secrets for both environments
```bash
# .env.prod
JWT_SECRET=b245de8221a916fc8ff78d3ffa1f076ac55342008bda4ae3744b20522c7151bc14af768052b149f59a41bf111758c84e
```

### Issue 10: Root-Level MongoDB Access
**Current State:** App user has admin/root privileges
**Planned Fix:** Transition to least-privilege `readWrite` role

---

## Docker Commands Reference

### Container Management
```powershell
# Start production stack
docker compose -f "docker-compose.kafka.yml" --profile prod --env-file .env.prod up -d --build --force-recreate

# Start development stack
docker compose -f docker-compose.kafka.yml --profile dev --env-file .env.dev up -d --build

# Stop all services
docker compose -f "docker-compose.kafka.yml" down

# Force rebuild without cache
docker compose build --no-cache backend
```

### Debugging & Inspection
```powershell
# View logs
docker logs -f maaxly-backend --tail 200
docker logs maaxly-mongodb --tail 50

# Inspect environment
docker exec maaxly-backend printenv | grep MONGODB
docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' maaxly-backend

# Execute commands in containers
docker exec -it maaxly-mongodb mongosh admin -u maaxly -p maaxlypass
docker exec maaxly-backend node server/scripts/seed-docker.js
```

### Database Operations
```powershell
# Create MongoDB user
docker exec -it maaxly-mongodb mongosh admin -u $rootUser -p $rootPass --eval "db.createUser({user:'$appUser', pwd:'$appPass', roles:[{role:'root', db:'admin'}]})"

# Test database connectivity
docker exec -it maaxly-backend sh -lc 'mongosh "$MONGODB_URI" --eval "db.runCommand({ ping: 1 })"'

# PowerShell URI syntax (handle colons)
docker exec -it maaxly-mongodb mongosh "mongodb://$($appUser):$($appPass)@localhost:27017/admin?authSource=admin" --eval "db.runCommand({ ping: 1 })"
```

### Volume Management
```powershell
# Remove specific volume (data loss warning)
docker volume rm "eom august 31_mongo_data"

# List all volumes
docker volume ls

# Inspect volume
docker volume inspect eom august 31_mongo_data
```

### Connectivity Testing
```powershell
# Test service connectivity
docker exec maaxly-backend sh -lc 'ping -c1 mongodb; ping -c1 redis; nc -z kafka 29092 || echo kafka-fail'

# Check listening ports
docker exec maaxly-backend sh -lc 'netstat -tlnp'

# Redis connectivity
docker exec maaxly-backend sh -lc 'redis-cli -u $REDIS_URL PING'
```

---

## File Changes Made

### Configuration Files
1. **`.env.prod`**
   - Added `MONGODB_APP_USER=maaxly_prod_user`
   - Added `MONGODB_APP_PASS=maaxlypass`
   - Updated `MONGODB_URI` to use app user with `authSource=admin`
   - Set secure `JWT_SECRET`

2. **`.env.dev`**
   - Added comment about app user variables
   - Maintained existing structure for development

### Docker Configuration
3. **`docker-compose.kafka.yml`**
   - Added `db-init` one-shot service for user creation
   - Added MongoDB healthcheck
   - Updated backend dependencies to wait for db-init
   - Added `seed` one-shot service for data initialization
   - Commented out nginx-proxy-manager and duckdns services

4. **`Dockerfile.frontend`**
   - Removed `--omit=dev` flag from `npm ci`
   - Added comments about NODE_ENV timing
   - Ensured devDependencies available for build

5. **`Dockerfile.backend`**
   - No changes needed (already properly configured)

### Application Code
6. **`server/index.js`**
   - Replaced `app.get('*', ...)` with regex pattern `app.get(/^\/((?!api\/).)*$/, ...)`
   - Fixed SPA fallback route to exclude `/api` paths

### Documentation
7. **`docs/docker-deploy-troubleshooting.md`** (original)
   - Comprehensive troubleshooting log
   - Issue categorization and solutions

8. **`.dockerignore`** (created)
   - Excluded node_modules, .git, dist, coverage, logs
   - Reduced build context size

---

## Code Changes Summary

### Critical Route Fix (server/index.js)
```javascript
// PROBLEM: Bare wildcard incompatible with path-to-regexp v6
// BEFORE:
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'public' })
})

// SOLUTION: Negative lookahead regex excluding /api paths
// AFTER:
app.get(/^\/((?!api\/).)*$/, (req, res) => {
  res.sendFile('index.html', { root: 'public' })
})
```

### Docker Compose Enhancements
```yaml
# Added MongoDB user creation service
db-init:
  image: mongo:6.0
  container_name: maaxly-db-init
  environment:
    MONGO_INITDB_ROOT_USERNAME: ${MONGO_INITDB_ROOT_USERNAME}
    MONGO_INITDB_ROOT_PASSWORD: ${MONGO_INITDB_ROOT_PASSWORD}
    MONGODB_APP_USER: ${MONGODB_APP_USER:-maaxly_prod_user}
    MONGODB_APP_PASS: ${MONGODB_APP_PASS:-maaxlypass}
  depends_on:
    mongodb:
      condition: service_healthy
  command: |
    mongosh admin --host mongodb -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --eval "if (!db.getUser('${MONGODB_APP_USER}')) { db.createUser({user: '${MONGODB_APP_USER}', pwd: '${MONGODB_APP_PASS}', roles:[{role:'root', db:'admin'}]}); print('Created user ${MONGODB_APP_USER}'); } else { print('User ${MONGODB_APP_USER} already exists'); }"
  restart: "no"
  profiles:
    - prod

# Added automatic seeding
seed:
  image: node:20-alpine
  container_name: maaxly-seed
  working_dir: /app
  environment:
    MONGODB_URI: ${MONGODB_URI}
    MONGODB_DB: ${MONGODB_DB}
    JWT_SECRET: ${JWT_SECRET}
  command: sh -lc "npm ci --omit=dev && node server/scripts/seed-docker.js || node server/scripts/seed.js"
  volumes:
    - ./:/app
  depends_on:
    mongodb:
      condition: service_healthy
    db-init:
      condition: service_completed_successfully
  restart: "no"
  profiles:
    - prod
```

### Environment Standardization
```bash
# .env.prod - Standardized MongoDB connection
MONGODB_URI=mongodb://maaxly_prod_user:${MONGODB_APP_PASS}@mongodb:27017/maaxly_prod_db?authSource=admin
MONGODB_DB=maaxly_prod_db
MONGODB_APP_USER=maaxly_prod_user
MONGODB_APP_PASS=maaxlypass
JWT_SECRET=b245de8221a916fc8ff78d3ffa1f076ac55342008bda4ae3744b20522c7151bc14af768052b149f59a41bf111758c84e
```

---

## Resolution Timeline

1. **Phase 1:** Infrastructure Stabilization
   - MongoDB auth resolution
   - Environment variable standardization
   - Service orchestration improvements

2. **Phase 2:** Build Process Optimization
   - Frontend build fixes (vite dependency)
   - Docker context optimization
   - Compose configuration corrections

3. **Phase 3:** Runtime Error Resolution
   - Path-to-regexp crash fix
   - SPA routing corrections
   - 404/500 classification

4. **Phase 4:** Current (Security & Monitoring)
   - JWT secret management
   - User privilege planning
   - Health check implementation

---

*Compiled from docker-deploy-troubleshooting Nov14.md*
*Analysis Date: November 15, 2025*
*Total Issues Catalogued: 54+ distinct problems across 6 major categories*