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

  // --- Supabase REST API: stale-while-revalidate for reads ---
  // This is the key optimization: show cached data instantly, refresh in background
  {
    matcher: ({ url }: { url: URL }) =>
      url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/rest/"),
    method: "GET" as const,
    handler: new StaleWhileRevalidate({
      cacheName: "supabase-rest",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
          maxAgeFrom: "last-used" as const,
        }),
      ],
    }),
  },

  // --- Auth: always network (never cache auth) ---
  {
    matcher: /\/api\/auth\/.*/,
    handler: new NetworkOnly({
      networkTimeoutSeconds: 10,
    }),
  },
  {
    matcher: ({ url }: { url: URL }) =>
      url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/auth/"),
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
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        }),
      ],
    }),
  },
  // HTML pages
  {
    matcher: ({ request, url: { pathname }, sameOrigin }: { request: Request; url: URL; sameOrigin: boolean }) =>
      request.headers.get("Content-Type")?.includes("text/html") &&
      sameOrigin &&
      !pathname.startsWith("/api/"),
    handler: new StaleWhileRevalidate({
      cacheName: PAGES_CACHE_NAME.html,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        }),
      ],
    }),
  },

  // --- Same-origin catch-all ---
  {
    matcher: ({ url: { pathname }, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
      sameOrigin && !pathname.startsWith("/api/"),
    handler: new StaleWhileRevalidate({
      cacheName: "others",
      plugins: [
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

// Warm-cache the app shell on activation so the 3 primary pages load instantly
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES_CACHE_NAME.html);
      await Promise.allSettled(
        APP_SHELL_URLS.map((url) =>
          cache.add(url).catch(() => {
            // Silently ignore — page will be cached on first visit instead
          })
        )
      );
    })()
  );
});

// Clear Supabase cached data on logout to prevent data leaking to next user
self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_AUTH_CACHE") {
    caches.delete("supabase-rest");
  }
});

serwist.addEventListeners();
