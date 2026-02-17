# Database Migration: Color Customization

## Migration File
`supabase/migrations/002_add_color_settings.sql`

## What's Added
This migration adds 6 new columns to the `user_settings` table for custom color preferences:

- `primary_light` - Primary color for light mode
- `accent_light` - Accent color for light mode
- `chart_light` - Chart and goal line color for light mode
- `primary_dark` - Primary color for dark mode
- `accent_dark` - Accent color for dark mode
- `chart_dark` - Chart and goal line color for dark mode

All colors are stored in HSL format (e.g., "220 70% 50%").

## How to Apply

### Option 1: Using Supabase CLI
```bash
supabase db push
```

### Option 2: Manual Application
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/002_add_color_settings.sql`
4. Run the query

## Features Enabled
After applying this migration, users can:
- Customize primary, accent, and chart colors for both light and dark modes
- See changes applied in real-time throughout the app
- Reset colors to defaults at any time
- Customize the goal reference line color in the Metrics page

## Location in App
Settings → Display → Custom Colors
