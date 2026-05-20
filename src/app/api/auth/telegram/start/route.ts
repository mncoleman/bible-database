import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  buildTelegramAuthUrl,
  generatePkce,
  signOauthState,
  OAUTH_STATE_COOKIE,
} from "@/lib/telegram-oidc";
import { createClient } from "@/lib/supabase/server";
import { publicOrigin } from "@/lib/public-origin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = publicOrigin(request);
  const link = url.searchParams.get("link") === "1";
  const rawNext = url.searchParams.get("next");
  const next = rawNext && /^\/[^/]/.test(rawNext) ? rawNext : undefined;

  // For link mode, resolve the current user now — cookies are definitely
  // present on this first hop from /settings. We bake the user id into the
  // signed state JWT so the callback can trust it without re-reading cookies
  // on the cross-site return leg.
  let linkUserId: string | undefined;
  if (link) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(
        `${origin}/login?error=unauthenticated&next=${encodeURIComponent(
          "/settings"
        )}`
      );
    }
    linkUserId = user.id;
  }

  const redirectUri =
    process.env.TELEGRAM_OIDC_REDIRECT_URI ??
    `${origin}/api/auth/telegram/callback`;

  const { verifier, challenge } = await generatePkce();
  const state = crypto.randomUUID();

  const signedState = await signOauthState({
    codeVerifier: verifier,
    state,
    link,
    linkUserId,
    next,
  });

  const authUrl = buildTelegramAuthUrl({
    state,
    codeChallenge: challenge,
    redirectUri,
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, signedState, {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });
  return response;
}
