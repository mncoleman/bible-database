"use client";

import { useState, useRef, useCallback } from "react";
import { format, addDays, differenceInDays, parseISO } from "date-fns";
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
import {
  useTelegramIdentity,
  useUnlinkTelegram,
} from "@/hooks/use-telegram-identity";

export function SettingsForm({ settings }: { settings: NonNullable<ReturnType<typeof useUserSettings>["data"]> }) {
  const { data: logEntries = [] } = useLogEntries();
  const updateSettings = useUpdateUserSettings();
  const router = useRouter();

  const [dailyGoal, setDailyGoal] = useState(settings.daily_verse_count_goal);
  const [bibleVersion, setBibleVersion] = useState(settings.preferred_bible_version);
  const [bibleApp, setBibleApp] = useState(settings.preferred_bible_app);
  const [lookBackDate, setLookBackDate] = useState(settings.look_back_date || "");
  const [goalEndDate, setGoalEndDate] = useState(settings.goal_end_date || "");

  const TOTAL_VERSES = 31102;

  const computeDailyGoal = useCallback((startDate: string, endDate: string) => {
    if (!startDate || !endDate) return null;
    const days = differenceInDays(parseISO(endDate), parseISO(startDate));
    if (days <= 0) return null;
    return Math.ceil(TOTAL_VERSES / days);
  }, []);

  const { data: telegramIdentity, isLoading: telegramLoading } = useTelegramIdentity();
  const unlinkTelegram = useUnlinkTelegram();

  const handleTelegramUnlink = async () => {
    try {
      await unlinkTelegram.mutateAsync();
      toast.success("Telegram account unlinked");
    } catch {
      toast.error("Failed to unlink Telegram account");
    }
  };

  const [primaryLight, setPrimaryLight] = useState(settings.primary_light || "0 0% 9%");
  const [accentLight, setAccentLight] = useState(settings.accent_light || "0 0% 96.1%");
  const [chartLight, setChartLight] = useState(settings.chart_light || "12 76% 61%");
  const [primaryDark, setPrimaryDark] = useState(settings.primary_dark || "0 0% 98%");
  const [accentDark, setAccentDark] = useState(settings.accent_dark || "0 0% 14.9%");
  const [chartDark, setChartDark] = useState(settings.chart_dark || "220 70% 50%");

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const autosave = useCallback((patch: Record<string, unknown>) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateSettings.mutate(patch, {
        onError: (error) => toast.error(error.message),
      });
    }, 600);
  }, [updateSettings]);

  const handleExport = () => {
    if (logEntries.length === 0) {
      toast.error("No reading history to export");
      return;
    }

    try {
      const sortedEntries = [...logEntries].sort((a, b) => a.date.localeCompare(b.date));
      const csvContent = sortedEntries
        .map((entry) => {
          const verseRange = Bible.displayVerseRange(entry.start_verse_id, entry.end_verse_id);
          return `${entry.date},${verseRange}`;
        })
        .join("\n");

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
    } catch {
      toast.error("Failed to export data");
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Clear cached Supabase data so it doesn't leak to the next user
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_AUTH_CACHE" });
    }
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
              <CardTitle className="text-base">Reading Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="dailyGoal">Verses per day</Label>
                <Input
                  id="dailyGoal"
                  type="number"
                  min={1}
                  max={31102}
                  value={dailyGoal}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(31102, parseInt(e.target.value) || 1));
                    setDailyGoal(v);
                    autosave({ daily_verse_count_goal: v });
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  86 verses/day = read the whole Bible in 1 year
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lookBackDate">Start date</Label>
                <div className="px-1">
                  <Input
                    id="lookBackDate"
                    type="date"
                    value={lookBackDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setLookBackDate(newDate);
                      const computed = computeDailyGoal(newDate, goalEndDate);
                      if (computed) {
                        setDailyGoal(computed);
                        autosave({ look_back_date: newDate || null, daily_verse_count_goal: computed });
                      } else {
                        autosave({ look_back_date: newDate || null });
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Entries before this date are excluded from progress calculations.
                </p>
                {lookBackDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit"
                    onClick={() => {
                      setLookBackDate("");
                      autosave({ look_back_date: null });
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="goalEndDate">End date</Label>
                <div className="px-1">
                  <Input
                    id="goalEndDate"
                    type="date"
                    value={goalEndDate}
                    min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setGoalEndDate(newDate);
                      const computed = computeDailyGoal(lookBackDate, newDate);
                      if (computed) {
                        setDailyGoal(computed);
                        autosave({ goal_end_date: newDate || null, daily_verse_count_goal: computed });
                      } else {
                        autosave({ goal_end_date: newDate || null });
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your daily verse requirement is calculated from your plan dates.
                </p>
                {goalEndDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit"
                    onClick={() => {
                      setGoalEndDate("");
                      autosave({ goal_end_date: null });
                    }}
                  >
                    Clear
                  </Button>
                )}
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
                <Select value={bibleVersion} onValueChange={(v) => {
                  setBibleVersion(v);
                  autosave({ preferred_bible_version: v });
                }}>
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
                <Select value={bibleApp} onValueChange={(v) => {
                  setBibleApp(v);
                  autosave({ preferred_bible_app: v });
                }}>
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
                    onChange={(v) => { setPrimaryLight(v); autosave({ primary_light: v }); }}
                    defaultValue="0 0% 9%"
                  />
                  <ColorPicker
                    label="Accent"
                    value={accentLight}
                    onChange={(v) => { setAccentLight(v); autosave({ accent_light: v }); }}
                    defaultValue="0 0% 96.1%"
                  />
                  <ColorPicker
                    label="Charts & Goal Line"
                    value={chartLight}
                    onChange={(v) => { setChartLight(v); autosave({ chart_light: v }); }}
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
                    onChange={(v) => { setPrimaryDark(v); autosave({ primary_dark: v }); }}
                    defaultValue="0 0% 98%"
                  />
                  <ColorPicker
                    label="Accent"
                    value={accentDark}
                    onChange={(v) => { setAccentDark(v); autosave({ accent_dark: v }); }}
                    defaultValue="0 0% 14.9%"
                  />
                  <ColorPicker
                    label="Charts & Goal Line"
                    value={chartDark}
                    onChange={(v) => { setChartDark(v); autosave({ chart_dark: v }); }}
                    defaultValue="220 70% 50%"
                  />
                </div>
              </div>

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Install as App</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Add Bible Tracker to your home screen for a native app experience with offline access.
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
              <CardTitle className="text-base">Telegram</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {telegramLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : telegramIdentity ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Linked as{" "}
                    <span className="text-foreground font-medium">
                      {telegramIdentity.telegram_username
                        ? `@${telegramIdentity.telegram_username}`
                        : telegramIdentity.first_name}
                    </span>
                    . You can sign in with Telegram from the login screen.
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleTelegramUnlink}
                    disabled={unlinkTelegram.isPending}
                  >
                    {unlinkTelegram.isPending ? "Unlinking..." : "Unlink Telegram"}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Link your Telegram account to sign in with one tap.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/api/auth/telegram/start?link=1&next=/settings">
                      Link Telegram
                    </Link>
                  </Button>
                </>
              )}
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
