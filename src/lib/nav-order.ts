export const NAV_ROUTES = [
  "/today",
  "/books",
  "/checklist",
  "/calendar",
  "/progress",
  "/metrics",
  "/settings",
] as const;

/** Routes accessible via swipe on mobile (bottom nav pages) */
export const SWIPE_ROUTES = ["/today", "/checklist", "/progress"] as const;

const NAV_ORDER: Record<string, number> = Object.fromEntries(
  NAV_ROUTES.map((route, i) => [route, i])
);

const SWIPE_ORDER: Record<string, number> = Object.fromEntries(
  SWIPE_ROUTES.map((route, i) => [route, i])
);

function matchIndex(pathname: string, order: Record<string, number>): number | null {
  if (order[pathname] !== undefined) return order[pathname];
  const firstSegment = "/" + pathname.split("/").filter(Boolean)[0];
  return order[firstSegment] ?? null;
}

export function getNavIndex(pathname: string): number | null {
  return matchIndex(pathname, NAV_ORDER);
}

export function getSwipeIndex(pathname: string): number | null {
  return matchIndex(pathname, SWIPE_ORDER);
}
