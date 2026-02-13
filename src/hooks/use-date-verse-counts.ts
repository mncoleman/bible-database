"use client";

import { useMemo } from "react";
import Bible from "@/lib/bible/bible";
import type { LogEntry } from "@/lib/supabase/types";

export function useDateVerseCounts(entries: LogEntry[]) {
  return useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      const { date } = entry;
      const verseCount = Bible.countRangeVerses(
        entry.start_verse_id,
        entry.end_verse_id
      );
      counts[date] = (counts[date] || 0) + verseCount;
    }
    return counts;
  }, [entries]);
}
