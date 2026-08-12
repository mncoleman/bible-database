# Bible Tracker

A personal Bible reading tracker built with Next.js, React, and Postgres. Track daily reading progress, visualize completion across all 66 books, and stay on pace to read the entire Bible.

## Features

- **Daily Tracking** — Log Bible reading passages with book/chapter/verse selects, see daily progress toward your verse goal
- **Books Overview** — Visual segment bars for all 66 books showing read vs. unread portions
- **Chapter Detail** — Drill into any book to see verse-level completion per chapter
- **Checklist** — Expandable accordion view with color-coded chapter grid
- **Progress Stats** — Overall completion percentage, verses read/remaining, estimated days to finish
- **Calendar** — Month grid with daily reading indicators and date detail panel
- **Metrics** — Recharts visualizations (daily, cumulative, heatmap)
- **Settings** — Configurable daily goal, preferred Bible version and app, custom colors, gradient background
- **Open in Bible App** — Deep links to Bible Gateway, YouVersion, Blue Letter Bible, Olive Tree, Bible.com
- **Authentication** — Email/password + Telegram OIDC; invite-only signup
- **Admin** — User management page with invite link creation (bound to email or open one-time)
- **PWA** — Installable as a mobile app, offline-capable via Serwist service worker
- **Dark Mode** — System-aware theme toggle

## Tech Stack

- **Framework:** Next.js 16 + React 19 + TypeScript
- **UI:** shadcn/ui (New York style) + Tailwind CSS v4
- **Backend:** The app's own API routes + Postgres 17 (no external backend services)
- **Auth:** Self-contained — bcrypt password hashes + JWT session cookie, Telegram OIDC as second method
- **State:** @tanstack/react-query
- **PWA:** Serwist service worker
- **Hosting:** Oracle Cloud ARM (Ampere A1, 4 cores / 23 GB RAM) — single instance running Caddy + Next.js (standalone) + Postgres

## Architecture

Everything runs on one Oracle Cloud ARM instance at `bible.mncoleman.com`:

```
Internet (TCP+UDP 443)
  └─ Caddy (auto-SSL, zstd+gzip, HTTP/2 + HTTP/3)
      └─ 127.0.0.1:3001 (Next.js standalone)
            └─ bible-db (postgres:17-alpine, compose network only)
```

Two containers total. The app's API route handlers and server actions query Postgres directly; sessions are a signed JWT cookie. No CORS, no cross-origin cookies, tight CSP.

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Docker (for Postgres)

### 1. Clone and install

```bash
git clone https://github.com/mncoleman/bible-database.git
cd bible-database
npm install
```

### 2. Set up Postgres (local dev)

```bash
docker run -d --name bible-db-dev -e POSTGRES_USER=bible -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=bible -p 5432:5432 postgres:17-alpine
docker exec -i bible-db-dev psql -U bible -d bible < db/schema.sql
```

Create a first user (invite flow needs an existing admin, so bootstrap by hand):

```bash
docker exec -i bible-db-dev psql -U bible -d bible -c \
  "create extension if not exists pgcrypto;
   insert into users (email, password_hash) values ('you@example.com', crypt('your-password', gen_salt('bf', 10)));"
```

### 3. Configure environment

Create `.env.local`:

```env
DATABASE_URL=postgresql://bible:dev@localhost:5432/bible
SESSION_SECRET=$(openssl rand -base64 48)

# Optional — only if you want Telegram OIDC in dev
TELEGRAM_BOT_TOKEN=numeric-id:secret
TELEGRAM_OIDC_CLIENT_SECRET=...
AUTH_STATE_SECRET=$(openssl rand -base64 48)
```

### 4. Run dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

## Production Deployment

Pushes to `main` auto-deploy via `.github/workflows/deploy.yml`:

1. rsync repo → ARM server (`/home/ubuntu/bible-database/`)
2. `docker compose --env-file .env.production build`
3. `docker compose up -d --no-deps app`
4. `curl https://bible.mncoleman.com/login` health check

Required GitHub repo secrets: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`.

Env vars live in `/home/ubuntu/bible-database/.env.production` on the server, gitignored. Edit in place via SSH; never commit. All env vars are runtime-only (`DATABASE_URL`, `SESSION_SECRET`, `TELEGRAM_*`, `AUTH_STATE_SECRET`, `BIBLE_DB_PASSWORD`) — nothing is baked into the browser bundle.

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── today/                    # Daily reading dashboard
│   ├── books/                    # Book overview + [bookIndex] detail
│   ├── checklist/                # Chapter completion checklist
│   ├── calendar/                 # Monthly calendar view
│   ├── progress/                 # Statistics and progress
│   ├── metrics/                  # Recharts visualizations
│   ├── settings/                 # User preferences
│   │   └── users/                # Admin: user management + invites
│   ├── signup/[token]/           # Invite redemption
│   ├── login/                    # Authentication
│   └── api/auth/telegram/        # Telegram OIDC endpoints
├── components/
│   ├── bible/                    # Segment bar, progress bar, log entry card
│   ├── forms/                    # Log entry form with cascading selects
│   └── ui/                       # shadcn/ui components — DO NOT edit
├── hooks/                        # React Query hooks
└── lib/
    ├── bible/                    # Verse encoding, books, chapter counts, app URLs
    ├── auth/                     # Sessions, passwords, server helpers
    ├── admin.ts                  # requireAdmin() + ADMIN_EMAIL
    └── public-origin.ts          # X-Forwarded-Host-aware origin helper

db/schema.sql                     # Canonical Postgres schema
.github/workflows/deploy.yml      # CI/CD
Dockerfile                        # Multi-stage Next.js standalone build
docker-compose.yml                # `app` (127.0.0.1:3001) + `db` (bible-db Postgres)
```

## Bible Data

The app encodes every verse in the Bible as a unique integer ID:

```
verseId = 100000000 + (bookIndex * 1000000) + (chapter * 1000) + verse
```

This allows efficient range queries and segment generation across all 31,102 verses (NASB).

## Authentication

**Email/password** + **Telegram OIDC**. Public signup is disabled — accounts can only be created through an invite link issued from the `/settings/users` admin page.

Admin is hardcoded to `mncoleman003@gmail.com` (see `src/lib/admin.ts`). To change: edit that file.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Turbopack, http://localhost:3000) |
| `npm run build` | Production build (webpack, generates service worker) |
| `npm start` | Start production server (after `build`) |
| `npm run lint` | Run ESLint |

## See also

`CLAUDE.md` — context for AI assistants working in this repo. Has more depth on infrastructure, gotchas, and conventions.
