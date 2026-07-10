import Bible, { type VerseRange } from "./bible";
import type { LogEntry } from "@/lib/types";

export type Recommendation = {
  label: string;
  description: string;
  startVerseId: number;
  endVerseId: number;
};

/**
 * Suggest continuing from where the user last left off.
 * Finds the most recent entry by date (then created_at), gets the next unread verse,
 * and suggests a chapter-sized range starting there.
 */
export function getPickUpWhereYouLeftOff(
  entries: LogEntry[],
  readRanges: VerseRange[]
): Recommendation | null {
  if (entries.length === 0) return null;

  // Most recent entry (entries are sorted by date desc from the hook)
  const mostRecent = entries[0];
  // Find the next verse after the most recent entry
  let nextVerseId = Bible.getNextVerseId(mostRecent.end_verse_id, true);
  if (!nextVerseId) return null;

  // Skip past already-read sections
  const consolidated = Bible.consolidateRanges(readRanges);
  for (const range of consolidated) {
    if (nextVerseId >= range.startVerseId && nextVerseId <= range.endVerseId) {
      nextVerseId = Bible.getNextVerseId(range.endVerseId, true);
      if (!nextVerseId) return null;
    }
  }

  const nextParsed = Bible.parseVerseId(nextVerseId);
  // Suggest the rest of the chapter the next verse falls in
  const chapterEnd = Bible.getLastBookChapterVerseId(
    nextParsed.book,
    nextParsed.chapter
  );

  const rangeDisplay = Bible.displayVerseRange(nextVerseId, chapterEnd);

  return {
    label: "Pick up where you left off",
    description: rangeDisplay,
    startVerseId: nextVerseId,
    endVerseId: chapterEnd,
  };
}

