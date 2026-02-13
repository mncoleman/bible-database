"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentBar } from "@/components/bible/segment-bar";
import { ProgressBar } from "@/components/bible/progress-bar";
import { useLogEntries } from "@/hooks/use-log-entries";
import Bible from "@/lib/bible/bible";
import type { VerseRange } from "@/lib/bible/bible";

export default function BookDetailPage({
  params,
}: {
  params: Promise<{ bookIndex: string }>;
}) {
  const { bookIndex: bookIndexStr } = use(params);
  const bookIndex = parseInt(bookIndexStr);
  const { data: entries = [] } = useLogEntries();

  const ranges: VerseRange[] = entries.map((e) => ({
    startVerseId: e.start_verse_id,
    endVerseId: e.end_verse_id,
  }));

  const bookName = Bible.getBookName(bookIndex);
  const chapterCount = Bible.getBookChapterCount(bookIndex);
  const totalBookVerses = Bible.getBookVerseCount(bookIndex);
  const readBookVerses = Bible.countUniqueBookRangeVerses(bookIndex, ranges);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/books">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{bookName}</h1>
      </div>

      <ProgressBar
        label="Book Progress"
        current={readBookVerses}
        total={totalBookVerses}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: chapterCount }, (_, i) => i + 1).map(
          (chapterIndex) => {
            const segments = Bible.generateBookChapterSegments(
              bookIndex,
              chapterIndex,
              ranges
            );
            const chapterVerseCount = Bible.getChapterVerseCount(
              bookIndex,
              chapterIndex
            );
            const readVerses = Bible.countUniqueBookChapterRangeVerses(
              bookIndex,
              chapterIndex,
              ranges
            );
            const pct =
              chapterVerseCount > 0
                ? ((readVerses / chapterVerseCount) * 100).toFixed(0)
                : "0";

            return (
              <Card key={chapterIndex} className="p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-sm">
                    Chapter {chapterIndex}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {readVerses}/{chapterVerseCount} ({pct}%)
                  </span>
                </div>
                <SegmentBar segments={segments} />
              </Card>
            );
          }
        )}
      </div>
    </div>
  );
}
