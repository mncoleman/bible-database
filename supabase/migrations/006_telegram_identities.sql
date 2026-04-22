-- Telegram identity linking
-- One telegram account may link to at most one user (and vice versa).
-- Inserts only happen via the service role after HMAC verification of the
-- Telegram Login Widget payload — that is the real security boundary.

create table public.telegram_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  telegram_id text not null unique,
  telegram_username text,
  first_name text,
  last_name text,
  photo_url text,
  created_at timestamptz not null default now()
);

alter table public.telegram_identities enable row level security;

create policy "Users can view own telegram identity"
  on public.telegram_identities for select
  using (auth.uid() = user_id);

create policy "Users can delete own telegram identity"
  on public.telegram_identities for delete
  using (auth.uid() = user_id);

create index telegram_identities_user_id_idx on public.telegram_identities(user_id);
create index telegram_identities_telegram_id_idx on public.telegram_identities(telegram_id);
