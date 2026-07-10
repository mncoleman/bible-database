"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LogEntry } from "@/lib/types";

const QUERY_KEY = "log-entries";

export function useLogEntries() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => api<LogEntry[]>("/api/log-entries"),
  });
}

export function useLogEntriesByDate(date: string) {
  const { data: entries, ...rest } = useLogEntries();
  const filtered = useMemo(
    () =>
      entries
        ?.filter((e) => e.date === date)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [entries, date]
  );
  return { data: filtered, ...rest };
}

export function useFilteredLogEntries(lookBackDate: string | null | undefined) {
  const { data: entries = [], ...rest } = useLogEntries();
  const filtered = useMemo(() => {
    if (!lookBackDate) return entries;
    return entries.filter((e) => e.date >= lookBackDate);
  }, [entries, lookBackDate]);
  return { data: filtered, ...rest };
}

export function useCreateLogEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entry: {
      date: string;
      start_verse_id: number;
      end_verse_id: number;
    }) =>
      api<LogEntry>("/api/log-entries", {
        method: "POST",
        body: JSON.stringify(entry),
      }),
    onMutate: async (newEntry) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY] });
      const previousAll = queryClient.getQueryData<LogEntry[]>([QUERY_KEY]);

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const optimistic: LogEntry = {
        id: tempId,
        user_id: "",
        date: newEntry.date,
        start_verse_id: newEntry.start_verse_id,
        end_verse_id: newEntry.end_verse_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<LogEntry[]>([QUERY_KEY], (old = []) => [
        optimistic,
        ...old,
      ]);

      return { previousAll, tempId };
    },
    onSuccess: (realEntry, _variables, context) => {
      if (!context?.tempId) return;
      queryClient.setQueryData<LogEntry[]>([QUERY_KEY], (old = []) =>
        old.map((e) => (e.id === context.tempId ? realEntry : e))
      );
    },
    onError: (_err, _newEntry, context) => {
      if (context?.previousAll !== undefined) {
        queryClient.setQueryData([QUERY_KEY], context.previousAll);
      }
    },
  });
}

export function useUpdateLogEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...updates
    }: {
      id: string;
      date?: string;
      start_verse_id?: number;
      end_verse_id?: number;
    }) =>
      api<LogEntry>(`/api/log-entries/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY] });
      const previousAll = queryClient.getQueryData<LogEntry[]>([QUERY_KEY]);

      queryClient.setQueryData<LogEntry[]>([QUERY_KEY], (old = []) =>
        old.map((e) => (e.id === id ? { ...e, ...updates } : e))
      );

      return { previousAll };
    },
    onSuccess: (realEntry) => {
      queryClient.setQueryData<LogEntry[]>([QUERY_KEY], (old = []) =>
        old.map((e) => (e.id === realEntry.id ? realEntry : e))
      );
    },
    onError: (_err, _vars, context) => {
      if (context?.previousAll !== undefined) {
        queryClient.setQueryData([QUERY_KEY], context.previousAll);
      }
    },
  });
}

export function useBulkCreateLogEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      entries: { date: string; start_verse_id: number; end_verse_id: number }[]
    ) => {
      const { inserted } = await api<{ inserted: number }>(
        "/api/log-entries/bulk",
        { method: "POST", body: JSON.stringify({ entries }) }
      );
      return inserted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteLogEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/log-entries/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY] });
      const previousAll = queryClient.getQueryData<LogEntry[]>([QUERY_KEY]);

      queryClient.setQueryData<LogEntry[]>([QUERY_KEY], (old = []) =>
        old.filter((e) => e.id !== id)
      );

      return { previousAll };
    },
    onError: (_err, _id, context) => {
      if (context?.previousAll !== undefined) {
        queryClient.setQueryData([QUERY_KEY], context.previousAll);
      }
    },
  });
}
