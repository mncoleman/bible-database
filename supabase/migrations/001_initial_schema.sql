-- Log entries table
create table public.log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  start_verse_id integer not null,
  end_verse_id integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User settings table
create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  daily_verse_count_goal integer not null default 86,
  look_back_date date,
  preferred_bible_version text default 'NASB2020',
  preferred_bible_app text default 'BIBLEGATEWAY',
  start_page text default 'today',
  theme text default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS policies
alter table public.log_entries enable row level security;
alter table public.user_settings enable row level security;

create policy "Users can view own log entries"
  on public.log_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own log entries"
  on public.log_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own log entries"
  on public.log_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own log entries"
  on public.log_entries for delete
  using (auth.uid() = user_id);

create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- Indexes
create index log_entries_user_id_idx on public.log_entries(user_id);
create index log_entries_date_idx on public.log_entries(date);
create index log_entries_user_date_idx on public.log_entries(user_id, date);

-- Updated at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger log_entries_updated_at
  before update on public.log_entries
  for each row execute function public.handle_updated_at();

create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.handle_updated_at();
