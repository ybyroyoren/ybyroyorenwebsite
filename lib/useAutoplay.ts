"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { FocusEvent, PointerEvent } from "react";
import { motionAllowed } from "@/lib/motion";

export const AUTOPLAY_MS = 4000;

/**
 * Calls `advance` every `intervalMs` — but only when nobody is interacting
 * with, or unable to see, the thing it moves. It holds off while:
 *   - a mouse hovers it or keyboard focus is inside it;
 *   - a finger is on it (and for one interval after it lifts, so a page
 *     scroll that happened to start on it doesn't leave it frozen for long);
 *   - it's off-screen or the tab is hidden;
 *   - the visitor asked for less motion (OS setting or the widget);
 *   - `isBusy()` says so (e.g. a slide animation is running or the visitor
 *     paused it with the pause button).
 * Spread `handlers` on the element that `rootRef` is attached to.
 */
export function useAutoplay({
  enabled,
  intervalMs = AUTOPLAY_MS,
  initialDelayMs,
  advance,
  isBusy,
}: {
  enabled: boolean;
  intervalMs?: number;
  /** First tick delay; lets several instances on one page start out of step. */
  initialDelayMs?: number;
  advance: () => void;
  isBusy?: () => boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  const touchingRef = useRef(false);
  const inViewRef = useRef(true);
  const pausedUntilRef = useRef(0);
  const advanceRef = useRef(advance);
  const busyRef = useRef(isBusy);

  useEffect(() => {
    advanceRef.current = advance;
    busyRef.current = isBusy;
  });

  useEffect(() => {
    if (!enabled) return;

    const root = rootRef.current;
    let io: IntersectionObserver | undefined;
    if (root && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(([entry]) => {
        inViewRef.current = entry.isIntersecting;
      });
      io.observe(root);
    }

    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const paused =
        hoverRef.current ||
        focusRef.current ||
        touchingRef.current ||
        document.hidden ||
        !inViewRef.current ||
        performance.now() < pausedUntilRef.current ||
        !motionAllowed() ||
        (busyRef.current?.() ?? false);
      if (!paused) advanceRef.current();
      timer = setTimeout(tick, intervalMs);
    };
    timer = setTimeout(tick, initialDelayMs ?? intervalMs);

    return () => {
      clearTimeout(timer);
      io?.disconnect();
    };
  }, [enabled, intervalMs, initialDelayMs]);

  /** Hold off for `ms` — call after a manual action so the slideshow doesn't move right away. */
  const pauseFor = useCallback((ms: number) => {
    pausedUntilRef.current = Math.max(pausedUntilRef.current, performance.now() + ms);
  }, []);

  const handlers = useMemo(() => {
    const touchEnd = () => {
      touchingRef.current = false;
      pausedUntilRef.current = Math.max(pausedUntilRef.current, performance.now() + intervalMs);
    };
    return {
      onPointerEnter: (e: PointerEvent) => {
        if (e.pointerType === "mouse") hoverRef.current = true;
      },
      onPointerLeave: (e: PointerEvent) => {
        if (e.pointerType === "mouse") hoverRef.current = false;
      },
      onFocus: (e: FocusEvent) => {
        if (e.target.matches(":focus-visible")) focusRef.current = true;
      },
      onBlur: () => {
        focusRef.current = false;
      },
      onTouchStart: () => {
        touchingRef.current = true;
      },
      onTouchEnd: touchEnd,
      onTouchCancel: touchEnd,
    };
  }, [intervalMs]);

  return { rootRef, handlers, pauseFor };
}
