"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";

// Detect PWA standalone mode without setState-in-effect
function subscribePWA() {
  return () => {};
}

function getIsPWA() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function getIsPWAServer() {
  return false;
}

// Only show splash during a cold start — if the page is already loaded, skip it
function getIsLoading() {
  if (typeof document === "undefined") return true;
  return document.readyState !== "complete";
}

export function PwaSplash() {
  const isPWA = useSyncExternalStore(subscribePWA, getIsPWA, getIsPWAServer);
  const [showSplash] = useState(() => isPWA && getIsLoading());
  const [phase, setPhase] = useState<"visible" | "fading" | "hidden">("visible");

  useEffect(() => {
    if (!showSplash) return;

    // Wait for the page to finish loading, then fade out
    function dismiss() {
      setPhase("fading");
      setTimeout(() => setPhase("hidden"), 300);
    }

    if (document.readyState === "complete") {
      dismiss();
      return;
    }

    window.addEventListener("load", dismiss, { once: true });
    return () => window.removeEventListener("load", dismiss);
  }, [showSplash]);

  if (!showSplash || phase === "hidden") return null;

  return (
    <div
      className={`
        fixed inset-0 z-[100] bg-background flex items-center justify-center
        transition-opacity duration-300
        ${phase === "fading" ? "opacity-0" : "opacity-100"}
      `}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="animate-pulse">
          <Image
            src="/logo-light.svg"
            alt="Bible Logo"
            width={80}
            height={80}
            className="dark:hidden"
            priority
          />
          <Image
            src="/logo-dark.svg"
            alt="Bible Logo"
            width={80}
            height={80}
            className="hidden dark:block"
            priority
          />
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
