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
    "select * from log_entries where user_id = $1 order by date desc, created_at desc",
    [user.id]
  );
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { date?: string; start_verse_id?: number; end_verse_id?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (
    !body.date ||
    typeof body.start_verse_id !== "number" ||
    typeof body.end_verse_id !== "number"
  ) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const { rows } = await db.query(
      `insert into log_entries (user_id, date, start_verse_id, end_verse_id)
       values ($1, $2, $3, $4) returning *`,
      [user.id, body.date, body.start_verse_id, body.end_verse_id]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "insert_failed" },
      { status: 400 }
    );
  }
}
