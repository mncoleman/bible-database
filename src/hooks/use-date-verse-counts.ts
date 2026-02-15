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

export function useDateChapterCounts(entries: LogEntry[]) {
  return useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      const { date } = entry;
      const start = Bible.parseVerseId(entry.start_verse_id);
      const end = Bible.parseVerseId(entry.end_verse_id);
      const chapterCount = end.chapter - start.chapter + 1;
      counts[date] = (counts[date] || 0) + chapterCount;
    }
    return counts;
  }, [entries]);
}
