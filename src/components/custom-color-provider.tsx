"use client";

import { useEffect } from "react";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useTheme } from "next-themes";

const COLOR_PROPERTIES = ["--primary", "--accent", "--chart-1"] as const;

// Validate HSL format to prevent CSS injection
function isValidHsl(value: string | null): value is string {
  if (!value) return false;
  const match = value.trim().match(/^(\d{1,3}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%$/);
  if (!match) return false;
  const [, h, s, l] = match.map(Number);
  return h >= 0 && h <= 360 && s >= 0 && s <= 100 && l >= 0 && l <= 100;
}

export function CustomColorProvider() {
  const { data: settings } = useUserSettings();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!settings) return;

    const root = document.documentElement;
    const isDark = resolvedTheme === "dark";

    const colors = isDark
      ? [settings.primary_dark, settings.accent_dark, settings.chart_dark]
      : [settings.primary_light, settings.accent_light, settings.chart_light];

    // Apply or remove each custom property (with validation)
    COLOR_PROPERTIES.forEach((prop, i) => {
      if (isValidHsl(colors[i])) {
        root.style.setProperty(prop, colors[i]);
      } else {
        root.style.removeProperty(prop);
      }
    });

    return () => {
      COLOR_PROPERTIES.forEach((prop) => {
        root.style.removeProperty(prop);
      });
    };
  }, [settings, resolvedTheme]);

  return null;
}
