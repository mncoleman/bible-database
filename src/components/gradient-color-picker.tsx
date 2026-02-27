"use client";

import { useState, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import {
  GRADIENT_STORAGE_KEY_LIGHT,
  GRADIENT_STORAGE_KEY_DARK,
  GRADIENT_INTENSITY_KEY_LIGHT,
  GRADIENT_INTENSITY_KEY_DARK,
} from "@/components/custom-color-provider";

const COLOR_DEFAULTS = {
  light: "217 90% 61%",
  dark: "217 80% 55%",
} as const;

const INTENSITY_DEFAULT = "0.15";

function hslToHex(hsl: string): string {
  const [h, s, l] = hsl.split(" ").map((v) => parseFloat(v));
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function getStoredColor(mode: "light" | "dark"): string {
  const key = mode === "light" ? GRADIENT_STORAGE_KEY_LIGHT : GRADIENT_STORAGE_KEY_DARK;
  try { return localStorage.getItem(key) || COLOR_DEFAULTS[mode]; }
  catch { return COLOR_DEFAULTS[mode]; }
}

function getStoredIntensity(mode: "light" | "dark"): string {
  const key = mode === "light" ? GRADIENT_INTENSITY_KEY_LIGHT : GRADIENT_INTENSITY_KEY_DARK;
  try { return localStorage.getItem(key) || INTENSITY_DEFAULT; }
  catch { return INTENSITY_DEFAULT; }
}

export function GradientColorPicker({ mode }: { mode: "light" | "dark" }) {
  const [color, setColor] = useState(() => getStoredColor(mode));
  const [intensity, setIntensity] = useState(() => getStoredIntensity(mode));

  const applyColor = useCallback((hsl: string) => {
    setColor(hsl);
    const key = mode === "light" ? GRADIENT_STORAGE_KEY_LIGHT : GRADIENT_STORAGE_KEY_DARK;
    try { localStorage.setItem(key, hsl); } catch {}
    document.documentElement.style.setProperty("--gradient-color", hsl);
  }, [mode]);

  const applyIntensity = useCallback((val: string) => {
    setIntensity(val);
    const key = mode === "light" ? GRADIENT_INTENSITY_KEY_LIGHT : GRADIENT_INTENSITY_KEY_DARK;
    try { localStorage.setItem(key, val); } catch {}
    document.documentElement.style.setProperty("--gradient-intensity", val);
  }, [mode]);

  const handleReset = () => {
    applyColor(COLOR_DEFAULTS[mode]);
    applyIntensity(INTENSITY_DEFAULT);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm capitalize">{mode} Mode</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={hslToHex(color)}
            onChange={(e) => applyColor(hexToHsl(e.target.value))}
            className="h-9 w-16 rounded border border-input cursor-pointer"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="h-9 w-9"
            title="Reset to default"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-3 pl-1">
        <Label className="text-xs text-muted-foreground shrink-0 w-16">Brightness</Label>
        <input
          type="range"
          min="0"
          max="0.40"
          step="0.01"
          value={intensity}
          onChange={(e) => applyIntensity(e.target.value)}
          className="flex-1 h-2 accent-primary cursor-pointer"
        />
        <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
          {Math.round(parseFloat(intensity) * 100)}%
        </span>
      </div>
    </div>
  );
}
