"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LogEntryForm } from "@/components/forms/log-entry-form";
import { cn } from "@/lib/utils";
import {
  useFilteredLogEntries,
  useLogEntriesByDate,
  useCreateLogEntry,
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

  const [formOpen, setFormOpen] = useState(false);
  const [prefillValues, setPrefillValues] = useState<{
    date: string;
    start_verse_id: number;
    end_verse_id: number;
  } | undefined>(undefined);

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

  const handleChapterClick = (bookIndex: number, chapter: number) => {
    const lastVerse = Bible.getChapterVerseCount(bookIndex, chapter);
    setPrefillValues({
      date: today,
      start_verse_id: Bible.makeVerseId(bookIndex, chapter, 1),
      end_verse_id: Bible.makeVerseId(bookIndex, chapter, lastVerse),
    });
    setFormOpen(true);
  };

  const handleCreate = (entry: {
    date: string;
    start_verse_id: number;
    end_verse_id: number;
  }) => {
    createEntry.mutate(entry, {
      onSuccess: () => {
        setFormOpen(false);
        setPrefillValues(undefined);
        toast.success("Reading logged");
      },
      onError: (error) => toast.error(error.message),
    });
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
                          onClick={() => handleChapterClick(book.bibleOrder, ch)}
                          className={cn(
                            "flex items-center justify-center w-full aspect-square rounded-md text-xs font-medium border cursor-pointer transition-colors",
                            chapterComplete &&
                              "bg-primary text-primary-foreground border-primary hover:bg-primary/80",
                            chapterPartial &&
                              "bg-primary/20 border-primary/50 hover:bg-primary/30",
                            !chapterComplete &&
                              !chapterPartial &&
                              "bg-muted border-border hover:bg-accent"
                          )}
                        >
                          {ch}
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

      <LogEntryForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setPrefillValues(undefined);
        }}
        onSubmit={handleCreate}
        initialValues={prefillValues}
        hideDate={!!prefillValues}
        isLoading={createEntry.isPending}
      />
    </div>
  );
}
