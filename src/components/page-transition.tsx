"use client";

import {
  useRef,
  useEffect,
  useState,
  useLayoutEffect,
  useCallback,
} from "react";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";
import { getNavIndex } from "@/lib/nav-order";
import { useSwipeNavigation } from "@/hooks/use-swipe-navigation";
import { SettingsSheet } from "@/components/settings-sheet";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const segment = useSelectedLayoutSegment() ?? "__root";
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevSegmentRef = useRef(segment);
  const prevPathRef = useRef(pathname);
  const snapshotRef = useRef({ html: "", height: 0 });
  const swipedRef = useRef(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  useSwipeNavigation(containerRef, openSettings, swipedRef);

  // Close settings sheet on navigation
  useEffect(() => {
    setSettingsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Capture DOM snapshot after every commit (used for click-navigation exit clone)
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      snapshotRef.current = { html: el.innerHTML, height: el.offsetHeight };
    }
  });

  // Slide animation on segment change
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const container = containerRef.current;
    const prevSeg = prevSegmentRef.current;
    const prevPath = prevPathRef.current;

    // Always update refs
    prevSegmentRef.current = segment;
    prevPathRef.current = pathname;

    if (!wrapper || !container || segment === prevSeg) return;
    if (reducedMotion || pathname === "/login" || pathname === "/") return;

    const prevIndex = getNavIndex(prevPath);
    const nextIndex = getNavIndex(pathname);
    if (prevIndex === null || nextIndex === null || prevIndex === nextIndex)
      return;

    const direction = nextIndex > prevIndex ? 1 : -1;
    const wasSwipe = swipedRef.current;
    swipedRef.current = false;

    if (wasSwipe) {
      // --- SWIPE: enter-only animation (exit already happened in the hook) ---
      container.style.willChange = "transform";
      container.style.transition = "none";
      container.style.transform = `translateX(${direction * 100}%)`;

      container.getBoundingClientRect();

      container.style.transition = "transform 0.2s ease-out";
      container.style.transform = "translateX(0)";

      container.addEventListener(
        "transitionend",
        () => {
          container.style.transition = "";
          container.style.transform = "";
          container.style.willChange = "";
        },
        { once: true }
      );
    } else {
      // --- CLICK: dual-slide (old clone exits + new page enters simultaneously) ---
      const { html: oldHtml, height: oldHeight } = snapshotRef.current;
      const newHeight = container.offsetHeight;

      // Clone old page as a visual ghost
      const clone = document.createElement("div");
      clone.innerHTML = oldHtml;
      clone.setAttribute("aria-hidden", "true");
      clone.style.position = "absolute";
      clone.style.top = "0";
      clone.style.left = "0";
      clone.style.right = "0";
      clone.style.pointerEvents = "none";
      clone.style.willChange = "transform";
      clone.style.transform = "translateX(0)";

      // Lock wrapper during animation
      wrapper.style.overflow = "hidden";
      wrapper.style.height = `${Math.max(oldHeight, newHeight)}px`;

      // Position container off-screen on entry side
      container.style.position = "absolute";
      container.style.top = "0";
      container.style.left = "0";
      container.style.right = "0";
      container.style.willChange = "transform";
      container.style.transition = "none";
      container.style.transform = `translateX(${direction * 100}%)`;

      wrapper.appendChild(clone);
      container.getBoundingClientRect();

      // Animate both simultaneously
      const dur = "0.2s";
      clone.style.transition = `transform ${dur} ease-out`;
      clone.style.transform = `translateX(${-direction * 100}%)`;

      container.style.transition = `transform ${dur} ease-out`;
      container.style.transform = "translateX(0)";

      container.addEventListener(
        "transitionend",
        () => {
          container.style.position = "";
          container.style.top = "";
          container.style.left = "";
          container.style.right = "";
          container.style.transition = "";
          container.style.transform = "";
          container.style.willChange = "";
          wrapper.style.overflow = "";
          wrapper.style.height = "";
          clone.remove();
        },
        { once: true }
      );
    }
  }, [segment, pathname, reducedMotion]);

  return (
    <>
      <div ref={wrapperRef} style={{ position: "relative" }}>
        <div ref={containerRef} style={{ touchAction: "pan-y" }}>
          {children}
        </div>
      </div>
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
