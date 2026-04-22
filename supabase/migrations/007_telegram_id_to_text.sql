-- Telegram OIDC subs can exceed 2^63 (Postgres bigint max) and routinely
-- exceed 2^53 (JavaScript safe integer). Storing as text is the only
-- correct representation — treat the id as an opaque identifier.

alter table public.telegram_identities
  alter column telegram_id type text
  using telegram_id::text;
