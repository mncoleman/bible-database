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

  if (!mounted || !isDark) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: -1,
        background:
          "radial-gradient(ellipse 120% 80% at 50% 0%, hsl(220 50% 12%) 0%, hsl(230 30% 6%) 60%, hsl(0 0% 3%) 100%)",
      }}
      aria-hidden="true"
    />
  );
}
