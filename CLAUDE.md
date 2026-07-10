# Bible Tracker

Personal Bible reading tracker. Ported from mybiblelog-nuxt.

Live at https://bible.mncoleman.com — self-hosted on a single Oracle Cloud ARM instance (`161.153.110.196`), no Vercel, no external services. Supabase was fully removed 2026-07-10 (commit `ffe2343`); the app now runs its own auth and talks straight to Postgres.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui (New York style)
- **Backend:** The app itself — API route handlers + server actions querying Postgres 17 (`pg` pool in `src/lib/db.ts`)
- **Auth:** Self-contained — bcryptjs password hashes + 30-day JWT session cookie (`jose`), Telegram OIDC as second method
- **State:** @tanstack/react-query for server state
- **PWA:** Serwist service worker for offline caching
- **Design:** Liquid Glass design language (Apple-inspired frosted glass), system fonts

## Commands

- `npm run dev` — Start dev server (Turbopack, SW disabled)
- `npm run build` — Production build (webpack, generates service worker)
- `npm run lint` — ESLint

Note: Build uses `--webpack` flag because Serwist requires webpack for SW generation. Do not revert to Turbopack for builds.

## Production infrastructure

Single Oracle Cloud ARM instance (`n8n-arm`, 4 cores / 23 GB RAM / 200 GB disk):

```
Internet (443 TCP+UDP)
      |
Caddy (zstd+gzip compression, HTTP/2 + HTTP/3, auto-SSL)
      |
      \---- everything
              → 127.0.0.1:3001 (Next.js standalone)
                    |
                    \---- bible-db (postgres:17-alpine, compose network only)
```

Two containers, one compose project: `app` (bible-database-app, port 3001) and `db` (bible-db, postgres:17-alpine, volume `bible_db_data`, reachable only on the compose network as host `db`).

**Server paths:**
- App: `/home/ubuntu/bible-database/` (compose project: app on port 3001 + bible-db)
- Caddyfile: `/etc/caddy/Caddyfile`
- SSH: `ssh -i "/Users/matthewcoleman/Desktop/SSH Info/ssh-key-2025-06-27.key" ubuntu@161.153.110.196`

**Env file** (`/home/ubuntu/bible-database/.env.production`, gitignored, hand-edited on the server):
- `DATABASE_URL` — `postgresql://bible:<BIBLE_DB_PASSWORD>@db:5432/bible`
- `BIBLE_DB_PASSWORD` — interpolated into the compose db service
- `SESSION_SECRET` — signs the session JWT
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OIDC_CLIENT_SECRET`, `AUTH_STATE_SECRET` — Telegram OIDC

No build-time public env vars remain (the old `NEXT_PUBLIC_SUPABASE_*` pair is gone). The Dockerfile sets placeholder `DATABASE_URL`/`SESSION_SECRET` for `next build` only — no connection is opened at build time.

## Deployment

GitHub Actions deploys every push to `main` via `.github/workflows/deploy.yml`:

1. rsync repo → ARM server (`/home/ubuntu/bible-database`)
2. `docker compose --env-file .env.production build`
3. `docker compose up -d --no-deps app` (db service keeps running across deploys)
4. `curl https://bible.mncoleman.com/login` health check

