#!/usr/bin/env bash
# One-time data migration: supabase-db (GoTrue + public schema) -> bible-db.
# Run on the server with both containers up. Idempotent-ish: truncates the
# destination tables first, so it can be re-run until cutover.
set -euo pipefail

SRC="docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1"
DST="docker exec -i bible-db psql -U bible -d bible -v ON_ERROR_STOP=1"

echo "== wiping destination tables =="
$DST -c "truncate invites, telegram_identities, user_settings, log_entries, users cascade;"

echo "== users (from auth.users, bcrypt hashes carry over) =="
$SRC -c "copy (
  select id, email, encrypted_password, created_at, last_sign_in_at
  from auth.users
  where deleted_at is null
) to stdout" | $DST -c "copy users (id, email, password_hash, created_at, last_sign_in_at) from stdin"

echo "== log_entries =="
$SRC -c "copy (
  select id, user_id, date, start_verse_id, end_verse_id, created_at, updated_at
  from public.log_entries
) to stdout" | $DST -c "copy log_entries (id, user_id, date, start_verse_id, end_verse_id, created_at, updated_at) from stdin"

echo "== user_settings =="
$SRC -c "copy (
  select id, user_id, daily_verse_count_goal, look_back_date,
         preferred_bible_version, preferred_bible_app, start_page, theme,
         goal_end_date,
         primary_light, accent_light, chart_light,
         primary_dark, accent_dark, chart_dark,
         beam_color_light, beam_color_dark, beam_width, beam_height,
         beam_count, beam_speed, beam_noise_intensity, beam_noise_scale,
         beam_rotation,
         created_at, updated_at
  from public.user_settings
) to stdout" | $DST -c "copy user_settings (id, user_id, daily_verse_count_goal, look_back_date,
  preferred_bible_version, preferred_bible_app, start_page, theme, goal_end_date,
  primary_light, accent_light, chart_light, primary_dark, accent_dark, chart_dark,
  beam_color_light, beam_color_dark, beam_width, beam_height, beam_count,
  beam_speed, beam_noise_intensity, beam_noise_scale, beam_rotation,
  created_at, updated_at) from stdin"

echo "== telegram_identities =="
$SRC -c "copy (
  select id, user_id, telegram_id, telegram_username, first_name, last_name,
         photo_url, created_at
  from public.telegram_identities
) to stdout" | $DST -c "copy telegram_identities (id, user_id, telegram_id, telegram_username, first_name, last_name, photo_url, created_at) from stdin"

echo "== invites =="
$SRC -c "copy (
  select id, token, email, created_by, created_at, expires_at, used_at,
         used_by, used_email, note
  from public.invites
) to stdout" | $DST -c "copy invites (id, token, email, created_by, created_at, expires_at, used_at, used_by, used_email, note) from stdin"

echo "== row counts =="
for t in users log_entries user_settings telegram_identities invites; do
  printf "%-22s %s\n" "$t" "$($DST -tAc "select count(*) from $t")"
done

echo "== done =="
