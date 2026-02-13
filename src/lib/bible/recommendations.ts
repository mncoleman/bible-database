import Bible, { type VerseRange, type Segment } from "./bible";
import type { LogEntry } from "@/lib/supabase/types";

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
  const endParsed = Bible.parseVerseId(mostRecent.end_verse_id);

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

  const bookName = Bible.getBookName(nextParsed.book);
  const rangeDisplay = Bible.displayVerseRange(nextVerseId, chapterEnd);

  return {
    label: "Pick up where you left off",
    description: rangeDisplay,
    startVerseId: nextVerseId,
    endVerseId: chapterEnd,
  };
}

/**
 * Find the largest unread sections of the Bible.
 */
export function getUnreadGaps(
  readRanges: VerseRange[],
  limit = 3
): Recommendation[] {
  const segments = Bible.generateBibleSegments(readRanges);
  const unread = segments
    .filter((s) => !s.read)
    .sort((a, b) => b.verseCount - a.verseCount)
    .slice(0, limit);

  return unread.map((segment) => {
    const start = Bible.parseVerseId(segment.startVerseId);
    const end = Bible.parseVerseId(segment.endVerseId);
    const startBook = Bible.getBookName(start.book);
    const endBook = Bible.getBookName(end.book);

    let description: string;
    if (start.book === end.book) {
      // Within a single book
      const bookVerseCount = Bible.getBookVerseCount(start.book);
      if (segment.verseCount === bookVerseCount) {
        description = `${startBook} is unread`;
      } else {
        description = `${Bible.displayVerseRange(segment.startVerseId, segment.endVerseId)} is unread`;
      }
    } else {
      description = `${startBook} through ${endBook} is unread`;
    }

    // For the suggestion, offer the first chapter of the gap
    const suggestEnd = Bible.getLastBookChapterVerseId(start.book, start.chapter);

    return {
      label: description,
      description: Bible.displayVerseRange(segment.startVerseId, suggestEnd),
      startVerseId: segment.startVerseId,
      endVerseId: suggestEnd,
    };
  });
}

const POPULAR_STARTING_POINTS = [
  { bookIndex: 1, chapter: 1, label: "Genesis 1", description: "The beginning" },
  { bookIndex: 40, chapter: 1, label: "Matthew 1", description: "Start of the New Testament" },
  { bookIndex: 19, chapter: 1, label: "Psalm 1", description: "The Psalms" },
  { bookIndex: 20, chapter: 1, label: "Proverbs 1", description: "Wisdom literature" },
  { bookIndex: 43, chapter: 1, label: "John 1", description: "Gospel of John" },
];

/**
 * Return popular starting points, filtered to only show ones
 * where the suggested chapter isn't fully read yet.
 */
export function getPopularStartingPoints(
  readRanges: VerseRange[]
): Recommendation[] {
  const results: Recommendation[] = [];

  for (const point of POPULAR_STARTING_POINTS) {
    const chapterVerseCount = Bible.getChapterVerseCount(
      point.bookIndex,
      point.chapter
    );
    const readInChapter = Bible.countUniqueBookChapterRangeVerses(
      point.bookIndex,
      point.chapter,
      readRanges
    );

    // Skip if already fully read
    if (readInChapter >= chapterVerseCount) continue;

    const startVerseId = Bible.makeVerseId(point.bookIndex, point.chapter, 1);
    const endVerseId = Bible.makeVerseId(
      point.bookIndex,
      point.chapter,
      chapterVerseCount
    );

    results.push({
      label: point.label,
      description: point.description,
      startVerseId,
      endVerseId,
    });
  }

  return results;
}
