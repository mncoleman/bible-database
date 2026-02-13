"use client";

import { Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
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

  const handleChapterToggle = (bookIndex: number, chapter: number, isComplete: boolean) => {
    if (isComplete) {
      // Uncheck: delete all entries fully contained within this chapter
      const chStart = Bible.makeVerseId(bookIndex, chapter, 1);
      const chEnd = Bible.makeVerseId(bookIndex, chapter, Bible.getChapterVerseCount(bookIndex, chapter));
      const toDelete = entries.filter(
        (e) => e.start_verse_id >= chStart && e.end_verse_id <= chEnd
      );
      if (toDelete.length === 0) {
        toast.error("This chapter was logged as part of a larger range and can't be unchecked here.");
        return;
      }
      toDelete.forEach((e) => {
        deleteEntry.mutate(e.id);
      });
    } else {
      // Check: create entry for the full chapter
      const lastVerse = Bible.getChapterVerseCount(bookIndex, chapter);
      createEntry.mutate({
        date: today,
        start_verse_id: Bible.makeVerseId(bookIndex, chapter, 1),
        end_verse_id: Bible.makeVerseId(bookIndex, chapter, lastVerse),
      });
    }
  };

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
      <h1 className="text-2xl font-bold">Checklist</h1>

      {/* Daily Goal — sticky */}
      <div className="sticky top-0 z-10 bg-background py-3 -mx-1 px-1 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Daily Goal</span>
          <span>
            {todayVerseCount} / {dailyGoal} verses ({dailyProgress.toFixed(0)}%)
          </span>
        </div>
        <Progress value={dailyProgress} />
      </div>

      <Accordion type="multiple" className="w-full">
        {books.map((book) => {
          const chapterCount = book.chapterCount;
          const totalVerses = Bible.getBookVerseCount(book.bibleOrder);
          const readVerses = Bible.countUniqueBookRangeVerses(
            book.bibleOrder,
            ranges
          );
          const isComplete = readVerses >= totalVerses;
          const pct =
            totalVerses > 0
              ? ((readVerses / totalVerses) * 100).toFixed(0)
              : "0";

          return (
            <AccordionItem key={book.bibleOrder} value={String(book.bibleOrder)}>
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
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 p-2">
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

                      return (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => handleChapterToggle(book.bibleOrder, ch, chapterComplete)}
                          className={cn(
                            "relative flex items-center justify-center w-full aspect-square rounded-md text-xs font-medium border cursor-pointer transition-colors",
                            chapterComplete &&
                              "bg-primary text-primary-foreground border-primary hover:bg-primary/80",
                            chapterPartial &&
                              "bg-primary/20 border-primary/50 hover:bg-primary/30",
                            !chapterComplete &&
                              !chapterPartial &&
                              "bg-muted border-border hover:bg-accent"
                          )}
                        >
                          {chapterComplete ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            ch
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
