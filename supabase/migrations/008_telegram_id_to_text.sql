-- Telegram OIDC subs can exceed 2^63 (Postgres bigint max) and routinely
-- exceed 2^53 (JavaScript safe integer). Storing as text is the only
-- correct representation — treat the id as an opaque identifier.

alter table public.telegram_identities
  alter column telegram_id type text
  using telegram_id::text;

-- The short-lived telegram_login_nonces table was part of an abandoned
-- bot-deep-link design (superseded by Telegram OIDC via oauth.telegram.org).
-- Drop it if it was provisioned before the design change.
drop table if exists public.telegram_login_nonces;
