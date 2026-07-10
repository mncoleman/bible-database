// Tiny client-side fetch wrapper for the app's own /api routes.
// Throws Error(message) on non-2xx so React Query surfaces failures the same
// way the old supabase-js client did.
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) {
    throw new Error("Not authenticated");
  }
  const json = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      (json as { error?: string } | null)?.error ?? `Request failed (${res.status})`
    );
  }
  return json as T;
}
