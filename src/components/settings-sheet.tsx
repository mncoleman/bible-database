"use client";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SettingsForm } from "@/components/settings-form";
import { useUserSettings } from "@/hooks/use-user-settings";

export function SettingsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: settings, isLoading } = useUserSettings();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto p-0"
      >
        <SheetTitle className="sr-only">Settings</SheetTitle>
        <SheetDescription className="sr-only">
          App settings and preferences
        </SheetDescription>
        <div className="p-6">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : settings ? (
            <SettingsForm key={settings.id} settings={settings} />
          ) : (
            <p className="text-muted-foreground text-sm">
              No settings found.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
