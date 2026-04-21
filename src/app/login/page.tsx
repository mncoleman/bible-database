"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TelegramLoginButton } from "@/components/telegram-login-button";
import type { TelegramAuthData } from "@/lib/telegram";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState("");

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

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

  const handleTelegramAuth = useCallback(async (data: TelegramAuthData) => {
    setError("");
    setTelegramStatus("Signing in with Telegram...");
    try {
      const res = await fetch("/api/auth/telegram/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.error === "not_linked") {
          setError(
            "This Telegram account isn't linked to any user. Sign in with email first, then link Telegram from Settings."
          );
        } else {
          setError("Telegram sign-in failed. Please try again.");
        }
        setTelegramStatus("");
        return;
      }
      clearPageCaches();
      window.location.href = json.redirect;
    } catch {
      setError("Telegram sign-in failed. Please try again.");
      setTelegramStatus("");
    }
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
              <div className="flex flex-col items-center gap-2">
                <TelegramLoginButton
                  botUsername={botUsername}
                  onAuth={handleTelegramAuth}
                  cornerRadius={8}
                />
                {telegramStatus && (
                  <p className="text-xs text-muted-foreground">{telegramStatus}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
