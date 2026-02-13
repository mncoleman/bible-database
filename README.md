# My Bible Log

A personal Bible reading tracker built with Next.js, React, and Supabase. Track daily reading progress, visualize completion across all 66 books, and stay on pace to read the entire Bible.

Live at [bible.mncoleman.com](https://bible.mncoleman.com)

## Features

- **Daily Tracking** — Log Bible reading passages with book/chapter/verse selects, see daily progress toward your verse goal
- **Books Overview** — Visual segment bars for all 66 books showing read vs. unread portions
- **Chapter Detail** — Drill into any book to see verse-level completion per chapter
- **Checklist** — Expandable accordion view with color-coded chapter grid (complete / partial / unread)
- **Progress Stats** — Overall completion percentage, verses read/remaining, estimated days to finish
- **Calendar** — Month grid with daily reading indicators and date detail panel
- **Settings** — Configurable daily goal, preferred Bible version and app, sign out
- **Open in Bible App** — Deep links to Bible Gateway, YouVersion, Blue Letter Bible, Olive Tree, and Bible.com
- **Dark Mode** — System-aware theme toggle
- **PWA** — Installable as a mobile app

## Tech Stack

- **Framework**: Next.js 16 + React 19 + TypeScript
- **UI**: shadcn/ui (New York style) + Tailwind CSS v4
- **Database**: Supabase (PostgreSQL + Auth + Row Level Security)
- **State**: @tanstack/react-query
- **Date**: date-fns
- **Hosting**: Vercel

## Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com) project

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/mncoleman/myPersonalBibleLog.git
cd myPersonalBibleLog
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration in `supabase/migrations/001_initial_schema.sql` — this creates the `log_entries` and `user_settings` tables with RLS policies
3. Go to **Authentication > Users** and create a user account (email/password)
4. Copy your project URL and anon key from **Settings > API**

### 3. Configure environment

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to the login page — sign in with the user account you created in Supabase.

## Production Deployment (Vercel)

### 1. Push to GitHub

```bash
git push origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and import your GitHub repository
2. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon key
3. Deploy

### 3. Custom domain (optional)

1. In Vercel, go to **Settings > Domains** and add `bible.mncoleman.com` (or your domain)
2. In your DNS provider, add a CNAME record:
   - **Name**: `bible` (or your subdomain)
   - **Value**: `cname.vercel-dns.com`
3. Wait for DNS propagation and SSL provisioning

### 4. Configure Supabase for production

In your Supabase project under **Authentication > URL Configuration**:
- Set **Site URL** to your production URL (e.g., `https://bible.mncoleman.com`)
- Add your production URL to **Redirect URLs**

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── today/              # Daily reading dashboard
│   ├── books/              # Book overview + [bookIndex] detail
│   ├── checklist/          # Chapter completion checklist
│   ├── calendar/           # Monthly calendar view
│   ├── progress/           # Statistics and progress
│   ├── settings/           # User preferences
│   └── login/              # Authentication
├── components/
│   ├── bible/              # Segment bar, progress bar, log entry card
│   ├── forms/              # Log entry form with cascading selects
│   └── ui/                 # shadcn/ui components
├── hooks/                  # React Query hooks for entries, settings, verse counts
└── lib/
    ├── bible/              # Core Bible data layer
    │   ├── bible.ts        # Verse ID encoding, range ops, display formatting
    │   ├── bible-books.ts  # 66 books with names, abbreviations, chapter counts
    │   ├── chapter-verses.ts # 1189 chapter → verse count mappings (NASB)
    │   ├── bible-apps.ts   # Bible app URL generators
    │   └── date-helpers.ts # Date utilities (date-fns)
    ├── supabase/           # Supabase client (browser, server, middleware)
    └── utils.ts            # cn() utility
supabase/
└── migrations/             # SQL schema migrations
```

## Bible Data

The app encodes every verse in the Bible as a unique integer ID using the formula:

```
verseId = 100000000 + (bookIndex * 1000000) + (chapter * 1000) + verse
```

This allows efficient range queries and segment generation across all 31,102 verses (NASB).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (http://localhost:3000) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