Secrets in repo settings: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`. Pushing to `main` is the only deploy path — never edit files directly on the server.

## Database

Plain Postgres 17 in the `bible-db` container. Canonical schema: `db/schema.sql` (users, log_entries, user_settings, telegram_identities, invites + `handle_updated_at` triggers). `db/migrate-from-supabase.sh` is the historical one-time migration from the old Supabase stack.

No migration runner; schema changes are applied by hand:
```bash
ssh ubuntu@161.153.110.196 'docker exec -i bible-db psql -U bible -d bible' < some-migration.sql
```

There is **no RLS and no PostgREST** — every query goes through the app's API routes / server actions, which filter by the session user id (`where user_id = $1`). When adding a new table or route, that per-user filter IS the security boundary; never interpolate values into SQL (parameterized queries only).

Nightly `pg_dumpall` lands in `/home/ubuntu/backups/<stamp>/bible-pg_dumpall.sql.gz` (server-recipe backup.sh) and is pushed encrypted off-site.

## Authentication

All self-contained in `src/lib/auth/`:

- **Sessions** (`session.ts`): 30-day HS256 JWT in the `bt_session` httpOnly cookie, signed with `SESSION_SECRET`. The proxy middleware re-issues tokens older than 24h (sliding renewal) — no refresh-token machinery, PWA-safe.
- **Passwords** (`password.ts`): bcryptjs, cost 10. The migrated GoTrue `$2a$10$` hashes verify as-is — old passwords survived the Supabase removal.
- **Server helpers** (`server.ts`): `getSessionUser()` / `requireUser()` read the cookie via `next/headers`.
- **Login/logout**: `POST /api/auth/login` (dummy-hash compare on unknown email to keep timing flat), `POST /api/auth/logout`.
- **Middleware** (`src/proxy.ts`): verifies the JWT (edge-safe, `jose` only — never import `pg` here), redirects pages to `/login`, 401s `/api/*`; public prefixes: `/login`, `/signup`, `/api/auth`.

**Telegram OIDC** as a second method, configured via `oauth.telegram.org` (`src/lib/telegram-oidc.ts` — unchanged protocol). Bot client_id is the numeric prefix of `TELEGRAM_BOT_TOKEN`. Redirect URI is `https://bible.mncoleman.com/api/auth/telegram/callback`. Sign-in mode mints the session JWT directly in the callback; link mode upserts `telegram_identities`.

**Public signup is disabled** — the only way to create an account is through an invite link.

**Server-side redirect URIs MUST use `publicOrigin(request)`** from `src/lib/public-origin.ts`, NOT `new URL(req.url).origin`. Inside the container, `req.url` resolves to `http://0.0.0.0:3001/...` because Caddy terminates TLS upstream. The helper reads `X-Forwarded-Host` so OAuth providers get the real public URL. Used by `src/app/api/auth/telegram/{start,callback}/route.ts`.

## Admin + invite system

**Admin gate is hardcoded** to `mncoleman003@gmail.com` in:
- `src/lib/admin.ts` — `ADMIN_EMAIL`, `requireAdmin()` for server actions
- Client UI checks use `useIsAdmin()` (`src/hooks/use-is-admin.ts`), which reads `GET /api/me`

To change admins: edit `src/lib/admin.ts`. To support multiple admins later, migrate to a `user_roles` table.

**Invite flow** (`/settings/users` admin page → `/signup/[token]` for recipients):
- Invites are rows in `invites` with token, optional bound email, expiry, and used state
- Token is `crypto.randomBytes(24).toString("base64url")` — 192-bit, single-use, generated server-side
- Bound invites lock the email field at signup; open invites accept any email
- Server action `redeemInvite` (in `src/app/signup/[token]/actions.ts`) runs a transaction: `SELECT ... FOR UPDATE` on the invite, insert into `users` with a bcrypt hash, mark invite used
- The proxy middleware allows `/signup` through without a session

## Data API

Client hooks call the app's own routes via `src/lib/api.ts` (thin fetch wrapper, throws on non-2xx):

- `GET|POST /api/log-entries`, `PATCH|DELETE /api/log-entries/[id]`, `POST /api/log-entries/bulk`
- `GET|PUT /api/settings` (PUT is a single upsert, column-whitelisted)
- `GET /api/telegram-identity`, `POST /api/auth/telegram/unlink`
- `GET /api/me` → `{ id, email, isAdmin }`

`src/lib/db.ts` registers a pg type parser that returns DATE columns as `"YYYY-MM-DD"` strings — the app compares dates with plain string ordering; don't remove it.

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── today/                    # Daily reading log + suggestions + plan status
│   ├── books/                    # Book list + [bookIndex] detail
│   ├── checklist/                # Accordion checklist with chapter squares
│   ├── calendar/                 # Month calendar with mini progress bars + editing
│   ├── progress/                 # Stats, segment bars, completion bars
│   ├── metrics/                  # Recharts visualizations
│   ├── settings/                 # Reading plan, bible prefs, colors, import/export
│   │   └── users/                # Admin-only user management + invite UI
│   ├── signup/[token]/           # Invite redemption flow
│   ├── login/                    # Email/password + Telegram sign-in
│   ├── api/                      # Auth + data route handlers (see Data API)
│   └── sw.ts                     # Serwist service worker source
├── proxy.ts                       # Session-verify middleware (jose only, edge-safe)
├── components/ui/                 # shadcn/ui primitives — DO NOT edit
├── hooks/                         # React Query hooks
└── lib/
    ├── bible/                     # Verse encoding, books, chapter counts, app URLs
    ├── auth/                      # session/server/password/users
    ├── db.ts                      # pg Pool (server-only)
    ├── api.ts                     # client fetch wrapper for /api routes
    ├── types.ts                   # LogEntry / UserSettings / TelegramIdentity
    ├── admin.ts                   # requireAdmin() + ADMIN_EMAIL constant
    └── public-origin.ts           # X-Forwarded-Host-aware origin helper

db/schema.sql                       # Canonical Postgres schema
db/migrate-from-supabase.sh         # Historical one-time Supabase → bible-db migration
.github/workflows/deploy.yml        # CI/CD: rsync + build + restart + healthcheck
Dockerfile                          # Multi-stage: deps → builder → app
docker-compose.yml                  # app (127.0.0.1:3001) + db (bible-db)
```

## Bible Data Layer (`src/lib/bible/`)

This is the heart of the app. All verse math happens here.

- **`bible.ts`** — `Bible` namespace with verse ID encoding, range parsing, segment generation, display formatting. Verse IDs use encoding: `100000000 + book*1000000 + chapter*1000 + verse`.
- **`bible-books.ts`** — 66 books with name, abbreviations, chapter count, testament info. English only.
- **`chapter-verses.ts`** — 1189 chapter→verse count mappings (NASB). Keyed by verse ID with chapter=index, verse=0.
- **`bible-apps.ts`** — URL generators for Bible Gateway, YouVersion, Blue Letter Bible, etc.
- **`recommendations.ts`** — Reading suggestions.
- **`date-helpers.ts`** — Date utilities using date-fns.

Key functions: `Bible.parseVerseRange()` converts display strings like "Genesis 1:1-5" to verse ID ranges. `Bible.displayVerseRange()` does the reverse. `Bible.generateBibleSegments()` produces read/unread segments for the whole Bible.

## Performance

`next.config.ts` opts into `experimental.optimizePackageImports` for `lucide-react`, `date-fns`, `radix-ui`, `@tanstack/react-query`, `recharts` — these have barrel files that webpack can't tree-shake without help.

Caddy serves `_next/static/*` with `Cache-Control: public, max-age=31536000, immutable` and compresses everything with zstd (preferred) or gzip. HTTP/3 is enabled via `alt-svc` header — browsers upgrade on second visit. Don't add a manual `@static` matcher to the Caddyfile that includes `/sw.js` — Serwist's SW needs `max-age=0` to be updatable, which Next.js sets correctly on its own.

## Conventions

- **Tailwind v4 syntax:** `@import "tailwindcss"` + `@theme inline` + `@custom-variant dark` in globals.css. No tailwind.config.
- **shadcn/ui:** New York style. Add components with `npx shadcn add <component>`. Don't edit files in `src/components/ui/` directly.
- **All pages are `"use client"`** — React Query requires client components. (Exception: `/settings/users` and `/signup/[token]` are server components that render client children, since they need server-side admin gates / token validation.)
- **Verse ranges are always within a single book** — `validateRange()` enforces this.
- **Total verse count:** 66 books, 1189 chapters, 31,102 verses (NASB).
- **Native `<select>` for numeric pickers** — Chapter/verse selects use native elements. Book select uses shadcn Select.

## Style Guidelines

- Liquid Glass surfaces with customizable blue gradient background.
- `text-muted-foreground` for secondary text, `text-primary` for emphasis.
- Progress indicators: `<Progress>` for percentages, `<SegmentBar>` for read/unread.
- Calendar days use mini progress bars showing reading vs daily goal.
- Toast via `sonner` for success/error feedback.
- 3D layered box shadows on cards and tabs (stacked 1→2→4→8→16px). Never use `transform: scale()` on elements inside flex/grid — causes layout shifts.
- Icons from `lucide-react` only. Default size `w-4 h-4` or `w-3.5 h-3.5`.
- Mobile font size bumped to 18px root.

## Things that bit us once and shouldn't again

- **`url.origin` inside the Docker container resolves to `http://0.0.0.0:3001/...`** — Caddy terminates TLS upstream, so `req.url` is the Node listen address, not the public URL. Use `publicOrigin(request)` from `src/lib/public-origin.ts` for any redirect that leaves our server. Bit us on Telegram OAuth (`redirect_uri required` error from oauth.telegram.org).
- **`/api/` GET reads must be NetworkFirst in the service worker, never StaleWhileRevalidate** — SWR returns stale cached data instantly after mutations, making optimistic updates revert. Same bug existed with the old `/rest/` Supabase paths.
- **`@serwist/next` is webpack-only.** Next 16 defaults `next build` to Turbopack which silently produces no `public/sw.js`. `pnpm/npm run build` is pinned to `next build --webpack`. Dev is fine on Turbopack (Serwist disabled there).
- **Proxy middleware redirects `/sw.js` to `/login`** if you don't explicitly bypass it. The matcher in `src/proxy.ts` excludes `/sw.js`, `/sw.js.map`, `/swe-worker-*.js`. Don't narrow it.
- **Never import `pg` (or anything touching `src/lib/db.ts`) from `src/proxy.ts`** — middleware runs on the edge runtime; `jose` is fine, `pg` is not.
- **Old migration 005's CHECK constraints were never applied in prod** and live data violates them (`beam_noise_intensity` 1.25 > 1). `db/schema.sql` intentionally omits them — don't "restore" them without cleaning the data first.
- **The old GoTrue bcrypt hashes are `$2a$10$`** — bcryptjs verifies them natively. If auth is ever swapped again, hashes must carry over the same way.
