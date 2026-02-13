"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { LogEntry } from "@/lib/supabase/types";

const QUERY_KEY = "log-entries";

export function useLogEntries() {
  const supabase = createClient();

  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("log_entries")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data as LogEntry[];
    },
  });
}

export function useLogEntriesByDate(date: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: [QUERY_KEY, "date", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("log_entries")
        .select("*")
        .eq("date", date)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LogEntry[];
    },
  });
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
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      date: string;
      start_verse_id: number;
      end_verse_id: number;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("log_entries")
        .insert({ ...entry, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as LogEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateLogEntry() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      date?: string;
      start_verse_id?: number;
      end_verse_id?: number;
    }) => {
      const { data, error } = await supabase
        .from("log_entries")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as LogEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useBulkCreateLogEntries() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      entries: { date: string; start_verse_id: number; end_verse_id: number }[]
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const rows = entries.map((e) => ({ ...e, user_id: user.id }));
      // Insert in batches of 500 to avoid payload limits
      const batchSize = 500;
      let inserted = 0;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabase.from("log_entries").insert(batch);
        if (error) throw error;
        inserted += batch.length;
      }
      return inserted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteLogEntry() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("log_entries")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
