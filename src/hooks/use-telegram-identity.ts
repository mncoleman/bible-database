"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TelegramIdentity } from "@/lib/types";

const QUERY_KEY = "telegram-identity";

export function useTelegramIdentity() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => api<TelegramIdentity | null>("/api/telegram-identity"),
  });
}

export function useUnlinkTelegram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api<{ ok: true }>("/api/auth/telegram/unlink", { method: "POST" }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
