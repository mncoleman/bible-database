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

  console.log("[telegram-oidc] id_token claims", {
    sub: payload.sub,
    username: payload.username,
    preferred_username: payload.preferred_username,
    first_name: payload.first_name,
    last_name: payload.last_name,
    hasPhoto: !!payload.photo_url,
  });

  // Treat sub as an opaque string — Telegram subs can exceed JS safe integer
  // and even Postgres bigint ranges, so don't coerce to number.
  const telegramId = typeof payload.sub === "string" ? payload.sub : String(payload.sub ?? "");
  if (!telegramId) return fail(origin, "invalid_id_token");

  const admin = createAdminClient();

  // ---- LINK MODE ----
  // User id was resolved and baked into the signed state at /start time. We
  // don't re-read Supabase cookies here because they aren't reliably present
  // on the cross-site return from oauth.telegram.org.
  if (oauthData.link) {
    const userId = oauthData.linkUserId;
    if (!userId) return fail(origin, "unauthenticated");

    const { data: existing } = await admin
      .from("telegram_identities")
      .select("user_id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (existing && existing.user_id !== userId) {
      return NextResponse.redirect(
        `${origin}/settings?error=telegram_already_linked_to_other_account`
      );
    }

    const telegramUsername = payload.username ?? payload.preferred_username ?? null;

    const { error: upsertError } = await admin
      .from("telegram_identities")
      .upsert(
        {
          user_id: userId,
          telegram_id: telegramId,
          telegram_username: telegramUsername,
          first_name: payload.first_name ?? "",
          last_name: payload.last_name ?? null,
          photo_url: payload.photo_url ?? null,
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("[telegram-link] upsert failed", {
        userId,
        telegramId,
        code: upsertError.code,
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
      });
      return fail(origin, "link_failed");
    }

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
