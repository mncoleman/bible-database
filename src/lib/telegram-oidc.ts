import { jwtVerify, SignJWT, createRemoteJWKSet } from "jose";

// Telegram's OIDC provider. Configured via BotFather → Bot Settings → Web Login.
// Client ID is the numeric bot id (first segment of TELEGRAM_BOT_TOKEN).
// Client secret comes from BotFather.
const AUTH_ENDPOINT = "https://oauth.telegram.org/auth";
const TOKEN_ENDPOINT = "https://oauth.telegram.org/token";
const TELEGRAM_JWKS = createRemoteJWKSet(
  new URL("https://oauth.telegram.org/.well-known/jwks.json")
);

export const OAUTH_STATE_COOKIE = "bt_telegram_oauth_state";
const STATE_TTL_SECONDS = 5 * 60;

function stateSecret(): Uint8Array {
  const s = process.env.AUTH_STATE_SECRET;
  if (!s) throw new Error("AUTH_STATE_SECRET missing from env");
  return new TextEncoder().encode(s);
}

function botId(): string {
  const tok = process.env.TELEGRAM_BOT_TOKEN;
  if (!tok) throw new Error("TELEGRAM_BOT_TOKEN missing from env");
  const [id] = tok.split(":");
  if (!id) throw new Error("TELEGRAM_BOT_TOKEN is malformed");
  return id;
}

export async function generatePkce(): Promise<{ verifier: string; challenge: string }> {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = base64url(verifierBytes);
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = base64url(new Uint8Array(hash));
  return { verifier, challenge };
}

function base64url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type OauthStateData = {
  codeVerifier: string;
  state: string;
  link?: boolean;
  /**
   * Baked into the state JWT at /start time when link=1. The callback trusts
   * this instead of re-reading Supabase cookies — those don't always survive
   * the cross-site OAuth return, so relying on them was causing link flows
   * to fail out to the login page.
   */
  linkUserId?: string;
  next?: string;
};

export async function signOauthState(data: OauthStateData): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    codeVerifier: data.codeVerifier,
    state: data.state,
  };
  if (data.link) payload.link = true;
  if (data.linkUserId) payload.linkUserId = data.linkUserId;
  if (data.next) payload.next = data.next;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + STATE_TTL_SECONDS)
    .sign(stateSecret());
}

export async function verifyOauthState(token: string): Promise<OauthStateData | null> {
  try {
    const { payload } = await jwtVerify(token, stateSecret(), { algorithms: ["HS256"] });
    return {
      codeVerifier: String(payload.codeVerifier ?? ""),
      state: String(payload.state ?? ""),
      link: payload.link === true ? true : undefined,
      linkUserId: typeof payload.linkUserId === "string" ? payload.linkUserId : undefined,
      next: typeof payload.next === "string" ? payload.next : undefined,
    };
  } catch {
    return null;
  }
}

export function buildTelegramAuthUrl(params: {
  state: string;
  codeChallenge: string;
  redirectUri: string;
}): string {
  const search = new URLSearchParams({
    response_type: "code",
    client_id: botId(),
    redirect_uri: params.redirectUri,
    scope: "openid profile",
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_ENDPOINT}?${search.toString()}`;
}

export async function exchangeTelegramCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<{ id_token: string } | null> {
  const clientSecret = process.env.TELEGRAM_OIDC_CLIENT_SECRET;
  if (!clientSecret) throw new Error("TELEGRAM_OIDC_CLIENT_SECRET missing from env");

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: botId(),
      client_secret: clientSecret,
      code_verifier: params.codeVerifier,
    }),
  });

  if (!res.ok) return null;
  return (await res.json()) as { id_token: string };
}

export type TelegramIdTokenPayload = {
  sub: string;
  aud: string;
  iss: string;
  exp: number;
  iat: number;
  // Telegram surfaces the handle in the OIDC-standard preferred_username
  // claim; the custom `username` claim is often empty.
  username?: string;
  preferred_username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
};

export async function verifyTelegramIdToken(idToken: string): Promise<TelegramIdTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(idToken, TELEGRAM_JWKS, {
      issuer: "https://oauth.telegram.org",
      audience: botId(),
    });
    return payload as unknown as TelegramIdTokenPayload;
  } catch {
    return null;
  }
}
