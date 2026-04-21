import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Finishes the PKCE/magic-link flow: exchanges the ?code= for a session and
// sets auth cookies on our domain, then bounces to `next` (default /today).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/today";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
