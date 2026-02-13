"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { LogEntry } from "@/lib/supabase/types";
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

  const totalReadVerses = Bible.countUniqueRangeVerses(
    allEntries.map((e) => ({
      startVerseId: e.start_verse_id,
      endVerseId: e.end_verse_id,
    }))
  );
  const totalVerses = Bible.getTotalVerseCount();
  const overallProgress = (totalReadVerses / totalVerses) * 100;

  const handleCreate = (entry: {
    date: string;
    start_verse_id: number;
    end_verse_id: number;
  }) => {
    createEntry.mutate(entry, {
      onSuccess: () => {
        setFormOpen(false);
        toast.success("Reading logged");
      },
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
    updateEntry.mutate(
      { id: editingEntry.id, ...entry },
      {
        onSuccess: () => {
          setEditingEntry(null);
          toast.success("Reading updated");
        },
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
      onSuccess: () => toast.success("Reading deleted"),
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
            {todayVerseCount} / {dailyGoal} verses
          </span>
        </div>
        <Progress value={dailyProgress} />
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
        <Progress value={overallProgress} />
      </div>

      {/* Suggested Reading */}
      <ReadingSuggestions
        entries={allEntries}
        bibleApp={(settings?.preferred_bible_app as BibleApp) || "BIBLEGATEWAY"}
        bibleVersion={(settings?.preferred_bible_version as BibleVersion) || "NASB2020"}
        onLog={handleLogSuggestion}
      />

      {/* Today's entries */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Today&apos;s Readings</h2>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : todayEntries.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No readings logged today. Tap &quot;Log Reading&quot; to get started.
          </p>
        ) : (
          todayEntries.map((entry) => (
            <LogEntryCard
              key={entry.id}
              entry={entry}
              onEdit={(e) => setEditingEntry(e)}
              onDelete={handleDelete}
              bibleApp={(settings?.preferred_bible_app as BibleApp) || "BIBLEGATEWAY"}
              bibleVersion={(settings?.preferred_bible_version as BibleVersion) || "NASB2020"}
            />
          ))
        )}
      </div>

      <LogEntryForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setPrefillValues(undefined);
        }}
        onSubmit={handleCreate}
        initialValues={prefillValues}
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
        isLoading={updateEntry.isPending}
      />
    </div>
  );
}
