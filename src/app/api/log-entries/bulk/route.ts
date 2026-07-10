import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type Entry = { date: string; start_verse_id: number; end_verse_id: number };

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { entries?: Entry[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const entries = body.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "No entries" }, { status: 400 });
  }
  if (entries.length > 10_000) {
    return NextResponse.json({ error: "Too many entries" }, { status: 400 });
  }
  for (const e of entries) {
    if (
      !e ||
      typeof e.date !== "string" ||
      typeof e.start_verse_id !== "number" ||
      typeof e.end_verse_id !== "number"
    ) {
      return NextResponse.json({ error: "Malformed entry" }, { status: 400 });
    }
  }

  const client = await db.connect();
  try {
    await client.query("begin");
    let inserted = 0;
    const batchSize = 500;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const values: unknown[] = [user.id];
      const tuples = batch.map((e) => {
        values.push(e.date, e.start_verse_id, e.end_verse_id);
        const n = values.length;
        return `($1, $${n - 2}, $${n - 1}, $${n})`;
      });
      await client.query(
        `insert into log_entries (user_id, date, start_verse_id, end_verse_id)
         values ${tuples.join(", ")}`,
        values
      );
      inserted += batch.length;
    }
    await client.query("commit");
    return NextResponse.json({ inserted }, { status: 201 });
  } catch (e) {
    await client.query("rollback");
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "bulk_insert_failed" },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
