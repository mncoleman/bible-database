import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const UPDATABLE = ["date", "start_verse_id", "end_verse_id"] as const;

export async function PATCH(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of UPDATABLE) {
    if (body[key] !== undefined) {
      values.push(body[key]);
      sets.push(`${key} = $${values.length}`);
    }
  }
  if (sets.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  values.push(id, user.id);

  try {
    const { rows } = await db.query(
      `update log_entries set ${sets.join(", ")}
       where id = $${values.length - 1} and user_id = $${values.length}
       returning *`,
      values
    );
    if (!rows[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "update_failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { id } = await params;

  const { rowCount } = await db.query(
    "delete from log_entries where id = $1 and user_id = $2",
    [id, user.id]
  );
  if (rowCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
