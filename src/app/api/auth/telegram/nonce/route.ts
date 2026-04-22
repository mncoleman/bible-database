import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  if (!botUsername) {
    return NextResponse.json({ error: "telegram_not_configured" }, { status: 500 });
  }

  const nonce = crypto.randomBytes(24).toString("base64url");
  const admin = createAdminClient();

  const { error } = await admin.from("telegram_login_nonces").insert({ nonce });
  if (error) {
    return NextResponse.json({ error: "nonce_create_failed" }, { status: 500 });
  }

  return NextResponse.json({
    nonce,
    deeplink: `https://t.me/${botUsername}?start=${nonce}`,
  });
}
