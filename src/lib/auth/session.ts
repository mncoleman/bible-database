import { jwtVerify, SignJWT } from "jose";

// Session = signed JWT in an httpOnly cookie. No refresh-token dance: the
// token lives 30 days and the proxy middleware re-issues it when it's older
// than a day, so active users never expire and the PWA never goes stale.
export const SESSION_COOKIE = "bt_session";
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const SESSION_RENEW_AFTER_SECONDS = 24 * 60 * 60; // re-issue if older

export type SessionUser = {
  id: string;
  email: string;
};

function sessionSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET missing from env");
  return new TextEncoder().encode(s);
}

export async function signSession(user: SessionUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_TTL_SECONDS)
    .sign(sessionSecret());
}

export type VerifiedSession = SessionUser & { issuedAt: number };

export async function verifySession(
  token: string
): Promise<VerifiedSession | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), {
      algorithms: ["HS256"],
    });
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      id: payload.sub,
      email: payload.email,
      issuedAt: typeof payload.iat === "number" ? payload.iat : 0,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
