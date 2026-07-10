import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { rows } = await db.query(
    "select * from telegram_identities where user_id = $1",
    [user.id]
  );
  return NextResponse.json(rows[0] ?? null);
}
