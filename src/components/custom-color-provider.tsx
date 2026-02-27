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

export const GRADIENT_STORAGE_KEY_LIGHT = "gradient-color-light";
export const GRADIENT_STORAGE_KEY_DARK = "gradient-color-dark";
export const GRADIENT_INTENSITY_KEY_LIGHT = "gradient-intensity-light";
export const GRADIENT_INTENSITY_KEY_DARK = "gradient-intensity-dark";

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

    // Apply gradient color and intensity from localStorage
    try {
      const gradientKey = isDark ? GRADIENT_STORAGE_KEY_DARK : GRADIENT_STORAGE_KEY_LIGHT;
      const stored = localStorage.getItem(gradientKey);
      if (isValidHsl(stored)) {
        root.style.setProperty("--gradient-color", stored);
      } else {
        root.style.removeProperty("--gradient-color");
      }

      const intensityKey = isDark ? GRADIENT_INTENSITY_KEY_DARK : GRADIENT_INTENSITY_KEY_LIGHT;
      const intensity = localStorage.getItem(intensityKey);
      if (intensity !== null && !isNaN(parseFloat(intensity))) {
        root.style.setProperty("--gradient-intensity", intensity);
      } else {
        root.style.removeProperty("--gradient-intensity");
      }
    } catch {
      // localStorage unavailable (SSR, private browsing)
    }

    // Cleanup: remove all custom properties when unmounting
    return () => {
      COLOR_PROPERTIES.forEach((prop) => {
        root.style.removeProperty(prop);
      });
      root.style.removeProperty("--gradient-color");
      root.style.removeProperty("--gradient-intensity");
    };
  }, [settings, resolvedTheme]);

  return null;
}
