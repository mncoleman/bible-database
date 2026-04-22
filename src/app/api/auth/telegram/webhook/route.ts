import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type TelegramUpdate = {
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; username?: string };
    chat?: { id: number };
    text?: string;
  };
};

async function sendMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch {
    // best-effort notification, never block the webhook
  }
}

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });
  }

  const providedSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  const text = message?.text?.trim();
  const fromId = message?.from?.id;
  const chatId = message?.chat?.id;

  if (!text || !fromId || !chatId) {
    return NextResponse.json({ ok: true });
  }

  // We only care about /start <nonce>
  if (!text.startsWith("/start")) {
    return NextResponse.json({ ok: true });
  }

  const nonce = text.slice("/start".length).trim();
  if (!nonce) {
    await sendMessage(
      chatId,
      "Open Bible Tracker and tap 'Sign in with Telegram' to get a sign-in link."
    );
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();

  const { data: identity } = await admin
    .from("telegram_identities")
    .select("user_id")
    .eq("telegram_id", fromId)
    .maybeSingle();

  if (!identity) {
    await sendMessage(
      chatId,
      "This Telegram account isn't linked to Bible Tracker yet. Sign in with email first, then link Telegram in Settings → Account."
    );
    return NextResponse.json({ ok: true });
  }

  const { data: nonceRow } = await admin
    .from("telegram_login_nonces")
    .select("*")
    .eq("nonce", nonce)
    .maybeSingle();

  if (!nonceRow) {
    await sendMessage(chatId, "That sign-in link is invalid. Please try again from Bible Tracker.");
    return NextResponse.json({ ok: true });
  }

  if (new Date(nonceRow.expires_at).getTime() < Date.now()) {
    await sendMessage(chatId, "That sign-in link has expired. Please try again from Bible Tracker.");
    return NextResponse.json({ ok: true });
  }

  if (nonceRow.status !== "pending") {
    await sendMessage(chatId, "That sign-in link has already been used.");
    return NextResponse.json({ ok: true });
  }

  const { error: updateError } = await admin
    .from("telegram_login_nonces")
    .update({ status: "confirmed", user_id: identity.user_id })
    .eq("nonce", nonce)
    .eq("status", "pending");

  if (updateError) {
    await sendMessage(chatId, "Something went wrong signing you in. Please try again.");
    return NextResponse.json({ ok: true });
  }

  await sendMessage(chatId, "✅ You're signed in. Return to Bible Tracker.");
  return NextResponse.json({ ok: true });
}
