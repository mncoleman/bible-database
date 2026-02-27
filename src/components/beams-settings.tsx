"use client";

import { useState, useCallback, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { BEAMS_DEFAULTS } from "@/components/beams-background";
import type { UserSettings } from "@/lib/supabase/types";

type Autosave = (patch: Partial<UserSettings>) => void;

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step, onChange }: SliderRowProps) {
  return (
    <div className="flex items-center gap-3">
      <Label className="text-sm text-muted-foreground shrink-0 w-28">{label}</Label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-2 accent-primary cursor-pointer"
      />
      <span className="text-sm text-muted-foreground w-12 text-right tabular-nums">
        {value}
      </span>
    </div>
  );
}

/** Per-theme color picker for beam light color */
export function BeamsColorPicker({
  mode,
  value,
  autosave,
}: {
  mode: "light" | "dark";
  value: string;
  autosave: Autosave;
}) {
  const field = mode === "light" ? "beam_color_light" : "beam_color_dark";
  const defaultColor = mode === "light" ? BEAMS_DEFAULTS.colorLight : BEAMS_DEFAULTS.colorDark;
  const [color, setColor] = useState(value);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const debouncedSave = useCallback((hex: string) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      autosave({ [field]: hex });
    }, 300);
  }, [autosave, field]);

  const updateColor = useCallback((hex: string) => {
    setColor(hex);
    debouncedSave(hex);
  }, [debouncedSave]);

  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm capitalize">{mode} Mode</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => updateColor(e.target.value)}
          className="h-9 w-16 rounded border border-input cursor-pointer"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => updateColor(defaultColor)}
          className="h-9 w-9"
          title="Reset to default"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** Global beam parameter sliders (shared across themes) */
export function BeamsSliders({
  settings,
  autosave,
}: {
  settings: {
    beam_width: number | null;
    beam_height: number | null;
    beam_count: number | null;
    beam_speed: number | null;
    beam_noise_intensity: number | null;
    beam_noise_scale: number | null;
    beam_rotation: number | null;
  };
  autosave: Autosave;
}) {
  const [width, setWidth] = useState(settings.beam_width ?? BEAMS_DEFAULTS.width);
  const [height, setHeight] = useState(settings.beam_height ?? BEAMS_DEFAULTS.height);
  const [count, setCount] = useState(settings.beam_count ?? BEAMS_DEFAULTS.count);
  const [speed, setSpeed] = useState(settings.beam_speed ?? BEAMS_DEFAULTS.speed);
  const [noiseIntensity, setNoiseIntensity] = useState(settings.beam_noise_intensity ?? BEAMS_DEFAULTS.noiseIntensity);
  const [noiseScale, setNoiseScale] = useState(settings.beam_noise_scale ?? BEAMS_DEFAULTS.noiseScale);
  const [rotation, setRotation] = useState(settings.beam_rotation ?? BEAMS_DEFAULTS.rotation);

  const update = useCallback((field: keyof UserSettings, setter: (v: number) => void) => (v: number) => {
    setter(v);
    autosave({ [field]: v });
  }, [autosave]);

  const handleReset = () => {
    setWidth(BEAMS_DEFAULTS.width);
    setHeight(BEAMS_DEFAULTS.height);
    setCount(BEAMS_DEFAULTS.count);
    setSpeed(BEAMS_DEFAULTS.speed);
    setNoiseIntensity(BEAMS_DEFAULTS.noiseIntensity);
    setNoiseScale(BEAMS_DEFAULTS.noiseScale);
    setRotation(BEAMS_DEFAULTS.rotation);
    autosave({
      beam_width: BEAMS_DEFAULTS.width,
      beam_height: BEAMS_DEFAULTS.height,
      beam_count: BEAMS_DEFAULTS.count,
      beam_speed: BEAMS_DEFAULTS.speed,
      beam_noise_intensity: BEAMS_DEFAULTS.noiseIntensity,
      beam_noise_scale: BEAMS_DEFAULTS.noiseScale,
      beam_rotation: BEAMS_DEFAULTS.rotation,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Beam Parameters</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleReset}
          className="h-9 w-9"
          title="Reset all to defaults"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      <SliderRow label="Beam Width" value={width} min={0.5} max={10} step={0.5} onChange={update("beam_width", setWidth)} />
      <SliderRow label="Beam Height" value={height} min={5} max={60} step={1} onChange={update("beam_height", setHeight)} />
      <SliderRow label="Beam Count" value={count} min={1} max={40} step={1} onChange={update("beam_count", setCount)} />
      <SliderRow label="Speed" value={speed} min={0.1} max={10} step={0.1} onChange={update("beam_speed", setSpeed)} />
      <SliderRow label="Noise Intensity" value={noiseIntensity} min={0} max={5} step={0.25} onChange={update("beam_noise_intensity", setNoiseIntensity)} />
      <SliderRow label="Noise Scale" value={noiseScale} min={0.01} max={1} step={0.01} onChange={update("beam_noise_scale", setNoiseScale)} />
      <SliderRow label="Rotation" value={rotation} min={-180} max={180} step={1} onChange={update("beam_rotation", setRotation)} />
    </div>
  );
}
