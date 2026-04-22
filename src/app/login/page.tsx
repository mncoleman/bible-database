"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TelegramFlowState = "idle" | "waiting" | "verifying";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tgState, setTgState] = useState<TelegramFlowState>("idle");

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";
  const cancelledRef = useRef(false);

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

  const startTelegramLogin = useCallback(async () => {
    setError("");
    cancelledRef.current = false;

    let nonce: string;
    let deeplink: string;
    try {
      const res = await fetch("/api/auth/telegram/nonce", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json?.nonce) {
        setError("Could not start Telegram sign-in. Please try again.");
        return;
      }
      nonce = json.nonce;
      deeplink = json.deeplink;
    } catch {
      setError("Could not start Telegram sign-in. Please try again.");
      return;
    }

    setTgState("waiting");

    // Opening in a new tab/window keeps the current page alive so the poll
    // loop can run; on iOS this hands off to the Telegram app while our page
    // stays in the PWA.
    window.open(deeplink, "_blank", "noopener,noreferrer");

    const deadline = Date.now() + 5 * 60 * 1000;
    const poll = async (): Promise<void> => {
      while (!cancelledRef.current && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelledRef.current) return;

        let statusJson: { status: string; token_hash?: string } | null = null;
        try {
          const res = await fetch(
            `/api/auth/telegram/nonce/${encodeURIComponent(nonce)}/status`,
            { cache: "no-store" }
          );
          statusJson = await res.json();
        } catch {
          continue;
        }
        if (!statusJson) continue;

        if (statusJson.status === "confirmed" && statusJson.token_hash) {
          setTgState("verifying");
          const supabase = createClient();
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: statusJson.token_hash,
            type: "magiclink",
          });
          if (verifyError) {
            setError("Sign-in failed after Telegram confirmation. Please try again.");
            setTgState("idle");
            return;
          }
          clearPageCaches();
          window.location.href = "/today";
          return;
        }

        if (statusJson.status === "expired" || statusJson.status === "consumed") {
          setError("Sign-in link expired. Please try again.");
          setTgState("idle");
          return;
        }
      }

      if (!cancelledRef.current) {
        setError("Sign-in timed out. Please try again.");
        setTgState("idle");
      }
    };

    void poll();
  }, []);

  const cancelTelegramLogin = () => {
    cancelledRef.current = true;
    setTgState("idle");
  };

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

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

          {botUsername && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 border-t" />
              </div>

              {tgState === "idle" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={startTelegramLogin}
                >
                  Sign in with Telegram
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-center text-muted-foreground">
                    {tgState === "waiting"
                      ? "Open Telegram and tap Start to confirm sign-in…"
                      : "Signing you in…"}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={cancelTelegramLogin}
                    disabled={tgState === "verifying"}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
