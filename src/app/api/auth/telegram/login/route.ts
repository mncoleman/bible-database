import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseTelegramAuthData, verifyTelegramAuth } from "@/lib/telegram";

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "telegram_not_configured" }, { status: 500 });
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

  const { data: identity, error: lookupError } = await admin
    .from("telegram_identities")
    .select("user_id")
    .eq("telegram_id", data.id)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  if (!identity) {
    return NextResponse.json({ error: "not_linked" }, { status: 404 });
  }

  const { data: userResult, error: userError } = await admin.auth.admin.getUserById(identity.user_id);
  if (userError || !userResult?.user?.email) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: userResult.user.email,
    options: {
      redirectTo: `${origin}/auth/callback?next=/today`,
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: "link_failed" }, { status: 500 });
  }

  return NextResponse.json({ redirect: linkData.properties.action_link });
}
