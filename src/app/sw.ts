import { PAGES_CACHE_NAME } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

// Never cache responses that were followed from a redirect (e.g. the auth
// proxy redirecting a protected page like /today to /login). Without this,
// the StaleWhileRevalidate caches on navigations would store the /login HTML
// under the /today key, permanently sending signed-in users back to /login.
const skipRedirectedPlugin = {
  cacheWillUpdate: async ({ response }: { response: Response }) => {
    if (!response || response.redirected) return null;
    if (response.status < 200 || response.status >= 300) return null;
    return response;
  },
};

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Primary pages to warm-cache on SW activation for instant loads
const APP_SHELL_URLS = ["/today", "/checklist", "/progress"];

const runtimeCaching = [
  // --- Static assets: cache-first (content-hashed, safe to cache indefinitely) ---
  {
    matcher: /\/_next\/static.+\.js$/i,
    handler: new CacheFirst({
      cacheName: "next-static-js-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          maxAgeFrom: "last-used" as const,
        }),
      ],
    }),
  },
  {
    matcher: /\.(?:js)$/i,
    handler: new CacheFirst({
      cacheName: "static-js-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 48,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          maxAgeFrom: "last-used" as const,
        }),
      ],
    }),
  },
  {
    matcher: /\.(?:css|less)$/i,
    handler: new CacheFirst({
      cacheName: "static-style-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          maxAgeFrom: "last-used" as const,
        }),
      ],
    }),
  },
  {
    matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
    handler: new CacheFirst({
      cacheName: "static-image-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          maxAgeFrom: "last-used" as const,
        }),
      ],
    }),
  },
  {
    matcher: /\.(?:eot|otf|ttc|ttf|woff|woff2|font\.css)$/i,
    handler: new CacheFirst({
      cacheName: "static-font-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 4,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          maxAgeFrom: "last-used" as const,
        }),
      ],
    }),
  },
  {
    matcher: /\/_next\/image\?url=.+$/i,
    handler: new StaleWhileRevalidate({
      cacheName: "next-image",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60,
          maxAgeFrom: "last-used" as const,
        }),
      ],
    }),
  },

  // --- Google Fonts ---
  {
    matcher: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
    handler: new CacheFirst({
      cacheName: "google-fonts-webfonts",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60,
          maxAgeFrom: "last-used" as const,
        }),
      ],
    }),
  },
  {
    matcher: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
    handler: new StaleWhileRevalidate({
      cacheName: "google-fonts-stylesheets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60,
          maxAgeFrom: "last-used" as const,
        }),
      ],
    }),
  },

  // --- Supabase REST API: network-first for reads ---
  // Must be NetworkFirst (not StaleWhileRevalidate) so that after mutations,
  // React Query refetches always get fresh server data. SWR would return stale
  // cached data instantly, causing optimistic updates to revert.
  //
  // CRITICAL: match on the /rest/ pathname, NOT a `*.supabase.co` hostname.
  // Supabase is reverse-proxied SAME-ORIGIN under bible.mncoleman.com, so these
  // requests have hostname bible.mncoleman.com and a `.supabase.co` check never
  // matches — the request then falls through to the same-origin SWR catch-all
  // ("others"), which is exactly the staleness bug this rule exists to prevent.
  {
    matcher: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
      (sameOrigin || url.hostname.endsWith(".supabase.co")) &&
      url.pathname.startsWith("/rest/"),
    method: "GET" as const,
    handler: new NetworkFirst({
      cacheName: "supabase-rest",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
          maxAgeFrom: "last-used" as const,
        }),
      ],
      networkTimeoutSeconds: 5,
    }),
  },

  // --- Auth + realtime + storage + functions: always network, never cache ---
  // Same-origin matching for the reverse-proxied Supabase paths (see REST note
  // above) — a `.supabase.co` hostname check would never match in production.
  {
    matcher: /\/api\/auth\/.*/,
    handler: new NetworkOnly({
      networkTimeoutSeconds: 10,
    }),
  },
  {
    matcher: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
      (sameOrigin || url.hostname.endsWith(".supabase.co")) &&
      /^\/(auth|realtime|storage|functions)\//.test(url.pathname),
    handler: new NetworkOnly({
      networkTimeoutSeconds: 10,
    }),
  },

  // --- Same-origin API routes ---
  {
    matcher: ({ sameOrigin, url: { pathname } }: { sameOrigin: boolean; url: URL }) =>
      sameOrigin && pathname.startsWith("/api/"),
    method: "GET" as const,
    handler: new StaleWhileRevalidate({
      cacheName: "apis",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 16,
          maxAgeSeconds: 24 * 60 * 60,
          maxAgeFrom: "last-used" as const,
        }),
      ],
    }),
  },

  // --- Pages: stale-while-revalidate for instant navigation ---
  // RSC prefetch responses
  {
    matcher: ({ request, url: { pathname }, sameOrigin }: { request: Request; url: URL; sameOrigin: boolean }) =>
      request.headers.get("RSC") === "1" &&
      request.headers.get("Next-Router-Prefetch") === "1" &&
      sameOrigin &&
      !pathname.startsWith("/api/"),
    handler: new StaleWhileRevalidate({
      cacheName: PAGES_CACHE_NAME.rscPrefetch,
      plugins: [
        skipRedirectedPlugin,
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        }),
      ],
    }),
  },
  // RSC responses
  {
    matcher: ({ request, url: { pathname }, sameOrigin }: { request: Request; url: URL; sameOrigin: boolean }) =>
      request.headers.get("RSC") === "1" && sameOrigin && !pathname.startsWith("/api/"),
    handler: new StaleWhileRevalidate({
      cacheName: PAGES_CACHE_NAME.rsc,
      plugins: [
        skipRedirectedPlugin,
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        }),
      ],
    }),
  },
  // HTML page navigations — use request.destination which is reliably set on
  // navigation requests (Accept header is also fine; Content-Type is NOT set
  // on GET navigations so the previous check never matched).
  {
    matcher: ({ request, url: { pathname }, sameOrigin }: { request: Request; url: URL; sameOrigin: boolean }) =>
      request.destination === "document" &&
      sameOrigin &&
      !pathname.startsWith("/api/"),
    handler: new NetworkFirst({
      cacheName: PAGES_CACHE_NAME.html,
      networkTimeoutSeconds: 5,
      plugins: [
        skipRedirectedPlugin,
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        }),
      ],
    }),
  },

  // --- Same-origin catch-all ---
  // Explicitly exclude the reverse-proxied Supabase API prefixes so that a
  // future reordering can never let /rest/, /auth/, etc. fall through to
  // StaleWhileRevalidate and reintroduce the data-staleness bug.
  {
    matcher: ({ url: { pathname }, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
      sameOrigin &&
      !pathname.startsWith("/api/") &&
      !/^\/(rest|auth|realtime|storage|functions)\//.test(pathname),
    handler: new StaleWhileRevalidate({
      cacheName: "others",
      plugins: [
        skipRedirectedPlugin,
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        }),
      ],
    }),
  },

  // --- Supabase catch-all: never cache other Supabase endpoints ---
  {
    matcher: ({ url }: { url: URL }) => url.hostname.endsWith(".supabase.co"),
    handler: new NetworkOnly({
      networkTimeoutSeconds: 10,
    }),
  },

  // --- Cross-origin catch-all ---
  {
    matcher: ({ sameOrigin }: { sameOrigin: boolean }) => !sameOrigin,
    handler: new NetworkFirst({
      cacheName: "cross-origin",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 60 * 60, // 1 hour
        }),
      ],
      networkTimeoutSeconds: 10,
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

