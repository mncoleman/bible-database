"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/bible/progress-bar";
import { SegmentBar } from "@/components/bible/segment-bar";
import { useLogEntries } from "@/hooks/use-log-entries";
import { useUserSettings } from "@/hooks/use-user-settings";
import Bible from "@/lib/bible/bible";
import type { VerseRange } from "@/lib/bible/bible";

export default function ProgressPage() {
  const { data: entries = [], isLoading } = useLogEntries();
  const { data: settings } = useUserSettings();

  const ranges: VerseRange[] = entries.map((e) => ({
    startVerseId: e.start_verse_id,
    endVerseId: e.end_verse_id,
  }));

  const totalVerses = Bible.getTotalVerseCount();
  const readVerses = Bible.countUniqueRangeVerses(ranges);
  const remainingVerses = totalVerses - readVerses;
  const dailyGoal = settings?.daily_verse_count_goal ?? 86;
  const daysRemaining =
    dailyGoal > 0 ? Math.ceil(remainingVerses / dailyGoal) : 0;

  // OT / NT breakdown
  const otBooks = Bible.getBooks().filter((b) => !b.newTestament);
  const ntBooks = Bible.getBooks().filter((b) => b.newTestament);

  const otTotalVerses = otBooks.reduce(
    (s, b) => s + Bible.getBookVerseCount(b.bibleOrder),
    0
  );
  const otReadVerses = otBooks.reduce(
    (s, b) => s + Bible.countUniqueBookRangeVerses(b.bibleOrder, ranges),
    0
  );
  const ntTotalVerses = ntBooks.reduce(
    (s, b) => s + Bible.getBookVerseCount(b.bibleOrder),
    0
  );
  const ntReadVerses = ntBooks.reduce(
    (s, b) => s + Bible.countUniqueBookRangeVerses(b.bibleOrder, ranges),
    0
  );

  const bibleSegments = Bible.generateBibleSegments(ranges);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Progress</h1>
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Progress</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Verses Read
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{readVerses.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {remainingVerses.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Entries Logged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{entries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Days to Finish
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {daysRemaining.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Full Bible segment bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Bible Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <SegmentBar segments={bibleSegments} height="h-4" />
        </CardContent>
      </Card>

      {/* Completion bars */}
      <div className="space-y-4">
        <ProgressBar
          label="Overall"
          current={readVerses}
          total={totalVerses}
        />
        <ProgressBar
          label="Old Testament"
          current={otReadVerses}
          total={otTotalVerses}
        />
        <ProgressBar
          label="New Testament"
          current={ntReadVerses}
          total={ntTotalVerses}
        />
      </div>
    </div>
  );
}
