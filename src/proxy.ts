import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  SESSION_RENEW_AFTER_SECONDS,
  signSession,
  verifySession,
} from "@/lib/auth/session";

const PUBLIC_PREFIXES = ["/login", "/signup", "/api/auth"];

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    const isPublic = PUBLIC_PREFIXES.some((p) =>
      request.nextUrl.pathname.startsWith(p)
    );
    if (isPublic) return NextResponse.next();

    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Sliding renewal: re-issue the 30-day token once a day so active users
  // never get logged out (replaces Supabase's refresh-token machinery).
  const response = NextResponse.next();
  const age = Math.floor(Date.now() / 1000) - session.issuedAt;
  if (age > SESSION_RENEW_AFTER_SECONDS) {
    const fresh = await signSession({ id: session.id, email: session.email });
    response.cookies.set(SESSION_COOKIE, fresh, SESSION_COOKIE_OPTIONS);
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (manifest, icons, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-.*\\.png|sw\\.js|sw\\.js\\.map|swe-worker-.*\\.js|.*\\.svg$).*)",
  ],
};
