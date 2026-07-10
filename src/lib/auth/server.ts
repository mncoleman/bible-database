import "server-only";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  verifySession,
  type SessionUser,
} from "@/lib/auth/session";

/** Current user from the session cookie, or null. Server-side only. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;
  return { id: session.id, email: session.email };
}

/** Like getSessionUser but throws a 401-worthy error when unauthenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("unauthenticated");
  return user;
}
