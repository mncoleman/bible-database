"use client";

import { useEffect, useRef } from "react";
import type { TelegramAuthData } from "@/lib/telegram";

type Props = {
  botUsername: string;
  onAuth: (data: TelegramAuthData) => void | Promise<void>;
  size?: "small" | "medium" | "large";
  cornerRadius?: number;
  requestAccess?: boolean;
};

// Each mounted widget registers a unique global callback so multiple widgets
// on the same page (e.g. login + linking flows) don't clobber each other.
declare global {
  interface Window {
    [key: `__tgAuth_${string}`]: ((user: TelegramAuthData) => void) | undefined;
  }
}

let counter = 0;

export function TelegramLoginButton({
  botUsername,
  onAuth,
  size = "large",
  cornerRadius,
  requestAccess = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onAuthRef = useRef(onAuth);
  onAuthRef.current = onAuth;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !botUsername) return;

    const id = `${Date.now().toString(36)}_${counter++}`;
    const callbackName = `__tgAuth_${id}` as const;
    window[callbackName] = (user) => {
      void onAuthRef.current(user);
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", size);
    script.setAttribute("data-onauth", `${callbackName}(user)`);
    script.setAttribute("data-userpic", "true");
    if (typeof cornerRadius === "number") {
      script.setAttribute("data-radius", String(cornerRadius));
    }
    if (requestAccess) {
      script.setAttribute("data-request-access", "write");
    }

    container.appendChild(script);

    return () => {
      container.innerHTML = "";
      delete window[callbackName];
    };
  }, [botUsername, size, cornerRadius, requestAccess]);

  if (!botUsername) return null;

  return <div ref={containerRef} />;
}
