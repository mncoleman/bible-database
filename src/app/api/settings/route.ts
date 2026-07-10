import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

// Whitelist of columns the client may set — everything except identity/audit.
const UPDATABLE = [
  "daily_verse_count_goal",
  "look_back_date",
  "preferred_bible_version",
  "preferred_bible_app",
  "start_page",
  "theme",
  "goal_end_date",
  "primary_light",
  "accent_light",
  "chart_light",
  "primary_dark",
  "accent_dark",
  "chart_dark",
  "beam_color_light",
  "beam_color_dark",
  "beam_width",
  "beam_height",
  "beam_count",
  "beam_speed",
  "beam_noise_intensity",
  "beam_noise_scale",
  "beam_rotation",
] as const;

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { rows } = await db.query(
    "select * from user_settings where user_id = $1",
    [user.id]
  );
  return NextResponse.json(rows[0] ?? null);
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const cols: string[] = [];
  const values: unknown[] = [user.id];
  for (const key of UPDATABLE) {
    if (body[key] !== undefined) {
      values.push(body[key]);
      cols.push(key);
    }
  }
  if (cols.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const insertCols = ["user_id", ...cols].join(", ");
  const insertPlaceholders = values.map((_, i) => `$${i + 1}`).join(", ");
  const conflictSets = cols
    .map((c, i) => `${c} = $${i + 2}`)
    .join(", ");

  try {
    const { rows } = await db.query(
      `insert into user_settings (${insertCols})
       values (${insertPlaceholders})
       on conflict (user_id) do update set ${conflictSets}
       returning *`,
      values
    );
    return NextResponse.json(rows[0]);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "settings_update_failed" },
      { status: 400 }
    );
  }
}
