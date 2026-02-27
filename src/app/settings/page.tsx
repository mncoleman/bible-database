"use client";

import { SettingsForm } from "@/components/settings-form";
import { useUserSettings } from "@/hooks/use-user-settings";

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
