-- Bible Tracker schema — plain Postgres 17, no Supabase.
-- Applied once at first bring-up:
--   docker exec -i bible-db psql -U bible -d bible < db/schema.sql
-- Consolidates the old supabase/migrations/001–009 with auth.users replaced
-- by a local users table. Access control lives in the app's API layer (every
-- query filters by the session user id) — no RLS.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);

create unique index if not exists users_email_lower_idx on users (lower(email));

create table if not exists log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  date date not null default current_date,
  start_verse_id integer not null,
  end_verse_id integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists log_entries_user_id_idx on log_entries(user_id);
create index if not exists log_entries_date_idx on log_entries(date);
create index if not exists log_entries_user_date_idx on log_entries(user_id, date);

create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null unique,
  daily_verse_count_goal integer not null default 86,
  look_back_date date,
  preferred_bible_version text default 'NASB2020',
  preferred_bible_app text default 'BIBLEGATEWAY',
  start_page text default 'today',
  theme text default 'system',
  goal_end_date date,
  -- Color customization (HSL format: "220 70% 50%")
  primary_light text,
  accent_light text,
  chart_light text,
  primary_dark text,
  accent_dark text,
  chart_dark text,
  -- Beam background settings
  beam_color_light text,
  beam_color_dark text,
  beam_width real,
  beam_height real,
  beam_count integer,
  beam_speed real,
  beam_noise_intensity real,
  beam_noise_scale real,
  beam_rotation real,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- NOTE: the CHECK constraints from old migration 005 are intentionally
-- absent — they were never applied to production and live data violates
-- them (e.g. beam_noise_intensity 1.25 > the constraint's max of 1).

create table if not exists telegram_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null unique,
  telegram_id text not null unique,
  telegram_username text,
  first_name text,
  last_name text,
  photo_url text,
  created_at timestamptz not null default now()
);

create index if not exists telegram_identities_user_id_idx on telegram_identities(user_id);
create index if not exists telegram_identities_telegram_id_idx on telegram_identities(telegram_id);

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  email text,                                                -- NULL = open invite
  created_by uuid references users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,                                    -- NULL = never expires
  used_at timestamptz,
  used_by uuid references users(id) on delete set null,
  used_email text,
  note text
);

create index if not exists invites_token_idx on invites(token);
create index if not exists invites_created_by_idx on invites(created_by);

-- updated_at maintenance
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists log_entries_updated_at on log_entries;
create trigger log_entries_updated_at
  before update on log_entries
  for each row execute function handle_updated_at();

drop trigger if exists user_settings_updated_at on user_settings;
create trigger user_settings_updated_at
  before update on user_settings
  for each row execute function handle_updated_at();
