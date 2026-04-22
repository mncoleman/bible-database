import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  buildTelegramAuthUrl,
  generatePkce,
  signOauthState,
  OAUTH_STATE_COOKIE,
} from "@/lib/telegram-oidc";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const link = url.searchParams.get("link") === "1";
  const rawNext = url.searchParams.get("next");
  const next = rawNext && /^\/[^/]/.test(rawNext) ? rawNext : undefined;

  const redirectUri =
    process.env.TELEGRAM_OIDC_REDIRECT_URI ??
    `${url.origin}/api/auth/telegram/callback`;

  const { verifier, challenge } = await generatePkce();
  const state = crypto.randomUUID();

  const signedState = await signOauthState({
    codeVerifier: verifier,
    state,
    link,
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
