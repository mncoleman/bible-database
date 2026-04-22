import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ nonce: string }> }
) {
  const { nonce } = await context.params;
  if (!nonce) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("telegram_login_nonces")
    .select("*")
    .eq("nonce", nonce)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  const isExpired = new Date(row.expires_at).getTime() < Date.now();
  if (isExpired) {
    return NextResponse.json({ status: "expired" });
  }

  if (row.status === "pending") {
    return NextResponse.json({ status: "pending" });
  }
  if (row.status === "consumed") {
    return NextResponse.json({ status: "consumed" });
  }

  // status === 'confirmed' — mint a one-time magic-link token for the client
  if (!row.user_id) {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }

  const { data: userResult, error: userError } =
    await admin.auth.admin.getUserById(row.user_id);
  if (userError || !userResult?.user?.email) {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: userResult.user.email,
    });
  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }

  // Flip to consumed so a stolen nonce can't be replayed.
  await admin
    .from("telegram_login_nonces")
    .update({ status: "consumed" })
    .eq("nonce", nonce);

  return NextResponse.json({
    status: "confirmed",
    token_hash: linkData.properties.hashed_token,
  });
}
