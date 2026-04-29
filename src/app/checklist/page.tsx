"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { Check, ChevronsDownUp, ChevronsUpDown, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  useFilteredLogEntries,
  useLogEntriesByDate,
  useCreateLogEntry,
  useDeleteLogEntry,
} from "@/hooks/use-log-entries";
import { useUserSettings } from "@/hooks/use-user-settings";
import Bible from "@/lib/bible/bible";
import type { VerseRange } from "@/lib/bible/bible";
import { todayString } from "@/lib/bible/date-helpers";
import { toast } from "sonner";

export default function ChecklistPage() {
  const { data: settings } = useUserSettings();
  const { data: entries = [], isLoading } = useFilteredLogEntries(settings?.look_back_date);
  const today = todayString();
  const { data: todayEntries = [] } = useLogEntriesByDate(today);
  const books = Bible.getBooks();
  const createEntry = useCreateLogEntry();
  const deleteEntry = useDeleteLogEntry();

  // Track chapters with in-flight mutations to prevent double-taps
  const [pendingChapters, setPendingChapters] = useState<Set<string>>(
    () => new Set()
  );

  // Track recent toggle animations: chapterKey → "check" | "uncheck" | nonce string
  // The nonce changes per toggle so React remounts the overlay and replays the animation.
  const [toggleAnims, setToggleAnims] = useState<
    Map<string, { kind: "check" | "uncheck"; nonce: number }>
  >(() => new Map());

  const ranges: VerseRange[] = entries.map((e) => ({
    startVerseId: e.start_verse_id,
    endVerseId: e.end_verse_id,
  }));

  const dailyGoal = settings?.daily_verse_count_goal ?? 86;
  const todayVerseCount = todayEntries.reduce(
    (sum, entry) =>
      sum + Bible.countRangeVerses(entry.start_verse_id, entry.end_verse_id),
    0
  );
  const dailyProgress = Math.min((todayVerseCount / dailyGoal) * 100, 100);

  const [compact, setCompact] = useState(true);

  // Track reveal transition: when toggling from compact→reveal, we note
  // which books are "newly appearing" so we can fade them in via CSS.
  const prevCompactRef = useRef(compact);
  const justRevealedRef = useRef(false);
  if (prevCompactRef.current !== compact) {
    justRevealedRef.current = prevCompactRef.current && !compact;
    prevCompactRef.current = compact;
  }

  const completedBookIds = useMemo(() => {
    const ids = new Set<string>();
    for (const book of books) {
      const total = Bible.getBookVerseCount(book.bibleOrder);
      const read = Bible.countUniqueBookRangeVerses(book.bibleOrder, ranges);
      if (read >= total) ids.add(String(book.bibleOrder));
    }
    return ids;
  }, [books, ranges]);

  // Catch-up indicator: how many verses behind the reading plan
  const catchupMap = useMemo(() => {
    const map = new Map<string, number>(); // "bookIndex-chapter" → fraction 0–1
    const goalEndDate = settings?.goal_end_date ?? null;
    if (!goalEndDate) return map;

    const daysRemaining = Math.max(0, differenceInDays(parseISO(goalEndDate), new Date()));
    if (daysRemaining === 0) return map;

    const totalReadVerses = Bible.countUniqueRangeVerses(ranges);
    const totalVerses = Bible.getTotalVerseCount();
    const remainingVerses = totalVerses - totalReadVerses;
    const versesToGetOnTrack = remainingVerses - dailyGoal * daysRemaining;

    if (versesToGetOnTrack <= 0) return map; // on track or ahead

    let versesLeft = versesToGetOnTrack;
    const bookCount = Bible.getBookCount();

    for (let bookIdx = 1; bookIdx <= bookCount && versesLeft > 0; bookIdx++) {
      const chapterCount = Bible.getBookChapterCount(bookIdx);
      for (let ch = 1; ch <= chapterCount && versesLeft > 0; ch++) {
        const totalChVerses = Bible.getChapterVerseCount(bookIdx, ch);
        const readChVerses = Bible.countUniqueBookChapterRangeVerses(bookIdx, ch, ranges);
        const unreadChVerses = totalChVerses - readChVerses;

        if (unreadChVerses <= 0) continue; // fully read

        if (versesLeft >= unreadChVerses) {
          // Entire unread portion is part of catch-up
          map.set(`${bookIdx}-${ch}`, unreadChVerses / totalChVerses);
          versesLeft -= unreadChVerses;
        } else {
          // Partial catch-up
          map.set(`${bookIdx}-${ch}`, versesLeft / totalChVerses);
          versesLeft = 0;
        }
      }
    }

    return map;
  }, [ranges, settings?.goal_end_date, dailyGoal]);

  const visibleBooks = compact
    ? books.filter((b) => !completedBookIds.has(String(b.bibleOrder)))
    : books;


  const handleChapterToggle = useCallback((bookIndex: number, chapter: number, isComplete: boolean) => {
    const chapterKey = `${bookIndex}-${chapter}`;
    if (pendingChapters.has(chapterKey)) return;

    setPendingChapters((prev) => new Set(prev).add(chapterKey));
    const clearPending = () =>
      setPendingChapters((prev) => {
        const next = new Set(prev);
        next.delete(chapterKey);
        return next;
      });

    // Trigger toggle animation overlay (green check or red X)
    setToggleAnims((prev) => {
      const next = new Map(prev);
      next.set(chapterKey, {
        kind: isComplete ? "uncheck" : "check",
        nonce: Date.now(),
      });
      return next;
    });

    if (isComplete) {
      // Uncheck: delete all entries fully contained within this chapter
      const chStart = Bible.makeVerseId(bookIndex, chapter, 1);
      const chEnd = Bible.makeVerseId(bookIndex, chapter, Bible.getChapterVerseCount(bookIndex, chapter));
      const toDelete = entries.filter(
        (e) => e.start_verse_id >= chStart && e.end_verse_id <= chEnd
      );
      if (toDelete.length === 0) {
        clearPending();
        toast.error("This chapter was logged as part of a larger range and can't be unchecked here.");
        return;
      }
      let remaining = toDelete.length;
      toDelete.forEach((e) => {
        deleteEntry.mutate(e.id, {
          onError: (error) => toast.error(error.message),
          onSettled: () => {
            remaining--;
            if (remaining <= 0) clearPending();
          },
        });
      });
    } else {
      // Check: create entry for the full chapter
      const lastVerse = Bible.getChapterVerseCount(bookIndex, chapter);
      createEntry.mutate({
        date: today,
        start_verse_id: Bible.makeVerseId(bookIndex, chapter, 1),
        end_verse_id: Bible.makeVerseId(bookIndex, chapter, lastVerse),
      }, {
        onError: (error) => toast.error(error.message),
        onSettled: clearPending,
      });
    }
  }, [pendingChapters, entries, today, createEntry, deleteEntry]);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Checklist</h1>
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Checklist</h1>
        {completedBookIds.size > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setCompact((v) => !v)} className="gap-1.5 text-muted-foreground">
            {compact ? (
              <>
                <ChevronsUpDown className="h-4 w-4" />
                Reveal
              </>
            ) : (
              <>
                <ChevronsDownUp className="h-4 w-4" />
                Compact
              </>
            )}
          </Button>
        )}
      </div>

      {/* Daily Goal — sticky */}
      <div
        className="sticky top-14 z-10 py-3 -mx-1 px-1 space-y-2 rounded-lg"
        style={{
          backgroundColor: "var(--glass-bg)",
          backdropFilter: "blur(40px) saturate(var(--glass-saturate))",
          WebkitBackdropFilter: "blur(40px) saturate(var(--glass-saturate))",
          boxShadow: "var(--glass-shadow)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Daily Goal</span>
          <span>
            {todayVerseCount} / {dailyGoal} verses ({dailyProgress.toFixed(0)}%)
          </span>
        </div>
        <Progress value={dailyProgress} className="bg-muted" />
      </div>

      <Accordion type="multiple" className="w-full">
        {visibleBooks.map((book) => {
          const chapterCount = book.chapterCount;
          const totalVerses = Bible.getBookVerseCount(book.bibleOrder);
          const readVerses = Bible.countUniqueBookRangeVerses(
            book.bibleOrder,
            ranges
          );
          const isComplete = readVerses >= totalVerses;
          const fadeIn = justRevealedRef.current && isComplete;
          const pct =
            totalVerses > 0
              ? ((readVerses / totalVerses) * 100).toFixed(0)
              : "0";

          return (
            <AccordionItem
              key={book.bibleOrder}
              value={String(book.bibleOrder)}
              className={fadeIn ? "animate-fade-in" : undefined}
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  {isComplete && <Check className="h-4 w-4 text-primary" />}
                  <span className={cn("font-medium", isComplete && "text-primary")}>
                    {book.name}
                  </span>
                  <Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
                    {pct}%
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-5 gap-1 p-1">
                  {Array.from({ length: chapterCount }, (_, i) => i + 1).map(
                    (ch) => {
                      const chapterVerses = Bible.getChapterVerseCount(
                        book.bibleOrder,
                        ch
                      );
                      const chapterRead =
                        Bible.countUniqueBookChapterRangeVerses(
                          book.bibleOrder,
                          ch,
                          ranges
                        );
                      const chapterComplete = chapterRead >= chapterVerses;
                      const chapterPartial = chapterRead > 0 && !chapterComplete;
                      const chapterKey = `${book.bibleOrder}-${ch}`;
                      const isPending = pendingChapters.has(chapterKey);
                      const catchupFraction = catchupMap.get(chapterKey) ?? 0;
                      const hasCatchup = catchupFraction > 0 && !chapterComplete;
                      const toggleAnim = toggleAnims.get(chapterKey);

                      return (
                        <button
                          key={ch}
                          type="button"
                          disabled={isPending}
                          aria-label={`${book.name} chapter ${ch}${chapterComplete ? ", complete" : chapterPartial ? ", partial" : ""}${hasCatchup ? `, ${Math.round(catchupFraction * 100)}% catch-up` : ""}`}
                          onClick={() => handleChapterToggle(book.bibleOrder, ch, chapterComplete)}
                          className={cn(
                            "relative flex items-center justify-center rounded text-xs font-medium border cursor-pointer transition-colors aspect-square overflow-hidden",
                            isPending && "opacity-60 pointer-events-none",
                            chapterComplete &&
                              "bg-primary text-primary-foreground border-primary hover:bg-primary/80",
                            chapterPartial &&
                              "bg-primary/20 border-primary/50 hover:bg-primary/30",
                            hasCatchup &&
                              "border-blue-500/50",
                            !chapterComplete &&
                              !chapterPartial &&
                              !hasCatchup &&
                              "bg-muted border-border hover:bg-accent"
                          )}
                        >
                          {hasCatchup && (
                            <span
                              className="absolute top-0 left-0 h-full bg-blue-500/25 dark:bg-blue-400/30"
                              style={{ width: `${catchupFraction * 100}%` }}
                            />
                          )}
                          <span className="relative text-2xl sm:text-[3rem] leading-none">{ch}</span>
                          {chapterComplete && (
                            <Check className="absolute top-1 right-1 h-4 w-4 sm:h-6 sm:w-6" />
                          )}
                          <span className={cn(
                            "absolute bottom-0.5 left-0.5 text-[0.7rem] sm:text-[1.8rem] leading-none tabular-nums",
                            chapterComplete ? "opacity-70" : "opacity-50"
                          )}>
                            {chapterVerses}
                          </span>
                          {toggleAnim && (
                            <span
                              key={toggleAnim.nonce}
                              aria-hidden
                              className="animate-checklist-toggle pointer-events-none absolute top-1/2 left-1/2 z-10"
                              onAnimationEnd={() => {
                                setToggleAnims((prev) => {
                                  const next = new Map(prev);
                                  const cur = next.get(chapterKey);
                                  if (cur && cur.nonce === toggleAnim.nonce) {
                                    next.delete(chapterKey);
                                  }
                                  return next;
                                });
                              }}
                            >
                              {toggleAnim.kind === "check" ? (
                                <Check
                                  className="h-16 w-16 text-green-500"
                                  strokeWidth={3}
                                />
                              ) : (
                                <X
                                  className="h-16 w-16 text-red-500"
                                  strokeWidth={3}
                                />
                              )}
                            </span>
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
