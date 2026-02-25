# My Bible Log

Personal Bible reading tracker. Ported from mybiblelog-nuxt.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui (New York style)
- **Backend:** Supabase (auth + Postgres with RLS)
- **State:** @tanstack/react-query for server state
- **PWA:** Serwist service worker for offline caching
- **Design:** Monochromatic grayscale (customizable via settings), system fonts

## Commands

- `npm run dev` — Start dev server (Turbopack, SW disabled)
- `npm run build` — Production build (webpack, generates service worker)
- `npm run lint` — ESLint

Note: Build uses `--webpack` flag because Serwist requires webpack for SW generation.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── today/              # Daily reading log + suggestions + plan status
│   ├── books/              # Book list + [bookIndex] detail
│   ├── checklist/          # Accordion checklist with chapter squares
│   ├── calendar/           # Month calendar with mini progress bars + editing
│   ├── progress/           # Stats, segment bars, completion bars
│   ├── metrics/            # Recharts visualizations (daily, cumulative, heatmap)
│   ├── settings/           # Reading plan, bible prefs, colors, import/export
│   ├── login/              # Supabase auth
│   └── sw.ts               # Serwist service worker source
├── middleware.ts            # Next.js auth middleware (Supabase session refresh)
├── components/
│   ├── ui/                 # shadcn/ui primitives (DO NOT edit directly)
│   ├── bible/              # App components (log-entry-card, segment-bar, etc.)
│   ├── forms/              # LogEntryForm dialog
│   ├── nav.tsx             # Top nav + mobile bottom nav bar
│   ├── custom-color-provider.tsx  # Applies user color prefs to CSS vars
│   └── color-picker.tsx    # HSL color picker for settings
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
- **`user_settings`** — `id, user_id, daily_verse_count_goal, look_back_date, goal_end_date, preferred_bible_version, preferred_bible_app, primary_light, accent_light, chart_light, primary_dark, accent_dark, chart_dark, created_at, updated_at`

Types are in `src/lib/supabase/types.ts`. The `useFilteredLogEntries` hook respects the `look_back_date` setting — use it instead of `useLogEntries` for any progress/completion calculations.

## Navigation

- **Desktop:** Top nav bar with all page links
- **Mobile:** Bottom nav bar with Today, Progress, Settings, and More (popover with Books, Checklist, Calendar, Metrics)

## Custom Colors

Users can customize `--primary`, `--accent`, and `--chart-1` CSS variables via Settings > Display. The `CustomColorProvider` component applies these per light/dark theme. Colors are stored as HSL strings (e.g., `"220 70% 50%"`).

## Settings Autosave

All settings autosave with a 600ms debounce. No manual save buttons.

## Conventions

- **Tailwind v4 syntax:** Uses `@import "tailwindcss"` + `@theme inline` + `@custom-variant dark` in globals.css. No tailwind.config.
- **shadcn/ui:** New York style. Add components with `npx shadcn add <component>`. Don't edit files in `src/components/ui/` directly.
- **All pages are `"use client"`** — Supabase auth + React Query require client components.
- **Verse ranges are always within a single book** — `validateRange()` enforces this.
- **Total verse count:** 66 books, 1189 chapters, 31,102 verses (NASB).
- **No i18n** — English only, simplified from the original mybiblelog-nuxt.
- **Native `<select>` for numeric pickers** — Chapter/verse selects use native elements (iOS wheel picker, Android native dropdown). Book select uses shadcn Select.

## Style Guidelines

- Keep UI minimal and clean. Default grayscale palette, customizable via settings.
- Use `text-muted-foreground` for secondary text, `text-primary` for emphasis.
- Progress indicators: `<Progress>` bar for percentages, `<SegmentBar>` for read/unread visualization.
- Calendar days use mini progress bars showing reading vs daily goal.
- Toast notifications via `sonner` for success/error feedback.
- Enhanced shadows on cards, buttons, selects, and dialogs (light + dark mode).
- Icons from `lucide-react` only.
- Mobile font size bumped to 18px root for better readability.
