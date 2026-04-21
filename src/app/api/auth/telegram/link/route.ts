import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseTelegramAuthData, verifyTelegramAuth } from "@/lib/telegram";

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "telegram_not_configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const data = parseTelegramAuthData(body);
  if (!data) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (!verifyTelegramAuth(data, botToken)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("telegram_identities")
    .select("user_id")
    .eq("telegram_id", data.id)
    .maybeSingle();

  if (existing && existing.user_id !== user.id) {
    return NextResponse.json({ error: "already_linked_to_other_account" }, { status: 409 });
  }

  const { error: upsertError } = await admin
    .from("telegram_identities")
    .upsert(
      {
        user_id: user.id,
        telegram_id: data.id,
        telegram_username: data.username ?? null,
        first_name: data.first_name,
        last_name: data.last_name ?? null,
        photo_url: data.photo_url ?? null,
      },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    return NextResponse.json({ error: "link_failed", detail: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    telegram_username: data.username ?? null,
    first_name: data.first_name,
  });
}
