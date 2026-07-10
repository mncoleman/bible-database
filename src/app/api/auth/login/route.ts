import { NextResponse } from "next/server";
import { findUserByEmail, touchLastSignIn } from "@/lib/auth/users";
import { verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  signSession,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const user = await findUserByEmail(email);
  // Verify against a dummy hash when the user doesn't exist so response
  // timing doesn't reveal which emails have accounts.
  const hash =
    user?.password_hash ??
    "$2a$10$CwTycUXWue0Thq9StjUM0uJ8oQCkO/9dY0mVLPlbXK2tqUvyfGmLu";
  const valid = await verifyPassword(password, hash);

  if (!user || !valid) {
    return NextResponse.json(
      { error: "Invalid login credentials" },
      { status: 401 }
    );
  }

  await touchLastSignIn(user.id);
  const token = await signSession({ id: user.id, email: user.email });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return response;
}
