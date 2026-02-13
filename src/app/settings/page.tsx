"use client";

import { useState, useEffect } from "react";
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
import { useUserSettings, useUpdateUserSettings } from "@/hooks/use-user-settings";
import {
  BibleVersions,
  BibleApps,
  bibleVersionLabels,
  bibleAppLabels,
  type BibleVersion,
  type BibleApp,
} from "@/lib/bible/bible-apps";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: settings, isLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const router = useRouter();

  const [dailyGoal, setDailyGoal] = useState(86);
  const [bibleVersion, setBibleVersion] = useState<string>("NASB2020");
  const [bibleApp, setBibleApp] = useState<string>("BIBLEGATEWAY");

  useEffect(() => {
    if (settings) {
      setDailyGoal(settings.daily_verse_count_goal);
      setBibleVersion(settings.preferred_bible_version);
      setBibleApp(settings.preferred_bible_app);
    }
  }, [settings]);

  const handleSaveReading = () => {
    updateSettings.mutate(
      {
        daily_verse_count_goal: dailyGoal,
        preferred_bible_version: bibleVersion,
        preferred_bible_app: bibleApp,
      },
      {
        onSuccess: () => toast.success("Settings saved"),
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

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
        </TabsContent>

        <TabsContent value="account" className="space-y-4 mt-4">
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
