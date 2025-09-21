<div align="center">

# Maaxly (React + Express + MongoDB)

Developer-friendly starter with a React (Vite) frontend and an Express/MongoDB API, plus optional Redis and Kafka integrations for messaging and live features.

</div>

## Quick Start

These steps are for Windows PowerShell (`pwsh`). Adjust paths as needed.

1) Prerequisites

- Node.js 18+ (recommended LTS)
- MongoDB running locally on `mongodb://localhost:27017`
- Git
- Optional: Redis (`redis://localhost:6379`), Kafka (`localhost:9093`). If not running, the app will still start and log a warning.

2) Clone and install

```pwsh
git clone https://github.com/TentacioPro/maaxly.git
cd maaxly
npm install
```

3) Seed sample data (recommended)

This creates demo users, profiles, opportunities, applications, and conversations.

```pwsh
# PowerShell chain included in the script
npm run seed:all

# Or run individually
npm run seed:skills
npm run seed:data
```

4) Run API and Web (two terminals)

- Terminal A (API on http://localhost:4000):

```pwsh
# In repo root
$env:JWT_SECRET = "dev-secret"
$env:CORS_ORIGIN = "http://localhost:5173"
$env:MONGODB_URI = "mongodb://localhost:27017"    # optional (defaults to this)
$env:MONGODB_DB = "mvp-db"                         # optional
# Optional services
# $env:REDIS_URL = "redis://localhost:6379"
# $env:KAFKA_BROKER = "localhost:9093"

npm run server
```

- Terminal B (Web on http://localhost:5173):

```pwsh
# In repo root
npm run dev
```

5) Verify

- API health: http://localhost:4000/api/test
- App: http://localhost:5173

## Seeded Logins

- Students: `student1@example.com` … `student10@example.com`
- Employers: `employer1@novasoft.io`, `employer2@bluepeak.dev`, …
- Admins: `admin1@example.com`, `admin2@example.com`
- Password for all seeded accounts: `Password123!`

Promote any user to admin manually:

```pwsh
node server/promote-admin.js user@example.com
```

## Environment Variables

Environment variables are read from the shell (no automatic .env loading). Typical values:

| Name | Default | Purpose |
|------|---------|---------|
| `PORT` | `4000` | API server port |
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DB` | `mvp-db` | Database name |
| `JWT_SECRET` | `dev-secret` | JWT signing secret (change in prod) |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed origin for dev |
| `REDIS_URL` | `redis://localhost:6379` | Optional Redis for inbox/unread counters |
| `KAFKA_BROKER` | `localhost:9093` | Optional Kafka broker for messaging |
| `KAFKA_TOPIC` | `chat-messages` | Kafka topic for chat messages |
| `KAFKA_GROUP_ID` | `chat-consumer-group` | Kafka consumer group |
| `KAFKA_PROFILE_TOPIC` | `profile-updates` | Kafka topic for profile updates |

PowerShell example:

```pwsh
$env:JWT_SECRET = "dev-secret"
$env:MONGODB_URI = "mongodb://localhost:27017"
$env:MONGODB_DB = "mvp-db"
$env:CORS_ORIGIN = "http://localhost:5173"
```

## Scripts

```jsonc
// package.json (selected)
{
	"dev": "vite",
	"server": "nodemon --watch server --watch .env --exec node server/index.js",
	"start": "node server/index.js",
	"presets:sync": "node server/scripts/generate-theme-presets.cjs",
	"seed:skills": "node server/scripts/seedSkills.js",
	"seed:data": "node server/scripts/seed.js",
	"seed:all": "pwsh -NoProfile -Command \"npm run seed:skills; npm run seed:data\"",
	"test": "jest --passWithNoTests"
}
```

- `npm run dev`: Start Vite dev server (frontend)
- `npm run server`: Start API with nodemon (backend)
- `npm run start`: Start API without nodemon
- `npm run presets:sync`: Regenerate theme presets
- `npm run seed:skills` / `npm run seed:data` / `npm run seed:all`: Seed sample data
- `npm test`: Run Jest tests (passes with no tests by default)

## API Highlights

- `GET /api/test` – Health and DB ping
- Auth: `POST /api/auth/signup`, `POST /api/auth/login`
- Profiles: `POST /api/profile/student`, `POST /api/profile/employer`, `GET /api/profile/me`, `PATCH /api/profile`
- Opportunities: list/create/view/insights
- Applications: create/check/list/my, status updates
- Messaging: protected routes under `/api/messages` (Kafka/Redis enhanced)
- Analytics: lightweight tracking and admin summaries

Most protected endpoints require `Authorization: Bearer <token>`.

## Optional Services

The API will check reachability and skip starting consumers if unavailable.

- Redis (recommended for unread counters/live inbox)
	- URL: `redis://localhost:6379`
- Kafka (optional for message ingestion)
	- Broker: `localhost:9093`

You can run these via Docker Desktop or local installers. If not running, the server still starts.

## Troubleshooting

- Vite not starting / port in use:
	- Close other dev servers or set a different port: `npm run dev -- --port 5174`
- API cannot connect to MongoDB:
	- Ensure MongoDB is running locally (or set `MONGODB_URI` to your cluster)
- CORS errors in browser:
	- Set `CORS_ORIGIN` to match your frontend URL before `npm run server`
- JWT “Missing token”:
	- Include `Authorization: Bearer <token>` from `/api/auth/login` response
- Windows PowerShell env vars not sticking:
	- Set per-session as shown above, or use `setx NAME "value"` to persist (requires new terminal)

## Notes for Collaborators

- This repo includes reference blueprints (`/docs/blueprint*.md`) and instruction files for the Copilot agent; code generation targets plain JSX and a custom theming system.
- The `golden-repo/` and `tweakcn-components/` folders are references only; the running app lives under `src/` and `server/`.

---

Happy hacking! If you get stuck, open an issue with your OS, Node version, and any console logs.
