import { createBrowserClient } from "@supabase/ssr";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing required Supabase environment variables");
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Returns a valid authenticated user, proactively refreshing the session if the
 * access token is expired or about to expire. In PWA mode the Next.js middleware
 * (which refreshes sessions on navigation) rarely runs, so the JWT can go stale
 * while the user stays on a single page. This prevents "Not Authorized" errors
 * from Supabase RLS policies that check auth.uid().
 */
export async function getAuthenticatedUser() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    const expiresAt = session.expires_at ?? 0;
    const isExpiringSoon = expiresAt - Math.floor(Date.now() / 1000) < 30;

    if (!isExpiringSoon) return session.user;

    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    if (!refreshed?.user) throw new Error("Not authenticated");
    return refreshed.user;
  }

  // No session — try refreshing (handles stale/missing cookies)
  const { data: { session: refreshed } } = await supabase.auth.refreshSession();
  if (!refreshed?.user) throw new Error("Not authenticated");
  return refreshed.user;
}
