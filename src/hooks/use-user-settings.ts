"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UserSettings } from "@/lib/types";

const QUERY_KEY = "user-settings";

export function useUserSettings() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => api<UserSettings | null>("/api/settings"),
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      updates: Partial<
        Omit<UserSettings, "id" | "user_id" | "created_at" | "updated_at">
      >
    ) =>
      api<UserSettings>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(updates),
      }),
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
