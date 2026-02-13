"use client";

import { useState, useMemo } from "react";
import {
  format,
  parseISO,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  differenceInDays,
} from "date-fns";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLogEntries, useFilteredLogEntries } from "@/hooks/use-log-entries";
import { useDateVerseCounts } from "@/hooks/use-date-verse-counts";
import { useUserSettings } from "@/hooks/use-user-settings";
import Bible from "@/lib/bible/bible";
import { todayString } from "@/lib/bible/date-helpers";

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default function MetricsPage() {
  const { data: settings } = useUserSettings();
  const { data: allEntries = [], isLoading } = useLogEntries();
  const { data: filteredEntries = [] } = useFilteredLogEntries(settings?.look_back_date);
  const today = todayString();

  const lookBackDate = settings?.look_back_date || null;
  const [viewMode, setViewMode] = useState<"lookback" | "all">("lookback");

  const entries = viewMode === "lookback" && lookBackDate ? filteredEntries : allEntries;
  const verseCounts = useDateVerseCounts(entries);

  const dailyGoal = settings?.daily_verse_count_goal ?? 86;

  // Sorted dates with reading
  const sortedDates = useMemo(
    () => Object.keys(verseCounts).sort(),
    [verseCounts]
  );

  const dateRange = useMemo(() => {
    if (sortedDates.length === 0) return [];
    const start = parseISO(sortedDates[0]);
    const end = parseISO(today);
    return eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
  }, [sortedDates, today]);

  // 1. Daily verses data
  const dailyData = useMemo(
    () =>
      dateRange.map((date) => ({
        date,
        label: format(parseISO(date), "MMM d"),
        verses: verseCounts[date] || 0,
      })),
    [dateRange, verseCounts]
  );

  // 2. Cumulative data
  const cumulativeData = useMemo(() => {
    let running = 0;
    return dailyData.map((d) => {
      running += d.verses;
      return { ...d, cumulative: running };
    });
  }, [dailyData]);

  // 3. Weekly averages
  const weeklyData = useMemo(() => {
    if (dateRange.length === 0) return [];
    const weeks: Record<string, { total: number; days: number }> = {};
    for (const date of dateRange) {
      const d = parseISO(date);
      const weekStart = format(startOfWeek(d, { weekStartsOn: 0 }), "MMM d");
      if (!weeks[weekStart]) weeks[weekStart] = { total: 0, days: 0 };
      weeks[weekStart].total += verseCounts[date] || 0;
      weeks[weekStart].days += 1;
    }
    return Object.entries(weeks).map(([week, { total, days }]) => ({
      week,
      average: Math.round(total / days),
    }));
  }, [dateRange, verseCounts]);

  // 4. Monthly summaries
  const monthlyData = useMemo(() => {
    if (dateRange.length === 0) return [];
    const months: Record<string, number> = {};
    for (const date of dateRange) {
      const monthKey = format(parseISO(date), "MMM yyyy");
      months[monthKey] = (months[monthKey] || 0) + (verseCounts[date] || 0);
    }
    return Object.entries(months).map(([month, total]) => ({ month, total }));
  }, [dateRange, verseCounts]);

  // 5. Reading stats
  const readingStats = useMemo(() => {
    if (dateRange.length === 0)
      return { currentStreak: 0, longestStreak: 0, daysWithReading: 0, totalDays: 0, consistency: 0 };

    let currentStreak = 0;
    let longestStreak = 0;
    let streak = 0;
    let daysWithReading = 0;

    for (let i = dateRange.length - 1; i >= 0; i--) {
      const hasReading = (verseCounts[dateRange[i]] || 0) > 0;
      if (hasReading) daysWithReading++;
    }

    // Calculate streaks going forward
    for (const date of dateRange) {
      if ((verseCounts[date] || 0) > 0) {
        streak++;
        longestStreak = Math.max(longestStreak, streak);
      } else {
        streak = 0;
      }
    }

    // Current streak: count backwards from today
    currentStreak = 0;
    for (let i = dateRange.length - 1; i >= 0; i--) {
      if ((verseCounts[dateRange[i]] || 0) > 0) {
        currentStreak++;
      } else {
        break;
      }
    }

    const totalDays = dateRange.length;
    const consistency = totalDays > 0 ? Math.round((daysWithReading / totalDays) * 100) : 0;

    return { currentStreak, longestStreak, daysWithReading, totalDays, consistency };
  }, [dateRange, verseCounts]);

  const chartColor = "hsl(var(--primary))";
  const mutedColor = "hsl(var(--muted-foreground))";
  const goalColor = "hsl(var(--chart-1))";

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Metrics</h1>
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Metrics</h1>

      {/* View mode toggle */}
      {lookBackDate && (
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "lookback" | "all")}>
          <TabsList className="w-full">
            <TabsTrigger value="lookback" className="flex-1">
              Since {format(parseISO(lookBackDate), "MMM d, yyyy")}
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1">
              All Time
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Reading Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Reading Stats</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <StatRow label="Current Streak" value={`${readingStats.currentStreak} days`} />
          <StatRow label="Longest Streak" value={`${readingStats.longestStreak} days`} />
          <StatRow
            label="Days with Reading"
            value={`${readingStats.daysWithReading} of ${readingStats.totalDays}`}
          />
          <StatRow label="Consistency" value={`${readingStats.consistency}%`} />
        </CardContent>
      </Card>

      {/* Daily Verses Read */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Verses Read</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyData.length > 0 ? (
            <ResponsiveContainer key={viewMode} width="100%" height={250}>
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={mutedColor} opacity={0.2} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: mutedColor }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11, fill: mutedColor }} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: 12,
                  }}
                />
                <ReferenceLine y={dailyGoal} stroke={goalColor} strokeDasharray="4 4" label="" />
                <Area
                  type="monotone"
                  dataKey="verses"
                  stroke={chartColor}
                  fill={chartColor}
                  fillOpacity={0.1}
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">No reading data yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Cumulative Verses Read */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cumulative Verses Read</CardTitle>
        </CardHeader>
        <CardContent>
          {cumulativeData.length > 0 ? (
            <ResponsiveContainer key={viewMode} width="100%" height={250}>
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke={mutedColor} opacity={0.2} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: mutedColor }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11, fill: mutedColor }} tickLine={false} width={50} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke={chartColor}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">No reading data yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Weekly Average */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Weekly Average</CardTitle>
          <p className="text-xs text-muted-foreground">Average verses per day, by week</p>
        </CardHeader>
        <CardContent>
          {weeklyData.length > 0 ? (
            <ResponsiveContainer key={viewMode} width="100%" height={250}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={mutedColor} opacity={0.2} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: mutedColor }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11, fill: mutedColor }} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: 12,
                  }}
                />
                <ReferenceLine y={dailyGoal} stroke={goalColor} strokeDasharray="4 4" />
                <Bar dataKey="average" fill={chartColor} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">No reading data yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly Summary</CardTitle>
          <p className="text-xs text-muted-foreground">Total verses per month</p>
        </CardHeader>
        <CardContent>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer key={viewMode} width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={mutedColor} opacity={0.2} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: mutedColor }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11, fill: mutedColor }} tickLine={false} width={50} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="total" fill={chartColor} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">No reading data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
