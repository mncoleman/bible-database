import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { error } = await supabase
    .from("telegram_identities")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "unlink_failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