// Warm-cache the app shell on activation so the 3 primary pages load instantly.
//
// CRITICAL: we MUST NOT use cache.add() here. cache.add fetches with the
// default redirect: "follow" mode, and cache.put accepts followed redirects.
// If the SW activates while the user is unauthenticated (very common for a
// freshly-installed PWA opened from the Home Screen), the auth proxy
// redirects /today -> /login and cache.add would happily store the /login
// HTML keyed under /today. The user then signs in, navigates to /today,
// and gets the cached /login HTML back — an infinite sign-in redirect loop.
//
// Instead, fetch manually and only cache the response if it is a real 2xx
// response that was NOT followed from a redirect.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES_CACHE_NAME.html);
      await Promise.allSettled(
        APP_SHELL_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { redirect: "follow" });
            if (response.ok && !response.redirected) {
              await cache.put(url, response);
            }
          } catch {
            // Silently ignore — page will be cached on first visit instead
          }
        })
      );
    })()
  );
});

// Clear Supabase cached data on logout to prevent data leaking to next user
self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_AUTH_CACHE") {
    // supabase-rest now actually holds the user's REST data (post same-origin
    // matcher fix). Also clear "others" so any user-specific same-origin GET
    // cached there before the fix can't leak to the next user on this device.
    Promise.all([caches.delete("supabase-rest"), caches.delete("others")]);
  }
  // Called on successful sign-in to drop any navigation/page caches that
  // were populated while the user was unauthenticated. Without this, a
  // pre-signin cache entry for a protected page could serve the /login
  // HTML back to the now-authenticated user, creating a redirect loop.
  if (event.data?.type === "CLEAR_PAGE_CACHES") {
    Promise.all([
      caches.delete("others"),
      caches.delete(PAGES_CACHE_NAME.html),
      caches.delete(PAGES_CACHE_NAME.rsc),
      caches.delete(PAGES_CACHE_NAME.rscPrefetch),
    ]);
  }
});

serwist.addEventListeners();
