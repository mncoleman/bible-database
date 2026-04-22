-- Short-lived nonces for the deep-link Telegram sign-in flow.
-- Lifecycle:
--   1. Client POSTs /api/auth/telegram/nonce → row inserted with status='pending'
--   2. User taps "Start" in Telegram → webhook resolves user_id by telegram_id,
--      sets status='confirmed' and user_id.
--   3. Client polls /api/auth/telegram/nonce/[nonce]/status → on confirmed,
--      server mints a magic-link token_hash and flips status='consumed'.
--
-- All writes are via service role. RLS on, no policies — nothing is accessible
-- via the anon key.

create table public.telegram_login_nonces (
  nonce text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'consumed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes')
);

create index telegram_login_nonces_expires_at_idx
  on public.telegram_login_nonces(expires_at);

alter table public.telegram_login_nonces enable row level security;
