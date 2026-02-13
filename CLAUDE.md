# My Bible Log

Personal Bible reading tracker. Ported from mybiblelog-nuxt.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui (New York style)
- **Backend:** Supabase (auth + Postgres with RLS)
- **State:** @tanstack/react-query for server state
- **Design:** Monochromatic grayscale, system fonts (matches mncoleman.com)

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build (use to verify TypeScript)
- `npm run lint` — ESLint

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── today/              # Daily reading log + suggestions
│   ├── books/              # Book list + [bookIndex] detail
│   ├── checklist/          # Accordion checklist with chapter squares
│   ├── calendar/           # Month calendar with day detail + editing
│   ├── progress/           # Stats, segment bars, completion bars
│   ├── settings/           # Preferences + import/
│   └── login/              # Supabase auth
├── components/
│   ├── ui/                 # shadcn/ui primitives (DO NOT edit directly)
│   ├── bible/              # App components (log-entry-card, segment-bar, etc.)
│   └── forms/              # LogEntryForm dialog
├── hooks/                  # React Query hooks (log entries, settings, verse counts)
└── lib/
    ├── bible/              # Core Bible data layer (see below)
    └── supabase/           # Client, server, middleware, types
```

## Bible Data Layer (`src/lib/bible/`)

This is the heart of the app. All verse math happens here.

- **`bible.ts`** — `Bible` namespace with verse ID encoding, range parsing, segment generation, display formatting. Verse IDs use encoding: `100000000 + book*1000000 + chapter*1000 + verse`.
- **`bible-books.ts`** — 66 books with name, abbreviations, chapter count, testament info. English only.
- **`chapter-verses.ts`** — 1189 chapter→verse count mappings (NASB). Keyed by verse ID with chapter=index, verse=0.
- **`bible-apps.ts`** — URL generators for Bible Gateway, YouVersion, Blue Letter Bible, etc.
- **`recommendations.ts`** — Reading suggestions (continue, unread gaps, popular starting points).
- **`date-helpers.ts`** — Date utilities using date-fns.

Key functions: `Bible.parseVerseRange()` converts display strings like "Genesis 1:1-5" to verse ID ranges. `Bible.displayVerseRange()` does the reverse. `Bible.generateBibleSegments()` produces read/unread segments for the whole Bible.

## Database

Two tables with Row Level Security:

- **`log_entries`** — `id, user_id, date, start_verse_id, end_verse_id, created_at, updated_at`
- **`user_settings`** — `id, user_id, daily_verse_count_goal, look_back_date, preferred_bible_version, preferred_bible_app, start_page, theme, created_at, updated_at`

Types are in `src/lib/supabase/types.ts`. The `useFilteredLogEntries` hook respects the `look_back_date` setting — use it instead of `useLogEntries` for any progress/completion calculations.

## Conventions

- **Tailwind v4 syntax:** Uses `@import "tailwindcss"` + `@theme inline` + `@custom-variant dark` in globals.css. No tailwind.config.
- **shadcn/ui:** New York style. Add components with `npx shadcn add <component>`. Don't edit files in `src/components/ui/` directly.
- **All pages are `"use client"`** — Supabase auth + React Query require client components.
- **Verse ranges are always within a single book** — `validateRange()` enforces this.
- **Total verse count:** 66 books, 1189 chapters, 31,102 verses (NASB).
- **No i18n** — English only, simplified from the original mybiblelog-nuxt.

## Style Guidelines

- Keep UI minimal and clean. No color beyond the grayscale palette.
- Use `text-muted-foreground` for secondary text, `text-primary` for emphasis.
- Progress indicators: `<Progress>` bar for percentages, `<SegmentBar>` for read/unread visualization.
- Toast notifications via `sonner` for success/error feedback.
- Icons from `lucide-react` only.
