"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      try {
        const me = await api<{ isAdmin: boolean }>("/api/me");
        return me.isAdmin;
      } catch {
        return false;
      }
    },
    staleTime: 5 * 60_000,
  });
}
