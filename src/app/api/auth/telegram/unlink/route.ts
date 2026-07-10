import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    await db.query("delete from telegram_identities where user_id = $1", [
      user.id,
    ]);
  } catch (e) {
    return NextResponse.json(
      { error: "unlink_failed", detail: e instanceof Error ? e.message : "" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
