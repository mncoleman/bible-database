"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { differenceInDays, parseISO, format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LogEntryForm } from "@/components/forms/log-entry-form";
import { LogEntryCard } from "@/components/bible/log-entry-card";
import { ReadingSuggestions } from "@/components/bible/reading-suggestions";
import {
  useFilteredLogEntries,
  useLogEntriesByDate,
  useCreateLogEntry,
  useUpdateLogEntry,
  useDeleteLogEntry,
} from "@/hooks/use-log-entries";
import { useUserSettings } from "@/hooks/use-user-settings";
import Bible from "@/lib/bible/bible";
import type { LogEntry } from "@/lib/types";
import { todayString } from "@/lib/bible/date-helpers";
import { toast } from "sonner";
import type { BibleApp, BibleVersion } from "@/lib/bible/bible-apps";

export default function TodayPage() {
  const today = todayString();
  const { data: todayEntries = [], isLoading } = useLogEntriesByDate(today);
  const { data: settings } = useUserSettings();
  const { data: allEntries = [] } = useFilteredLogEntries(settings?.look_back_date);
  const createEntry = useCreateLogEntry();
  const updateEntry = useUpdateLogEntry();
  const deleteEntry = useDeleteLogEntry();

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);
  const [prefillValues, setPrefillValues] = useState<{
    date: string;
    start_verse_id: number;
    end_verse_id: number;
  } | undefined>(undefined);

  const dailyGoal = settings?.daily_verse_count_goal ?? 86;
  const todayVerseCount = todayEntries.reduce(
    (sum, entry) =>
      sum + Bible.countRangeVerses(entry.start_verse_id, entry.end_verse_id),
    0
  );
  const dailyProgress = Math.min((todayVerseCount / dailyGoal) * 100, 100);

  const ranges = useMemo(
    () => allEntries.map((e) => ({
      startVerseId: e.start_verse_id,
      endVerseId: e.end_verse_id,
    })),
    [allEntries]
  );
  const totalReadVerses = Bible.countUniqueRangeVerses(ranges);
  const totalVerses = Bible.getTotalVerseCount();
  const remainingVerses = totalVerses - totalReadVerses;
  const overallProgress = (totalReadVerses / totalVerses) * 100;

  // Plan status based on start date + goal end date
  const startDate = settings?.look_back_date ?? null;
  const goalEndDate = settings?.goal_end_date ?? null;
  const planStatus = useMemo(() => {
    if (!goalEndDate) return null;
    const daysRemaining = Math.max(0, differenceInDays(parseISO(goalEndDate), new Date()));
    if (daysRemaining === 0) return null;

    // Use the user's configured daily verse goal from settings
    const plannedDailyGoal = dailyGoal;

    // Current pace needed (today → end date)
    const currentDailyNeeded = Math.ceil(remainingVerses / daysRemaining);

    // How far ahead/behind overall plan
    const daysElapsed = startDate
      ? differenceInDays(new Date(), parseISO(startDate))
      : null;
    const expectedVerses = daysElapsed !== null
      ? plannedDailyGoal * daysElapsed
      : null;
    const overallDiff = expectedVerses !== null ? totalReadVerses - expectedVerses : null;

    // Verses to read today to get on track for the current day
    // Negative means user is ahead by that many verses
    const versesToGetOnTrack = remainingVerses - plannedDailyGoal * daysRemaining;

    return {
      goalDate: format(parseISO(goalEndDate), "MMM d, yyyy"),
      startDate: startDate ? format(parseISO(startDate), "MMM d, yyyy") : null,
      daysRemaining,
      plannedDailyGoal,
      currentDailyNeeded,
      overallDiff,
      versesToGetOnTrack,
    };
  }, [goalEndDate, startDate, remainingVerses, dailyGoal, totalReadVerses]);

  const [animatedDaily, setAnimatedDaily] = useState(0);
  const [animatedOverall, setAnimatedOverall] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAnimatedDaily(dailyProgress);
      setAnimatedOverall(overallProgress);
    });
    return () => cancelAnimationFrame(frame);
  }, [dailyProgress, overallProgress]);

  const handleCreate = (entry: {
    date: string;
    start_verse_id: number;
    end_verse_id: number;
  }) => {
    setFormOpen(false);
    createEntry.mutate(entry, {
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  const handleUpdate = (entry: {
    date: string;
    start_verse_id: number;
    end_verse_id: number;
  }) => {
    if (!editingEntry) return;
    setEditingEntry(null);
    updateEntry.mutate(
      { id: editingEntry.id, ...entry },
      {
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  const handleLogSuggestion = (startVerseId: number, endVerseId: number) => {
    setPrefillValues({
      date: today,
      start_verse_id: startVerseId,
      end_verse_id: endVerseId,
    });
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteEntry.mutate(id, {
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Today</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Log Reading
        </Button>
      </div>

      {/* Daily Goal */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Daily Goal</span>
          <span>
            {todayVerseCount} / {dailyGoal} verses ({dailyProgress.toFixed(0)}%)
          </span>
        </div>
        <Progress value={animatedDaily} />
      </div>

      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Bible Completion</span>
          <span>
            {totalReadVerses.toLocaleString()} / {totalVerses.toLocaleString()}{" "}
            verses ({overallProgress.toFixed(1)}%)
          </span>
        </div>
        <Progress value={animatedOverall} />
      </div>

      {/* Today's entries — carousel */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Today&apos;s Readings</h2>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : todayEntries.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No readings logged today. Tap &quot;Log Reading&quot; to get started.
          </p>
        ) : todayEntries.length === 1 ? (
          <LogEntryCard
            entry={todayEntries[0]}
            onEdit={(e) => setEditingEntry(e)}
            onDelete={handleDelete}
            bibleApp={(settings?.preferred_bible_app as BibleApp) || "BIBLEGATEWAY"}
            bibleVersion={(settings?.preferred_bible_version as BibleVersion) || "NASB2020"}
          />
        ) : (
          <TodayCarousel
            entries={todayEntries}
            onEdit={(e) => setEditingEntry(e)}
            onDelete={handleDelete}
            bibleApp={(settings?.preferred_bible_app as BibleApp) || "BIBLEGATEWAY"}
            bibleVersion={(settings?.preferred_bible_version as BibleVersion) || "NASB2020"}
          />
        )}
      </div>

      {/* Suggested Reading */}
      <ReadingSuggestions
        entries={allEntries}
        bibleApp={(settings?.preferred_bible_app as BibleApp) || "BIBLEGATEWAY"}
        bibleVersion={(settings?.preferred_bible_version as BibleVersion) || "NASB2020"}
        onLog={handleLogSuggestion}
      />

      {/* Plan Status */}
      {planStatus && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Plan Status</CardTitle>
            <p className="text-xs text-muted-foreground">
              {planStatus.startDate && <>{planStatus.startDate} &rarr; </>}
              {planStatus.goalDate} ({planStatus.daysRemaining} days left)
            </p>
            <p className="text-xs text-muted-foreground">
              {planStatus.plannedDailyGoal.toLocaleString()} verses/day
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current daily needed</span>
              <span
                className="font-medium"
                style={planStatus.versesToGetOnTrack <= 0 ? { color: "hsl(140 40% 35%)" } : undefined}
              >
                {planStatus.currentDailyNeeded.toLocaleString()} verses
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Read today to be on track</span>
              <span
                className="font-medium"
                style={planStatus.versesToGetOnTrack > 0 ? { color: "hsl(0 60% 35%)" } : undefined}
              >
                {planStatus.versesToGetOnTrack <= 0
                  ? `${Math.abs(planStatus.versesToGetOnTrack).toLocaleString()} verses ahead`
                  : `${planStatus.versesToGetOnTrack.toLocaleString()} verses`}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

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

      <LogEntryForm
        open={!!editingEntry}
        onOpenChange={(open) => !open && setEditingEntry(null)}
        onSubmit={handleUpdate}
        initialValues={
          editingEntry
            ? {
                date: editingEntry.date,
                start_verse_id: editingEntry.start_verse_id,
                end_verse_id: editingEntry.end_verse_id,
              }
            : undefined
        }
        hideDate
        isLoading={updateEntry.isPending}
      />
    </div>
  );
}

function TodayCarousel({
  entries,
  onEdit,
  onDelete,
  bibleApp,
  bibleVersion,
}: {
  entries: LogEntry[];
  onEdit: (entry: LogEntry) => void;
  onDelete: (id: string) => void;
  bibleApp: BibleApp;
  bibleVersion: BibleVersion;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Prevent touch events from reaching the swipe-navigation handler on
  // PageTransition so vertical scrolling inside the carousel isn't hijacked.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const stop = (e: TouchEvent) => e.stopPropagation();
    el.addEventListener("touchstart", stop, { passive: true });
    el.addEventListener("touchmove", stop, { passive: true });
    el.addEventListener("touchend", stop, { passive: true });
    return () => {
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("touchmove", stop);
      el.removeEventListener("touchend", stop);
    };
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !el.firstElementChild) return;
    // If scrolled to the bottom (within 2px tolerance), activate the last dot
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
    if (atBottom) {
      setActiveIndex(entries.length - 1);
      return;
    }
    const itemHeight = el.firstElementChild.getBoundingClientRect().height;
    if (itemHeight === 0) return;
    const index = Math.round(el.scrollTop / itemHeight);
    setActiveIndex(Math.min(index, entries.length - 1));
  }, [entries.length]);

  const scrollTo = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el || !el.firstElementChild) return;
    const itemHeight = el.firstElementChild.getBoundingClientRect().height;
    el.scrollTo({ top: index * itemHeight, behavior: "smooth" });
  }, []);

  // Measure the first card to set the container height
  const [cardHeight, setCardHeight] = useState<number | null>(null);
  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const ro = new ResizeObserver((observedEntries) => {
        const h = observedEntries[0]?.borderBoxSize?.[0]?.blockSize
          ?? observedEntries[0]?.contentRect.height;
        if (h && h > 0) setCardHeight(h);
      });
      ro.observe(node);
      return () => ro.disconnect();
    }
  }, []);

  return (
    <div className="flex gap-2 items-center">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto snap-y snap-proximity rounded-xl [&_[data-slot=card]]:rounded-none [&_[data-slot=card]]:border-0 [&>div+div]:border-t [&>div+div]:border-border"
        style={{
          height: cardHeight ? `${cardHeight * 2}px` : "11rem",
          overscrollBehavior: "contain",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {entries.map((entry, i) => (
          <div
            key={entry.id}
            ref={i === 0 ? measuredRef : undefined}
            className="snap-start"
          >
            <LogEntryCard
              entry={entry}
              onEdit={onEdit}
              onDelete={onDelete}
              bibleApp={bibleApp}
              bibleVersion={bibleVersion}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center gap-1.5">
        {entries.map((entry, i) => (
          <button
            key={entry.id}
            onClick={() => scrollTo(i)}
            className={`w-1.5 rounded-full transition-all ${
              i === activeIndex
                ? "h-4 bg-primary"
                : "h-1.5 bg-muted-foreground/30"
            }`}
            aria-label={`Go to reading ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
