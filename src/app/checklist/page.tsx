"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useFilteredLogEntries, useLogEntriesByDate } from "@/hooks/use-log-entries";
import { useUserSettings } from "@/hooks/use-user-settings";
import Bible from "@/lib/bible/bible";
import type { VerseRange } from "@/lib/bible/bible";
import { todayString } from "@/lib/bible/date-helpers";

export default function ChecklistPage() {
  const { data: settings } = useUserSettings();
  const { data: entries = [], isLoading } = useFilteredLogEntries(settings?.look_back_date);
  const today = todayString();
  const { data: todayEntries = [] } = useLogEntriesByDate(today);
  const books = Bible.getBooks();

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

      {/* Daily Goal */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Daily Goal</span>
          <span>
            {todayVerseCount} / {dailyGoal} verses
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
                        <div
                          key={ch}
                          className={cn(
                            "flex items-center justify-center w-full aspect-square rounded-md text-xs font-medium border",
                            chapterComplete &&
                              "bg-primary text-primary-foreground border-primary",
                            chapterPartial &&
                              "bg-primary/20 border-primary/50",
                            !chapterComplete &&
                              !chapterPartial &&
                              "bg-muted border-border"
                          )}
                        >
                          {ch}
                        </div>
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
