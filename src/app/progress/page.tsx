"use client";

import { useState, useMemo } from "react";
import { addDays, differenceInDays, format, parseISO, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProgressBar } from "@/components/bible/progress-bar";
import { SegmentBar } from "@/components/bible/segment-bar";
import { useFilteredLogEntries, useLogEntriesByDate } from "@/hooks/use-log-entries";
import { useDateVerseCounts } from "@/hooks/use-date-verse-counts";
import { useUserSettings } from "@/hooks/use-user-settings";
import Bible from "@/lib/bible/bible";
import type { VerseRange } from "@/lib/bible/bible";
import { todayString } from "@/lib/bible/date-helpers";

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function OutlookCard({
  title,
  description,
  avgDaily,
  daysToFinish,
  dateToFinish,
  remaining,
}: {
  title: string;
  description: string;
  avgDaily: number;
  daysToFinish: number;
  dateToFinish: string;
  remaining: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="divide-y">
        <StatRow label="Average Daily Verses Read" value={avgDaily.toLocaleString()} />
        <StatRow
          label="Days to Finish at This Rate"
          value={avgDaily > 0 ? daysToFinish.toLocaleString() : "—"}
        />
        <StatRow
          label="Date to Finish at This Rate"
          value={avgDaily > 0 ? dateToFinish : "—"}
        />
      </CardContent>
    </Card>
  );
}

