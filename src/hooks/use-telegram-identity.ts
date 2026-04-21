"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { TelegramIdentity } from "@/lib/supabase/types";
import type { TelegramAuthData } from "@/lib/telegram";

const QUERY_KEY = "telegram-identity";

export function useTelegramIdentity() {
  const supabase = createClient();

  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("telegram_identities")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as TelegramIdentity | null;
    },
  });
}

export function useLinkTelegram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (authData: TelegramAuthData) => {
      const res = await fetch("/api/auth/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "link_failed");
      return json;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUnlinkTelegram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/telegram/unlink", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "unlink_failed");
      return json;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
