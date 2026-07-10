import { NextResponse } from "next/server";
import {
  exchangeTelegramCode,
  verifyOauthState,
  verifyTelegramIdToken,
  OAUTH_STATE_COOKIE,
} from "@/lib/telegram-oidc";
import { db } from "@/lib/db";
import { findUserById, touchLastSignIn } from "@/lib/auth/users";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  signSession,
} from "@/lib/auth/session";
import { publicOrigin } from "@/lib/public-origin";

export const dynamic = "force-dynamic";

function fail(origin: string, error: string) {
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = publicOrigin(request);

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

  // Treat sub as an opaque string — Telegram subs can exceed JS safe integer
  // and even Postgres bigint ranges, so don't coerce to number.
  const telegramId = typeof payload.sub === "string" ? payload.sub : String(payload.sub ?? "");
  if (!telegramId) return fail(origin, "invalid_id_token");

  // ---- LINK MODE ----
  // User id was resolved and baked into the signed state at /start time. We
  // don't re-read session cookies here because they aren't reliably present
  // on the cross-site return from oauth.telegram.org.
  if (oauthData.link) {
    const userId = oauthData.linkUserId;
    if (!userId) return fail(origin, "unauthenticated");

    const { rows: existing } = await db.query<{ user_id: string }>(
      "select user_id from telegram_identities where telegram_id = $1",
      [telegramId]
    );
    if (existing[0] && existing[0].user_id !== userId) {
      return NextResponse.redirect(
        `${origin}/settings?error=telegram_already_linked_to_other_account`
      );
    }

    const telegramUsername = payload.username ?? payload.preferred_username ?? null;

    try {
      await db.query(
        `insert into telegram_identities
           (user_id, telegram_id, telegram_username, first_name, last_name, photo_url)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (user_id) do update set
           telegram_id = excluded.telegram_id,
           telegram_username = excluded.telegram_username,
           first_name = excluded.first_name,
           last_name = excluded.last_name,
           photo_url = excluded.photo_url`,
        [
          userId,
          telegramId,
          telegramUsername,
          payload.first_name ?? "",
          payload.last_name ?? null,
          payload.photo_url ?? null,
        ]
      );
    } catch (e) {
      console.error("[telegram-link] upsert failed", {
        userId,
        telegramId,
        message: e instanceof Error ? e.message : String(e),
      });
      return fail(origin, "link_failed");
    }

    return NextResponse.redirect(`${origin}${oauthData.next ?? "/settings"}`);
  }

  // ---- SIGN-IN MODE ----
  // Look up the linked user and mint a session directly — no magic-link
  // round-trip needed now that sessions are our own JWT cookie.
  const { rows: identity } = await db.query<{ user_id: string }>(
    "select user_id from telegram_identities where telegram_id = $1",
    [telegramId]
  );
  if (!identity[0]) {
    return NextResponse.redirect(`${origin}/login?error=telegram_not_linked`);
  }

  const user = await findUserById(identity[0].user_id);
  if (!user) return fail(origin, "user_not_found");

  await touchLastSignIn(user.id);
  const sessionToken = await signSession({ id: user.id, email: user.email });

  const response = NextResponse.redirect(`${origin}${oauthData.next ?? "/today"}`);
  response.cookies.set(SESSION_COOKIE, sessionToken, SESSION_COOKIE_OPTIONS);
  // Clear the state cookie — it's already been consumed.
  response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
