"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLogEntries, useLogEntriesByDate } from "@/hooks/use-log-entries";
import { useDateVerseCounts } from "@/hooks/use-date-verse-counts";
import { useUserSettings } from "@/hooks/use-user-settings";
import Bible from "@/lib/bible/bible";
import { LogEntryCard } from "@/components/bible/log-entry-card";
import type { BibleApp, BibleVersion } from "@/lib/bible/bible-apps";

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

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Pad start to align to Sunday
    const startPadding = getDay(monthStart);
    const paddedDays: (Date | null)[] = Array(startPadding).fill(null);
    paddedDays.push(...allDays);

    // Pad end to complete week
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
          <h3 className="font-semibold mb-2">
            {format(new Date(selectedDate + "T00:00:00"), "EEEE, MMMM d, yyyy")}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            {verseCounts[selectedDate] || 0} verses read
            {dailyGoal > 0 && ` / ${dailyGoal} goal`}
          </p>
          {selectedDateEntries.length > 0 ? (
            <div className="space-y-2">
              {selectedDateEntries.map((entry) => (
                <div key={entry.id} className="text-sm">
                  {Bible.displayVerseRange(
                    entry.start_verse_id,
                    entry.end_verse_id
                  )}{" "}
                  <span className="text-muted-foreground">
                    ({Bible.countRangeVerses(entry.start_verse_id, entry.end_verse_id)} verses)
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No readings on this date.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
