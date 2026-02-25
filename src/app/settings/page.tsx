"use client";

import { useState } from "react";
import { format, addDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorPicker } from "@/components/color-picker";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/use-user-settings";
import { useLogEntries } from "@/hooks/use-log-entries";
import {
  BibleVersions,
  BibleApps,
  bibleVersionLabels,
  bibleAppLabels,
  type BibleVersion,
  type BibleApp,
} from "@/lib/bible/bible-apps";
import Bible from "@/lib/bible/bible";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Download } from "lucide-react";

// Inner component that initializes state from loaded settings
function SettingsForm({ settings }: { settings: NonNullable<ReturnType<typeof useUserSettings>["data"]> }) {
  const { data: logEntries = [] } = useLogEntries();
  const updateSettings = useUpdateUserSettings();
  const router = useRouter();

  const [dailyGoal, setDailyGoal] = useState(settings.daily_verse_count_goal);
  const [bibleVersion, setBibleVersion] = useState(settings.preferred_bible_version);
  const [bibleApp, setBibleApp] = useState(settings.preferred_bible_app);
  const [lookBackDate, setLookBackDate] = useState(settings.look_back_date || "");
  const [goalEndDate, setGoalEndDate] = useState(settings.goal_end_date || "");

  const [primaryLight, setPrimaryLight] = useState(settings.primary_light || "0 0% 9%");
  const [accentLight, setAccentLight] = useState(settings.accent_light || "0 0% 96.1%");
  const [chartLight, setChartLight] = useState(settings.chart_light || "12 76% 61%");
  const [primaryDark, setPrimaryDark] = useState(settings.primary_dark || "0 0% 98%");
  const [accentDark, setAccentDark] = useState(settings.accent_dark || "0 0% 14.9%");
  const [chartDark, setChartDark] = useState(settings.chart_dark || "220 70% 50%");

  const handleSaveReading = () => {
    updateSettings.mutate(
      {
        daily_verse_count_goal: dailyGoal,
        preferred_bible_version: bibleVersion,
        preferred_bible_app: bibleApp,
        look_back_date: lookBackDate || null,
        goal_end_date: goalEndDate || null,
      },
      {
        onSuccess: () => toast.success("Settings saved"),
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const handleSaveColors = () => {
    updateSettings.mutate(
      {
        primary_light: primaryLight,
        accent_light: accentLight,
        chart_light: chartLight,
        primary_dark: primaryDark,
        accent_dark: accentDark,
        chart_dark: chartDark,
      },
      {
        onSuccess: () => toast.success("Colors saved"),
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const handleExport = () => {
    if (logEntries.length === 0) {
      toast.error("No reading history to export");
      return;
    }

    try {
      // Sort entries by date
      const sortedEntries = [...logEntries].sort((a, b) => a.date.localeCompare(b.date));

      // Convert to CSV format
      const csvContent = sortedEntries
        .map((entry) => {
          const verseRange = Bible.displayVerseRange(entry.start_verse_id, entry.end_verse_id);
          return `${entry.date},${verseRange}`;
        })
        .join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().split("T")[0];

      link.setAttribute("href", url);
      link.setAttribute("download", `bible-reading-history-${timestamp}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${logEntries.length} entries`);
    } catch (error) {
      toast.error("Failed to export data");
      console.error(error);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Tabs defaultValue="reading" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reading">Reading</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="reading" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Goal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="dailyGoal">Verses per day</Label>
                <Input
                  id="dailyGoal"
                  type="number"
                  min={1}
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">
                  86 verses/day = read the whole Bible in 1 year
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bible Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Bible Version</Label>
                <Select value={bibleVersion} onValueChange={setBibleVersion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(BibleVersions).map((key) => (
                      <SelectItem key={key} value={key}>
                        {bibleVersionLabels[key as BibleVersion]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Bible App</Label>
                <Select value={bibleApp} onValueChange={setBibleApp}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(BibleApps).map((key) => (
                      <SelectItem key={key} value={key}>
                        {bibleAppLabels[key as BibleApp]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Look-Back Date</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="lookBackDate">Only count readings from</Label>
                <Input
                  id="lookBackDate"
                  type="date"
                  value={lookBackDate}
                  onChange={(e) => setLookBackDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Entries before this date will be excluded from progress
                  calculations. Leave empty to count all readings.
                </p>
                {lookBackDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit"
                    onClick={() => setLookBackDate("")}
                  >
                    Clear date
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reading Goal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="goalEndDate">Finish the Bible by</Label>
                <Input
                  id="goalEndDate"
                  type="date"
                  value={goalEndDate}
                  min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
                  onChange={(e) => setGoalEndDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Set a target date and your daily verse requirement will be
                  calculated automatically. View your plan status on the Today page.
                </p>
                {goalEndDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit"
                    onClick={() => setGoalEndDate("")}
                  >
                    Clear goal
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSaveReading} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </TabsContent>

        <TabsContent value="display" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Theme</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use the theme toggle in the navigation bar to switch between
                light and dark mode.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-semibold">Light Mode</p>
                <div className="space-y-3 pl-2">
                  <ColorPicker
                    label="Primary"
                    value={primaryLight}
                    onChange={setPrimaryLight}
                    defaultValue="0 0% 9%"
                  />
                  <ColorPicker
                    label="Accent"
                    value={accentLight}
                    onChange={setAccentLight}
                    defaultValue="0 0% 96.1%"
                  />
                  <ColorPicker
                    label="Charts & Goal Line"
                    value={chartLight}
                    onChange={setChartLight}
                    defaultValue="12 76% 61%"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">Dark Mode</p>
                <div className="space-y-3 pl-2">
                  <ColorPicker
                    label="Primary"
                    value={primaryDark}
                    onChange={setPrimaryDark}
                    defaultValue="0 0% 98%"
                  />
                  <ColorPicker
                    label="Accent"
                    value={accentDark}
                    onChange={setAccentDark}
                    defaultValue="0 0% 14.9%"
                  />
                  <ColorPicker
                    label="Charts & Goal Line"
                    value={chartDark}
                    onChange={setChartDark}
                    defaultValue="220 70% 50%"
                  />
                </div>
              </div>

              <Button onClick={handleSaveColors} disabled={updateSettings.isPending} className="w-full">
                {updateSettings.isPending ? "Saving..." : "Save Colors"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Install as App</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Add Bible to your home screen for a native app experience with offline access.
              </p>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold mb-2">iOS (iPhone/iPad)</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Open this page in Safari</li>
                    <li>Tap the Share button (square with arrow)</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
                    <li>Tap <strong>Add</strong> to confirm</li>
                  </ol>
                </div>

                <div>
                  <p className="font-semibold mb-2">Android</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Open this page in Chrome</li>
                    <li>Tap the menu (three dots)</li>
                    <li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong></li>
                    <li>Tap <strong>Add</strong> or <strong>Install</strong> to confirm</li>
                  </ol>
                </div>

                <div>
                  <p className="font-semibold mb-2">Desktop (Chrome/Edge)</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Look for the install icon in the address bar</li>
                    <li>Click <strong>Install</strong> or use the browser menu</li>
                    <li>The app will open in its own window</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold">Import</p>
                <p className="text-sm text-muted-foreground">
                  Import reading history from a CSV file.
                </p>
                <Button variant="outline" asChild>
                  <Link href="/settings/import">Import CSV</Link>
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Export</p>
                <p className="text-sm text-muted-foreground">
                  Export your reading history as a CSV file ({logEntries.length} entries).
                </p>
                <Button variant="outline" onClick={handleExport} disabled={logEntries.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleLogout}>
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useUserSettings();

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <p className="text-muted-foreground text-sm">No settings found.</p>
      </div>
    );
  }

  return <SettingsForm key={settings.id} settings={settings} />;
}
