"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/client";
import type { UserSettings } from "@/lib/supabase/types";

const QUERY_KEY = "user-settings";

export function useUserSettings() {
  const supabase = createClient();

  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as UserSettings | null;
    },
  });
}

export function useUpdateUserSettings() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      updates: Partial<
        Omit<UserSettings, "id" | "user_id" | "created_at" | "updated_at">
      >
    ) => {
      const user = await getAuthenticatedUser();

      // Try update first, then upsert if no row exists
      const { data: existing } = await supabase
        .from("user_settings")
        .select("id")
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from("user_settings")
          .update(updates)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw error;
        return data as UserSettings;
      } else {
        const { data, error } = await supabase
          .from("user_settings")
          .insert({ ...updates, user_id: user.id })
          .select()
          .single();
        if (error) throw error;
        return data as UserSettings;
      }
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY] });
      const previous = queryClient.getQueryData<UserSettings | null>([QUERY_KEY]);

      if (previous) {
        queryClient.setQueryData<UserSettings | null>([QUERY_KEY], {
          ...previous,
          ...updates,
        });
      }

      return { previous };
    },
    onError: (_err, _updates, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData([QUERY_KEY], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
