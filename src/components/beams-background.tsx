"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

export function BeamsBackground() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const bg = isDark
    ? "radial-gradient(ellipse 120% 80% at 50% 0%, hsl(150 40% 12%) 0%, hsl(145 30% 6%) 60%, hsl(0 0% 3%) 100%)"
    : "radial-gradient(ellipse 120% 80% at 50% 0%, hsl(140 30% 90%) 0%, hsl(140 15% 96%) 60%, hsl(0 0% 97%) 100%)";

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
