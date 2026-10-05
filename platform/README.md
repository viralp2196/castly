# Castly platform

Castly as a SaaS: people sign up, write a UGC ad script, cast a creator, hear it in a real voice with word-locked captions, and generate a 6-second video. Each video costs one credit.

```
platform/
  apps/api         Node 22 · Express 5 · Prisma 6 · PostgreSQL
  apps/web         React 19 · Vite 7 · React Router 7 · TanStack Query · Tailwind 4
  packages/shared  zod schemas, API types, creator catalog, caption timing (used by both)
```

The TanStack Start app at the repo root is untouched; this folder is a separate project.

## Run it locally

You need Node 22+ and PostgreSQL.

```bash
cd platform
npm install

# 1. Databases (pick one)
createdb castly && createdb castly_test          # local Postgres (e.g. Homebrew)
docker compose up -d                             # or Docker (creates both)

# 2. Settings
cp apps/api/.env.example apps/api/.env
#    set DATABASE_URL / TEST_DATABASE_URL (include your user, e.g. postgresql://you@localhost:5432/castly)
#    set XAI_API_KEY to turn on scripts, voice and video

# 3. Schema
npm run db:migrate

# 4. Both apps
npm run dev        # web http://localhost:5173  ·  api http://localhost:4000
```

In dev the web server proxies `/api` to the API, so cookies are same-origin. Without `XAI_API_KEY` everything works except the three AI actions, which answer "isn't configured on this server yet" and never charge a credit. Without `SMTP_URL`, password-reset emails are printed in the API terminal.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API (tsx watch) + web (Vite) together |
| `npm test` | API integration tests against `castly_test`, web + shared unit tests |
| `npm run typecheck` | `tsc --noEmit` in every workspace |
| `npm run build` | API bundle (`apps/api/dist`) and web build (`apps/web/dist`) |
| `npm run db:migrate` | Create/apply migrations in dev (`prisma migrate dev`) |
| `npm run db:deploy` | Apply committed migrations in production (`prisma migrate deploy`) |
| `npm start` | Run the built API |

API tests run `prisma migrate deploy` on the test database and truncate tables between tests. They refuse to run unless the database URL contains `test`.

## How it works

**Accounts.** Email + password (bcrypt). Sessions are random tokens in an `httpOnly`, `SameSite=Lax` cookie; only a SHA-256 hash is stored. State-changing requests from origins not listed in `WEB_ORIGIN` are rejected. Register, login, forgot and reset are rate-limited. Password reset links work once, expire in an hour and sign out every other device.

**Credits.** New users get `FREE_CREDITS` (default 3). Starting a video debits one credit in the same database transaction that creates the job, using a conditional update, so concurrent clicks can never spend the same credit twice. Every change is written to the `CreditEntry` ledger (`signup_grant`, `video_debit`, `video_refund`, `admin_grant`, `purchase`), which is where Stripe top-ups will plug in.

**AI (xAI).**
- Script: `grok-4.5` drafts hook, body, CTA and two alternate hooks. Capped by `DAILY_SCRIPT_LIMIT` per user per UTC day.
- Voice: xAI TTS with character timestamps, turned into word cues for the karaoke captions. The audio is stored; replaying the same line, voice and pace reuses it at no cost. Capped by `DAILY_VOICE_LIMIT`.
- Video: `grok-imagine-video-1.5`, 6s, 720p, using the creator portrait as the opening frame and the product photo as a reference when the format is "Product in frame". At most `MAX_PENDING_VIDEOS` render at once per user.
- Video on LTX instead: set `LTX_API_URL` to an LTX-2.3 server and clips go to its `POST /generate-character` (multi-subject reference). The creator portrait is the first subject and, for "Product in frame", the product photo the second. `LTX_DURATION` (1-10s) and `LTX_STEPS` (4-16) tune the render. Credits, refunds and storage work the same.

**Video jobs.** A poller inside the API checks pending jobs every `POLL_INTERVAL_MS`. Finished clips are downloaded into our storage (xAI links expire). Failed, expired, or stuck jobs (`VIDEO_TIMEOUT_MINUTES`) are marked failed and refunded exactly once. The poller assumes one API instance; for several instances, move it to a single worker process.

**Storage.** `STORAGE_DRIVER=local` writes to `STORAGE_DIR`; `s3` works with AWS S3 or Cloudflare R2. Media is only served to its owner: local files stream with range support, S3 objects redirect to a 10-minute signed URL.

## API

All endpoints are under `/api`, take and return JSON, and fail with `{ "error": { "code", "message", "fields?" } }`.

| Method | Path | |
| --- | --- | --- |
| POST | `/auth/register` · `/auth/login` · `/auth/logout` | Session cookie in / out |
| GET | `/auth/me` | `{ user }` or `{ user: null }` |
| POST | `/auth/forgot` · `/auth/reset` | Password reset by email link |
| PATCH | `/account` | Update name |
| POST | `/account/password` | Change password |
| GET | `/credits` | Balance, ledger, today's usage |
| GET · POST | `/projects` | List · create (optionally from `templateId`) |
| GET · PATCH · DELETE | `/projects/:id` | Read · autosave fields · delete |
| PUT · DELETE | `/projects/:id/product-image` | Upload (multipart `image`, JPEG/PNG/WebP ≤ 5 MB) · remove |
| POST | `/projects/:id/script` | Write script (`mode: full \| hooks`) |
| POST | `/projects/:id/voice` | Render or reuse the voice take |
| POST | `/projects/:id/videos` | Spend 1 credit, start a 6s clip |
| GET · DELETE | `/videos` · `/videos/:id` | Library · status (poll) · delete |
| GET | `/media/videos/:id` · `/media/voice/:id` · `/media/projects/:id/product-image` | Owner-only files (`?download=1` for mp4) |

## Deploying

The simplest setup is one origin: build both apps, then let the API serve the web build.

```bash
npm run build
NODE_ENV=production \
DATABASE_URL=... XAI_API_KEY=... \
WEB_ORIGIN=https://castly.example.com \
SERVE_WEB_DIST=../web/dist \
TRUST_PROXY=true \
npm run db:deploy && npm start
```

In production, cookies are `Secure` by default (set `COOKIE_SECURE=false` only for plain-HTTP testing). Use `STORAGE_DRIVER=s3` on any host with an ephemeral disk. To host the web app separately, set `VITE_API_URL` at build time and serve both under one parent domain, so the `SameSite=Lax` cookie still reaches the API.

## Not built yet

Stripe checkout and webhooks (the ledger is ready for them), email verification, teams, an admin panel, custom creator uploads, and burning captions into the exported mp4.
