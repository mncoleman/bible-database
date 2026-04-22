import { NextResponse } from "next/server";
import {
  exchangeTelegramCode,
  verifyOauthState,
  verifyTelegramIdToken,
  OAUTH_STATE_COOKIE,
} from "@/lib/telegram-oidc";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function fail(origin: string, error: string) {
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return fail(origin, "missing_params");

  // Cookies API (request.cookies) doesn't persist mutations onto the response
  // in route handlers, but reading is fine.
  const stateCookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${OAUTH_STATE_COOKIE}=`))
    ?.slice(OAUTH_STATE_COOKIE.length + 1);

  if (!stateCookie) return fail(origin, "expired_state");

  const oauthData = await verifyOauthState(stateCookie);
  if (!oauthData || oauthData.state !== state) {
    return fail(origin, "invalid_state");
  }

  const redirectUri =
    process.env.TELEGRAM_OIDC_REDIRECT_URI ?? `${origin}/api/auth/telegram/callback`;

  const tokens = await exchangeTelegramCode({
    code,
    codeVerifier: oauthData.codeVerifier,
    redirectUri,
  });
  if (!tokens) return fail(origin, "token_exchange_failed");

  const payload = await verifyTelegramIdToken(tokens.id_token);
  if (!payload) return fail(origin, "invalid_id_token");

  const telegramId = Number(payload.sub);
  if (!Number.isFinite(telegramId)) return fail(origin, "invalid_id_token");

  const admin = createAdminClient();

  // ---- LINK MODE ----
  // User is already signed in; attach this Telegram identity to their account.
  if (oauthData.link) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail(origin, "unauthenticated");

    const { data: existing } = await admin
      .from("telegram_identities")
      .select("user_id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (existing && existing.user_id !== user.id) {
      return NextResponse.redirect(
        `${origin}/settings?error=telegram_already_linked_to_other_account`
      );
    }

    const { error: upsertError } = await admin
      .from("telegram_identities")
      .upsert(
        {
          user_id: user.id,
          telegram_id: telegramId,
          telegram_username: payload.username ?? null,
          first_name: payload.first_name ?? "",
          last_name: payload.last_name ?? null,
          photo_url: payload.photo_url ?? null,
        },
        { onConflict: "user_id" }
      );

    if (upsertError) return fail(origin, "link_failed");

    return NextResponse.redirect(`${origin}${oauthData.next ?? "/settings"}`);
  }

  // ---- SIGN-IN MODE ----
  // Look up the linked user and mint a Supabase session on our origin.
  const { data: identity } = await admin
    .from("telegram_identities")
    .select("user_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (!identity) {
    return NextResponse.redirect(`${origin}/login?error=telegram_not_linked`);
  }

  const { data: userResult, error: userError } =
    await admin.auth.admin.getUserById(identity.user_id);
  if (userError || !userResult?.user?.email) {
    return fail(origin, "user_not_found");
  }

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: userResult.user.email,
    });
  if (linkError || !linkData?.properties?.hashed_token) {
    return fail(origin, "session_mint_failed");
  }

  // Server-side verifyOtp writes session cookies onto this response via the
  // cookies() adapter in createClient. Staying on-origin is what makes the
  // PWA case work — no hop through Supabase's /verify endpoint.
  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (verifyError) return fail(origin, "session_mint_failed");

  const response = NextResponse.redirect(`${origin}${oauthData.next ?? "/today"}`);
  // Clear the state cookie — it's already been consumed.
  response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
