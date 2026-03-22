"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function BeamsBackground() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!mounted) return null;

  const bg = isDark
    ? "radial-gradient(ellipse 120% 80% at 50% 0%, hsl(220 50% 12%) 0%, hsl(230 30% 6%) 60%, hsl(0 0% 3%) 100%)"
    : "radial-gradient(ellipse 120% 80% at 50% 0%, hsl(217 30% 90%) 0%, hsl(217 15% 96%) 60%, hsl(0 0% 97%) 100%)";

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: -1,
        background: bg,
      }}
      aria-hidden="true"
    />
  );
}
