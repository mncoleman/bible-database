"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  useLogEntries,
  useLogEntriesByDate,
  useCreateLogEntry,
  useUpdateLogEntry,
  useDeleteLogEntry,
} from "@/hooks/use-log-entries";
import { useDateVerseCounts } from "@/hooks/use-date-verse-counts";
import { useUserSettings } from "@/hooks/use-user-settings";
import Bible from "@/lib/bible/bible";
import { LogEntryCard } from "@/components/bible/log-entry-card";
import { LogEntryForm } from "@/components/forms/log-entry-form";
import type { LogEntry } from "@/lib/supabase/types";
import type { BibleApp, BibleVersion } from "@/lib/bible/bible-apps";
import { toast } from "sonner";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    format(new Date(), "yyyy-MM-dd")
  );

  const { data: entries = [] } = useLogEntries();
  const { data: settings } = useUserSettings();
  const verseCounts = useDateVerseCounts(entries);
  const dailyGoal = settings?.daily_verse_count_goal ?? 86;

  const { data: selectedDateEntries = [] } = useLogEntriesByDate(
    selectedDate || ""
  );

  const createEntry = useCreateLogEntry();
  const updateEntry = useUpdateLogEntry();
  const deleteEntry = useDeleteLogEntry();

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);

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
      onError: (error) => toast.error(error.message),
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
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteEntry.mutate(id, {
      onSuccess: () => toast.success("Reading deleted"),
      onError: (error) => toast.error(error.message),
    });
  };

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const startPadding = getDay(monthStart);
    const paddedDays: (Date | null)[] = Array(startPadding).fill(null);
    paddedDays.push(...allDays);

    while (paddedDays.length % 7 !== 0) {
      paddedDays.push(null);
    }

    return paddedDays;
  }, [currentMonth]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Calendar</h1>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs text-muted-foreground font-medium py-2"
          >
            {day}
          </div>
        ))}
        {days.map((day, i) => {
          if (!day) {
            return <div key={`pad-${i}`} />;
          }
          const dateStr = format(day, "yyyy-MM-dd");
          const count = verseCounts[dateStr] || 0;
          const isSelected = selectedDate === dateStr;
          const goalMet = count >= dailyGoal;
          const hasReading = count > 0;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={cn(
                "relative flex flex-col items-center justify-center p-1 rounded-md text-sm transition-colors min-h-[40px]",
                !isSameMonth(day, currentMonth) && "text-muted-foreground/50",
                isSelected && "bg-accent ring-1 ring-ring",
                isToday(day) && !isSelected && "font-bold",
                !isSelected && "hover:bg-accent/50"
              )}
            >
              <span>{format(day, "d")}</span>
              {hasReading && (
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full mt-0.5",
                    goalMet ? "bg-primary" : "bg-primary/40"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date detail */}
      {selectedDate && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">
              {format(new Date(selectedDate + "T00:00:00"), "EEEE, MMMM d, yyyy")}
            </h3>
            <Button
              size="sm"
              onClick={() => setFormOpen(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Log
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {verseCounts[selectedDate] || 0} verses read
            {dailyGoal > 0 && ` / ${dailyGoal} goal`}
          </p>
          {selectedDateEntries.length > 0 ? (
            <div className="space-y-2">
              {selectedDateEntries.map((entry) => (
                <LogEntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={(e) => setEditingEntry(e)}
                  onDelete={handleDelete}
                  bibleApp={(settings?.preferred_bible_app as BibleApp) || "BIBLEGATEWAY"}
                  bibleVersion={(settings?.preferred_bible_version as BibleVersion) || "NASB2020"}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No readings on this date.
            </p>
          )}
        </Card>
      )}

      <LogEntryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        initialValues={
          selectedDate
            ? { date: selectedDate, start_verse_id: 0, end_verse_id: 0 }
            : undefined
        }
        hideDate
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
