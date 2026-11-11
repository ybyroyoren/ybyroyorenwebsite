"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { flush, track, trackingEnabled } from "@/lib/analytics/client";

const IDLE_MS = 30_000;

function clickInfo(target: EventTarget | null): { label: string; kind: string; href?: string } | null {
  const el = (target as HTMLElement | null)?.closest?.("a, button, [data-track], summary, [role='button']") as HTMLElement | null;
  if (!el) return null;
  const explicit = el.getAttribute("data-track");
  const text = (explicit || el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (!text) return null;
  const anchor = el.closest("a") as HTMLAnchorElement | null;
  const href = anchor?.getAttribute("href") ?? undefined;
  let kind = el.tagName === "A" ? "link" : "button";
  if (href?.startsWith("tel:")) kind = "phone";
  else if (href?.startsWith("mailto:")) kind = "email";
  else if (anchor && anchor.host && anchor.host !== window.location.host) kind = "outbound";
  return { label: text, kind, href: href && !href.startsWith("http") ? href.split("?")[0] : href ? new URL(href).host : undefined };
}

/**
 * Collects anonymous usage data for the owner's dashboard (admin → site statistics):
 * page views, time on page, scroll depth, clicks, and JS errors. The shop / meals /
 * events funnels are tracked from the components that own those flows.
 */
export function Analytics() {
  const pathname = usePathname();
  const state = useRef({
    path: "",
    active: 0,
    scroll: 0,
    lastActivity: 0,
    errors: 0,
    first: true,
  });

  // Page views + the "page leave" summary of the page being left.
  useEffect(() => {
    if (!trackingEnabled()) return;
    const s = state.current;
    const leave = () => {
      if (!s.path) return;
      track("page_leave", { scroll: Math.round(s.scroll) }, { value: s.active, path: s.path });
    };
    leave();
    s.path = pathname;
    s.active = 0;
    s.scroll = 0;
    s.lastActivity = Date.now();
    // A short page can already be fully on screen without any scrolling.
    const initial = window.setTimeout(() => {
      const doc = document.documentElement;
      s.scroll = Math.max(s.scroll, Math.min(100, ((window.scrollY + window.innerHeight) / Math.max(doc.scrollHeight, 1)) * 100));
    }, 800);

    const params = new URLSearchParams(window.location.search);
    const external = document.referrer && new URL(document.referrer).host !== window.location.host;
    track(
      "pageview",
      undefined,
      s.first
        ? {
            path: pathname,
            ref: external ? new URL(document.referrer).host : undefined,
            utm: {
              source: params.get("utm_source") ?? undefined,
              medium: params.get("utm_medium") ?? undefined,
              campaign: params.get("utm_campaign") ?? undefined,
            },
          }
        : { path: pathname }
    );
    s.first = false;
    return () => window.clearTimeout(initial);
  }, [pathname]);

  // Time on page (visible AND recently active), scroll depth, clicks, errors, and flush on exit.
  useEffect(() => {
    if (!trackingEnabled()) return;
    const s = state.current;

    const touch = () => {
      s.lastActivity = Date.now();
    };
    const tick = window.setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - s.lastActivity < IDLE_MS) s.active += 1000;
    }, 1000);

    let scrollFrame: number | null = null;
    const onScroll = () => {
      touch();
      if (scrollFrame !== null) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = null;
        const doc = document.documentElement;
        const total = Math.max(doc.scrollHeight, 1);
        s.scroll = Math.max(s.scroll, Math.min(100, ((window.scrollY + window.innerHeight) / total) * 100));
      });
    };

    const onClick = (e: MouseEvent) => {
      touch();
      const info = clickInfo(e.target);
      if (info) track("click", { label: info.label, kind: info.kind, href: info.href });
    };

    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      if (s.path) track("page_leave", { scroll: Math.round(s.scroll) }, { value: s.active, path: s.path });
      flush(true);
    };

    const onError = (message: string) => {
      if (s.errors >= 5) return;
      s.errors += 1;
      track("js_error", { message: message.slice(0, 160) });
    };
    const onWindowError = (e: ErrorEvent) => onError(e.message || "error");
    const onRejection = (e: PromiseRejectionEvent) => onError(String((e.reason && e.reason.message) || e.reason || "rejection"));

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", touch, { passive: true });
    window.addEventListener("keydown", touch);
    window.addEventListener("touchstart", touch, { passive: true });
    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", () => flush(true));
    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", touch);
      window.removeEventListener("keydown", touch);
      window.removeEventListener("touchstart", touch);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
