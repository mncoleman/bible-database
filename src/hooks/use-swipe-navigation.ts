"use client";

import { useEffect, useRef, type RefObject } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSwipeIndex, SWIPE_ROUTES } from "@/lib/nav-order";

const DEADZONE = 10; // px before direction lock
const THRESHOLD_RATIO = 0.3; // 30% of viewport width
const VELOCITY_THRESHOLD = 500; // px/s
const EDGE_DAMPENING = 0.3;
const SLIDE_MS = 200;

export function useSwipeNavigation(
  containerRef: RefObject<HTMLDivElement | null>,
  onSwipePastEnd?: () => void,
  swipedRef?: RefObject<boolean>
) {
  const router = useRouter();
  const pathname = usePathname();
  const callbackRef = useRef(onSwipePastEnd);
  callbackRef.current = onSwipePastEnd;
  const stateRef = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    locked: "h" | "v" | null;
    navigating: boolean;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Only enable swipe on pages in SWIPE_ROUTES
    if (getSwipeIndex(pathname) === null) return;

    let aborted = false;

    const shouldBail = (): boolean =>
      !!(
        document.querySelector('[data-state="open"][role="dialog"]') ||
        document.querySelector('[data-state="open"][role="listbox"]')
      );

    const snapBack = () => {
      el.style.transition = `transform ${SLIDE_MS}ms ease-out`;
      el.style.transform = "translateX(0)";
      el.addEventListener(
        "transitionend",
        () => {
          if (aborted) return;
          el.style.transition = "";
          el.style.transform = "";
          el.style.willChange = "";
          stateRef.current = null;
        },
        { once: true }
      );
    };

    const onTouchStart = (e: TouchEvent) => {
      if (stateRef.current?.navigating) return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" &&
        (target as HTMLInputElement).type === "range"
      )
        return;
      if (shouldBail()) return;

      const touch = e.touches[0];
      stateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        locked: null,
        navigating: false,
      };
      el.style.willChange = "transform";
    };

    const onTouchMove = (e: TouchEvent) => {
      const state = stateRef.current;
      if (!state || state.navigating) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;

      // Direction lock: wait for deadzone, then commit
      if (!state.locked) {
        if (Math.abs(deltaX) < DEADZONE && Math.abs(deltaY) < DEADZONE)
          return;
        state.locked = Math.abs(deltaX) >= Math.abs(deltaY) ? "h" : "v";
      }
      if (state.locked !== "h") return;

      const idx = getSwipeIndex(pathname)!;

      // Rubber-band at edges (including past-end for settings trigger)
      const atEdge =
        (deltaX > 0 && idx === 0) ||
        (deltaX < 0 && idx === SWIPE_ROUTES.length - 1);

      const tx = atEdge ? deltaX * EDGE_DAMPENING : deltaX;
      el.style.transition = "none";
      el.style.transform = `translateX(${tx}px)`;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const state = stateRef.current;
      if (!state || state.navigating) return;

      if (state.locked !== "h") {
        stateRef.current = null;
        el.style.willChange = "";
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - state.startX;
      const elapsed = Date.now() - state.startTime;
      const velocity = Math.abs(deltaX) / (elapsed / 1000);
      const vw = window.innerWidth;
      const idx = getSwipeIndex(pathname)!;

      const targetIdx = deltaX < 0 ? idx + 1 : idx - 1;
      const pastThreshold =
        Math.abs(deltaX) > vw * THRESHOLD_RATIO ||
        velocity > VELOCITY_THRESHOLD;

      if (targetIdx >= 0 && targetIdx < SWIPE_ROUTES.length && pastThreshold) {
        // Animate old page off-screen, then navigate
        state.navigating = true;
        const dir = deltaX < 0 ? -1 : 1;
        el.style.transition = `transform ${SLIDE_MS}ms ease-out`;
        el.style.transform = `translateX(${dir * 100}vw)`;

        el.addEventListener(
          "transitionend",
          () => {
            if (aborted) return;
            el.style.willChange = "";
            // Signal to PageTransition that this was a swipe (enter-only, no clone exit)
            if (swipedRef) swipedRef.current = true;
            router.push(SWIPE_ROUTES[targetIdx]);
            stateRef.current = null;
          },
          { once: true }
        );
      } else if (
        targetIdx >= SWIPE_ROUTES.length &&
        pastThreshold &&
        callbackRef.current
      ) {
        // Swiped past end: snap back and open settings sheet
        snapBack();
        callbackRef.current();
      } else {
        snapBack();
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      aborted = true;
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      // Only reset if a non-navigating swipe was in progress
      if (stateRef.current && !stateRef.current.navigating) {
        el.style.transition = "";
        el.style.transform = "";
        el.style.willChange = "";
      }
      stateRef.current = null;
    };
  }, [containerRef, pathname, router]);
}
