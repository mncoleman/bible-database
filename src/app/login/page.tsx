"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ERRORS: Record<string, string> = {
  missing_params: "Sign-in was interrupted. Please try again.",
  expired_state: "Sign-in session expired. Please try again.",
  invalid_state: "Invalid sign-in state. Please try again.",
  token_exchange_failed: "Telegram sign-in failed. Please try again.",
  invalid_id_token: "Telegram returned an invalid token. Please try again.",
  telegram_not_linked:
    "This Telegram account isn't linked to any user. Sign in with email first, then link Telegram in Settings.",
  session_mint_failed: "Could not start your session. Please try again.",
  user_not_found: "Linked user not found. Please contact support.",
  unauthenticated: "Please sign in first, then link Telegram from Settings.",
  link_failed: "Linking your Telegram account failed. Please try again.",
};

function LoginInner() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const initialError = urlError ? ERRORS[urlError] ?? null : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);

  const clearPageCaches = () => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_PAGE_CACHES" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      clearPageCaches();
      window.location.href = "/today";
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Bible Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 border-t" />
            </div>

            <Button variant="outline" className="w-full" asChild>
              <a href="/api/auth/telegram/start" rel="nofollow">
                Continue with Telegram
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