export default function ProgressPage() {
  const { data: settings } = useUserSettings();
  const { data: entries = [], isLoading } = useFilteredLogEntries(settings?.look_back_date);
  const today = todayString();
  const { data: todayEntries = [] } = useLogEntriesByDate(today);
  const verseCounts = useDateVerseCounts(entries);

  const [goalDate, setGoalDate] = useState("");

  const ranges: VerseRange[] = useMemo(
    () => entries.map((e) => ({ startVerseId: e.start_verse_id, endVerseId: e.end_verse_id })),
    [entries]
  );

  const totalVerses = Bible.getTotalVerseCount();
  const readVerses = Bible.countUniqueRangeVerses(ranges);
  const remainingVerses = totalVerses - readVerses;
  const percentComplete = totalVerses > 0 ? (readVerses / totalVerses) * 100 : 0;
  const dailyGoal = settings?.daily_verse_count_goal ?? 86;
  const lookBackDate = settings?.look_back_date || null;

  // OT / NT breakdown
  const books = Bible.getBooks();
  const otBooks = books.filter((b) => !b.newTestament);
  const ntBooks = books.filter((b) => b.newTestament);
  const otTotalVerses = otBooks.reduce((s, b) => s + Bible.getBookVerseCount(b.bibleOrder), 0);
  const otReadVerses = otBooks.reduce((s, b) => s + Bible.countUniqueBookRangeVerses(b.bibleOrder, ranges), 0);
  const ntTotalVerses = ntBooks.reduce((s, b) => s + Bible.getBookVerseCount(b.bibleOrder), 0);
  const ntReadVerses = ntBooks.reduce((s, b) => s + Bible.countUniqueBookRangeVerses(b.bibleOrder, ranges), 0);

  const bibleSegments = useMemo(() => Bible.generateBibleSegments(ranges), [ranges]);

  // Books completed
  const booksCompleted = books.filter((b) => {
    const bv = Bible.getBookVerseCount(b.bibleOrder);
    const rv = Bible.countUniqueBookRangeVerses(b.bibleOrder, ranges);
    return rv >= bv;
  }).length;

  // Today's verses
  const todayVersesRead = todayEntries.reduce(
    (sum, e) => sum + Bible.countRangeVerses(e.start_verse_id, e.end_verse_id),
    0
  );

  // Helper: compute verses read in a date range
  const versesInDateRange = (startDate: string, endDate: string): number => {
    let total = 0;
    for (const [date, count] of Object.entries(verseCounts)) {
      if (date >= startDate && date <= endDate) total += count;
    }
    return total;
  };

  // Historical outlook (since look back date)
  const daysSinceLookBack = lookBackDate
    ? differenceInDays(parseISO(today), parseISO(lookBackDate))
    : 0;
  const historicalVerses = lookBackDate ? versesInDateRange(lookBackDate, today) : 0;
  const historicalAvgDaily = daysSinceLookBack > 0 ? Math.round(historicalVerses / daysSinceLookBack) : 0;
  const historicalDaysToFinish = historicalAvgDaily > 0 ? Math.ceil(remainingVerses / historicalAvgDaily) : 0;
  const historicalFinishDate = historicalAvgDaily > 0
    ? format(addDays(new Date(), historicalDaysToFinish), "MMM d, yyyy")
    : "";

  // 30-day outlook
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const thirtyDayVerses = versesInDateRange(thirtyDaysAgo, today);
  const thirtyDayAvg = Math.round(thirtyDayVerses / 30);
  const thirtyDayDays = thirtyDayAvg > 0 ? Math.ceil(remainingVerses / thirtyDayAvg) : 0;
  const thirtyDayFinish = thirtyDayAvg > 0
    ? format(addDays(new Date(), thirtyDayDays), "MMM d, yyyy")
    : "";

  // 7-day outlook
  const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
  const sevenDayVerses = versesInDateRange(sevenDaysAgo, today);
  const sevenDayAvg = Math.round(sevenDayVerses / 7);
  const sevenDayDays = sevenDayAvg > 0 ? Math.ceil(remainingVerses / sevenDayAvg) : 0;
  const sevenDayFinish = sevenDayAvg > 0
    ? format(addDays(new Date(), sevenDayDays), "MMM d, yyyy")
    : "";

  // Today's outlook
  const todayDaysToFinish = todayVersesRead > 0 ? Math.ceil(remainingVerses / todayVersesRead) : 0;
  const todayFinishDate = todayVersesRead > 0
    ? format(addDays(new Date(), todayDaysToFinish), "MMM d, yyyy")
    : "";

  // Set a Goal
  const goalDaysRemaining = goalDate
    ? Math.max(0, differenceInDays(parseISO(goalDate), new Date()))
    : 0;
  const goalVersesPerDay = goalDaysRemaining > 0
    ? Math.ceil(remainingVerses / goalDaysRemaining)
    : 0;

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

      {/* Your Reading Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your Reading Settings</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <StatRow
            label="Look Back Date"
            value={lookBackDate ? format(parseISO(lookBackDate), "MMM d, yyyy") : "All time"}
          />
          <StatRow label="Daily Verse Count Goal" value={dailyGoal.toLocaleString()} />
        </CardContent>
      </Card>

      {/* Your Progress So Far */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your Progress So Far</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <StatRow label="Total Bible Verses" value={totalVerses.toLocaleString()} />
          <StatRow label="Verses Read" value={readVerses.toLocaleString()} />
          <StatRow label="Verses Remaining" value={remainingVerses.toLocaleString()} />
          <StatRow label="Percent Complete" value={`${percentComplete.toFixed(0)}%`} />
          <StatRow label="Books Completed" value={`${booksCompleted} of 66`} />
          <StatRow label="Entries Logged" value={entries.length.toLocaleString()} />
        </CardContent>
      </Card>

      {/* Bible Overview segment bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bible Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <SegmentBar segments={bibleSegments} height="h-4" />
        </CardContent>
      </Card>

      {/* Completion bars */}
      <div className="space-y-4">
        <ProgressBar label="Overall" current={readVerses} total={totalVerses} />
        <ProgressBar label="Old Testament" current={otReadVerses} total={otTotalVerses} />
        <ProgressBar label="New Testament" current={ntReadVerses} total={ntTotalVerses} />
      </div>

      {/* Historical Outlook */}
      {lookBackDate && daysSinceLookBack > 0 && (
        <OutlookCard
          title="Your Historical Outlook"
          description={`Based on your reading habits since your Look Back Date (${daysSinceLookBack} days).`}
          avgDaily={historicalAvgDaily}
          daysToFinish={historicalDaysToFinish}
          dateToFinish={historicalFinishDate}
          remaining={remainingVerses}
        />
      )}

      {/* 30-Day Outlook */}
      <OutlookCard
        title="Your 30-Day Outlook"
        description="Based on your reading habits from the past 30 days."
        avgDaily={thirtyDayAvg}
        daysToFinish={thirtyDayDays}
        dateToFinish={thirtyDayFinish}
        remaining={remainingVerses}
      />

      {/* 7-Day Outlook */}
      <OutlookCard
        title="Your 7-Day Outlook"
        description="Based on your reading habits from the past 7 days."
        avgDaily={sevenDayAvg}
        daysToFinish={sevenDayDays}
        dateToFinish={sevenDayFinish}
        remaining={remainingVerses}
      />

      {/* Today's Outlook */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Today&apos;s Outlook</CardTitle>
          <p className="text-xs text-muted-foreground">
            Based on your reading today.
          </p>
        </CardHeader>
        <CardContent className="divide-y">
          <StatRow label="Verses Read" value={todayVersesRead.toLocaleString()} />
          <StatRow
            label="Days to Finish at This Rate"
            value={todayVersesRead > 0 ? todayDaysToFinish.toLocaleString() : "—"}
          />
          <StatRow
            label="Date to Finish at This Rate"
            value={todayVersesRead > 0 ? todayFinishDate : "—"}
          />
        </CardContent>
      </Card>

      {/* Set a Goal */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Set a Goal</CardTitle>
          <p className="text-xs text-muted-foreground">
            Choose a target date to finish reading the Bible and see how many
            verses you need to read each day.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="goalDate">Goal Finish Date</Label>
            <Input
              id="goalDate"
              type="date"
              value={goalDate}
              min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
              onChange={(e) => setGoalDate(e.target.value)}
            />
          </div>
          <div className="divide-y">
            <StatRow
              label="Days to Finish by Goal"
              value={goalDate ? goalDaysRemaining.toLocaleString() : "—"}
            />
            <StatRow
              label="Verses Required Each Day"
              value={goalDate && goalDaysRemaining > 0 ? goalVersesPerDay.toLocaleString() : "—"}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
