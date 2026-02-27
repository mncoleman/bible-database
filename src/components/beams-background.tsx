"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useUserSettings } from "@/hooks/use-user-settings";

const Beams = dynamic(() => import("@/components/Beams"), { ssr: false });

export const BEAMS_DEFAULTS = {
  colorLight: "#4287f5",
  colorDark: "#4287f5",
  width: 3,
  height: 30,
  count: 20,
  speed: 2,
  noiseIntensity: 1.75,
  noiseScale: 0.2,
  rotation: 30,
} as const;

export function BeamsBackground() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { data: settings } = useUserSettings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isDark) return null;

  const color = isDark
    ? (settings?.beam_color_dark ?? BEAMS_DEFAULTS.colorDark)
    : (settings?.beam_color_light ?? BEAMS_DEFAULTS.colorLight);

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    >
      <Beams
        beamWidth={settings?.beam_width ?? BEAMS_DEFAULTS.width}
        beamHeight={settings?.beam_height ?? BEAMS_DEFAULTS.height}
        beamNumber={settings?.beam_count ?? BEAMS_DEFAULTS.count}
        lightColor={color}
        speed={settings?.beam_speed ?? BEAMS_DEFAULTS.speed}
        noiseIntensity={settings?.beam_noise_intensity ?? BEAMS_DEFAULTS.noiseIntensity}
        scale={settings?.beam_noise_scale ?? BEAMS_DEFAULTS.noiseScale}
        rotation={settings?.beam_rotation ?? BEAMS_DEFAULTS.rotation}
        backgroundColor="transparent"
      />
    </div>
  );
}
