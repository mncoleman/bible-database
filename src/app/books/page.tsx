"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SegmentBar } from "@/components/bible/segment-bar";
import { useFilteredLogEntries } from "@/hooks/use-log-entries";
import { useUserSettings } from "@/hooks/use-user-settings";
import Bible from "@/lib/bible/bible";
import type { VerseRange } from "@/lib/bible/bible";

export default function BooksPage() {
  const { data: settings } = useUserSettings();
  const { data: entries = [], isLoading } = useFilteredLogEntries(settings?.look_back_date);
  const books = Bible.getBooks();

  const ranges: VerseRange[] = entries.map((e) => ({
    startVerseId: e.start_verse_id,
    endVerseId: e.end_verse_id,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Books</h1>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : (
        <>
          {/* Old Testament */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Old Testament</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {books
                .filter((b) => !b.newTestament)
                .map((book) => {
                  const segments = Bible.generateBookSegments(
                    book.bibleOrder,
                    ranges
                  );
                  const readVerses = Bible.countUniqueBookRangeVerses(
                    book.bibleOrder,
                    ranges
                  );
                  const totalVerses = Bible.getBookVerseCount(book.bibleOrder);
                  const pct =
                    totalVerses > 0
                      ? ((readVerses / totalVerses) * 100).toFixed(0)
                      : "0";

                  return (
                    <Link
                      key={book.bibleOrder}
                      href={`/books/${book.bibleOrder}`}
                    >
                      <Card className="p-3 hover:bg-accent/50 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-sm">
                            {book.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {pct}%
                          </span>
                        </div>
                        <SegmentBar segments={segments} />
                      </Card>
                    </Link>
                  );
                })}
            </div>
          </div>

          {/* New Testament */}
          <div>
            <h2 className="text-lg font-semibold mb-3">New Testament</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {books
                .filter((b) => b.newTestament)
                .map((book) => {
                  const segments = Bible.generateBookSegments(
                    book.bibleOrder,
                    ranges
                  );
                  const readVerses = Bible.countUniqueBookRangeVerses(
                    book.bibleOrder,
                    ranges
                  );
                  const totalVerses = Bible.getBookVerseCount(book.bibleOrder);
                  const pct =
                    totalVerses > 0
                      ? ((readVerses / totalVerses) * 100).toFixed(0)
                      : "0";

                  return (
                    <Link
                      key={book.bibleOrder}
                      href={`/books/${book.bibleOrder}`}
                    >
                      <Card className="p-3 hover:bg-accent/50 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-sm">
                            {book.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {pct}%
                          </span>
                        </div>
                        <SegmentBar segments={segments} />
                      </Card>
                    </Link>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
