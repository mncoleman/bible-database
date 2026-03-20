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
    onMutate: async (newEntry) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY] });
      const previousAll = queryClient.getQueryData<LogEntry[]>([QUERY_KEY]);
      const previousByDate = queryClient.getQueryData<LogEntry[]>([QUERY_KEY, "date", newEntry.date]);

      const tempId = `temp-${Date.now()}`;
      const optimistic: LogEntry = {
        id: tempId,
        user_id: "",
        date: newEntry.date,
        start_verse_id: newEntry.start_verse_id,
        end_verse_id: newEntry.end_verse_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<LogEntry[]>([QUERY_KEY], (old = []) => [optimistic, ...old]);
      queryClient.setQueryData<LogEntry[]>([QUERY_KEY, "date", newEntry.date], (old = []) => [optimistic, ...old]);

      return { previousAll, previousByDate, date: newEntry.date, tempId };
    },
    onSuccess: (data, _variables, context) => {
      // Replace the optimistic temp entry with real server data
      if (context?.tempId) {
        queryClient.setQueryData<LogEntry[]>([QUERY_KEY], (old = []) =>
          old.map((e) => (e.id === context.tempId ? data : e))
        );
        queryClient.setQueryData<LogEntry[]>([QUERY_KEY, "date", data.date], (old = []) =>
          old.map((e) => (e.id === context.tempId ? data : e))
        );
      }
    },
    onError: (_err, _newEntry, context) => {
      if (context?.previousAll !== undefined) {
        queryClient.setQueryData([QUERY_KEY], context.previousAll);
      }
      if (context?.previousByDate !== undefined) {
        queryClient.setQueryData([QUERY_KEY, "date", context.date], context.previousByDate);
      }
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("log_entries")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data as LogEntry;
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY] });
      const previousAll = queryClient.getQueryData<LogEntry[]>([QUERY_KEY]);

      const applyUpdate = (entries: LogEntry[] | undefined) =>
        (entries ?? []).map((e) => (e.id === id ? { ...e, ...updates } : e));

      queryClient.setQueryData<LogEntry[]>([QUERY_KEY], applyUpdate);

      // Update any by-date queries that contain this entry
      const entry = previousAll?.find((e) => e.id === id);
      const affectedDates = new Set<string>();
      if (entry) affectedDates.add(entry.date);
      if (updates.date) affectedDates.add(updates.date);
      affectedDates.forEach((date) => {
        queryClient.setQueryData<LogEntry[]>([QUERY_KEY, "date", date], applyUpdate);
      });

      return { previousAll, affectedDates };
    },
    onSuccess: (data) => {
      // Replace optimistic data with real server data
      queryClient.setQueryData<LogEntry[]>([QUERY_KEY], (old = []) =>
        old.map((e) => (e.id === data.id ? data : e))
      );
      queryClient.setQueryData<LogEntry[]>([QUERY_KEY, "date", data.date], (old = []) =>
        old.map((e) => (e.id === data.id ? data : e))
      );
    },
    onError: (_err, _vars, context) => {
      if (context?.previousAll !== undefined) {
        queryClient.setQueryData([QUERY_KEY], context.previousAll);
      }
      context?.affectedDates?.forEach((date) => {
        const byDate = context.previousAll?.filter((e) => e.date === date);
        if (byDate) queryClient.setQueryData([QUERY_KEY, "date", date], byDate);
      });
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("log_entries")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY] });
      const previousAll = queryClient.getQueryData<LogEntry[]>([QUERY_KEY]);

      const entry = previousAll?.find((e) => e.id === id);
      queryClient.setQueryData<LogEntry[]>([QUERY_KEY], (old = []) =>
        old.filter((e) => e.id !== id)
      );
      if (entry) {
        queryClient.setQueryData<LogEntry[]>([QUERY_KEY, "date", entry.date], (old = []) =>
          old.filter((e) => e.id !== id)
        );
      }

      return { previousAll, deletedEntry: entry };
    },
    onError: (_err, _id, context) => {
      if (context?.previousAll !== undefined) {
        queryClient.setQueryData([QUERY_KEY], context.previousAll);
      }
      if (context?.deletedEntry) {
        const entry = context.deletedEntry;
        queryClient.setQueryData<LogEntry[]>([QUERY_KEY, "date", entry.date], (old = []) =>
          [...old, entry].sort((a, b) => b.created_at.localeCompare(a.created_at))
        );
      }
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
