"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "mncoleman003@gmail.com";

export function useIsAdmin() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.email === ADMIN_EMAIL;
    },
    staleTime: 5 * 60_000,
  });
}
