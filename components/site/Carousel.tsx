"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/lib/media";
import { getDict, type Locale } from "@/lib/dictionary";
import { motionAllowed } from "@/lib/motion";
import { PlayPauseIcon } from "./PlayPauseIcon";
import { AUTOPLAY_MS, useAutoplay } from "@/lib/useAutoplay";
import styles from "./Carousel.module.css";

const SLIDE_MS = 800;
const FALLBACK_STEP_PX = 260;

const INSTANT = "instant" as ScrollBehavior;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Scrolls `track` so `child`'s start edge aligns with the track's own start
 * edge. Computed from live getBoundingClientRect deltas rather than
 * scrollIntoView (unreliable here) or a raw scrollLeft value (whose sign
 * convention flips across browsers in RTL) — this stays correct regardless
 * of either.
 */
function alignChildToStart(track: HTMLElement, child: HTMLElement, behavior: ScrollBehavior) {
  const delta = child.getBoundingClientRect().left - track.getBoundingClientRect().left;
  track.scrollBy({ left: delta, behavior });
}

// Only used in loop mode, where exactly one slide is meant to occupy the
// full track width at a time — picks whichever child's center is closest to
// the track's center. (Deliberately not "most overlapping": that ties
// whenever the scroll position is imprecisely between two slides, which
// picking the closest center avoids.)
function findActiveChild(track: HTMLElement): HTMLElement | null {
  const containerRect = track.getBoundingClientRect();
  const containerCenter = (containerRect.left + containerRect.right) / 2;
  let best: HTMLElement | null = null;
  let bestDist = Infinity;
  for (const child of Array.from(track.children)) {
    const r = (child as HTMLElement).getBoundingClientRect();
    const dist = Math.abs((r.left + r.right) / 2 - containerCenter);
    if (dist < bestDist) {
      bestDist = dist;
      best = child as HTMLElement;
    }
  }
  return best;
}

export function Carousel({
  images,
  narrow,
  single,
  locale = "he",
  autoplay = true,
}: {
  images: MediaItem[];
  narrow?: boolean;
  single?: boolean;
  locale?: Locale;
  /** Advance on its own every few seconds (still fully manual too). */
  autoplay?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const t = getDict(locale).common;

  // Clone-based infinite looping relies on exactly one slide being visible
  // at a time to unambiguously detect "which slide is active" — true for
  // `single` (the home page carousel), not for the narrow/default variants
  // that show several slides per screen at once (meals/events/about), where
  // that detection would tie and misfire. Those scroll through their slides
  // and wind back to the start instead.
  const loop = single === true && images.length > 1;
  const slides = loop ? [images[images.length - 1], ...images, images[0]] : images;

  const animRef = useRef<number | null>(null);
  const animatingRef = useRef(false);
  const touchingRef = useRef(false);
  const userPausedRef = useRef(false);
  const [userPaused, setUserPaused] = useState(false);
  const [active, setActive] = useState(0);

  const syncActive = useCallback(() => {
    const track = trackRef.current;
    if (!track || !loop) return;
    const children = Array.from(track.children);
    const current = findActiveChild(track);
    if (!current) return;
    const idx = children.indexOf(current);
    const n = images.length;
    setActive(idx === 0 ? n - 1 : idx === children.length - 1 ? 0 : idx - 1);
  }, [loop, images.length]);

  /**
   * Once a move has come to rest: if it landed on a clone slide, hop
   * (invisibly — it's the same picture) to its real twin at the other end, and
   * make sure the slide sits exactly on the track edge. Runs only after
   * scrolling has stopped; jumping while the browser is still flinging or
   * snapping leaves the slide a few pixels off.
   */
  const settle = useCallback(() => {
    const track = trackRef.current;
    if (!track || !loop) return;
    const children = Array.from(track.children) as HTMLElement[];
    const current = findActiveChild(track);
    if (!current) return;
    const idx = children.indexOf(current);
    let target = current;
    if (idx === 0) target = children[images.length];
    else if (idx === children.length - 1) target = children[1];
    if (Math.abs(target.getBoundingClientRect().left - track.getBoundingClientRect().left) >= 1) {
      alignChildToStart(track, target, INSTANT);
    }
    syncActive();
  }, [loop, images.length, syncActive]);

  const stopAnimation = useCallback(() => {
    const track = trackRef.current;
    if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    animRef.current = null;
    if (animatingRef.current && track) {
      track.style.scrollSnapType = "";
      track.style.scrollBehavior = "";
    }
    animatingRef.current = false;
  }, []);

  /**
   * Scrolls by `delta` px (same units as scrollLeft, whatever its RTL sign
   * convention) over `duration` ms with an ease-in-out curve. The browser's
   * own smooth scrolling is a short, linear-ish ramp; this reads as a proper
   * slide. Scroll-snap and CSS smooth-scroll are switched off while it runs
   * so they don't fight the animation, then restored (and the browser snaps
   * to the exact slide edge).
   */
  const animateBy = useCallback(
    (delta: number, duration = SLIDE_MS) => {
      const track = trackRef.current;
      if (!track || delta === 0) return;
      stopAnimation();

      if (!motionAllowed()) {
        track.scrollBy({ left: delta, behavior: INSTANT });
        settle();
        return;
      }

      const start = track.scrollLeft;
      const t0 = performance.now();
      animatingRef.current = true;
      track.style.scrollSnapType = "none";
      track.style.scrollBehavior = "auto";

      const frame = (now: number) => {
        const progress = Math.min(1, (now - t0) / duration);
        track.scrollLeft = start + delta * easeInOutCubic(progress);
        if (progress < 1) {
          animRef.current = requestAnimationFrame(frame);
          return;
        }
        animRef.current = null;
        animatingRef.current = false;
        track.style.scrollSnapType = "";
        track.style.scrollBehavior = "";
        settle();
      };
      animRef.current = requestAnimationFrame(frame);
    },
    [settle, stopAnimation]
  );

  /** Width of one slide plus the gap — how far one "next" moves the multi-slide variants. */
  const slideStep = useCallback((): number => {
    const track = trackRef.current;
    const first = track?.children[0] as HTMLElement | undefined;
    const second = track?.children[1] as HTMLElement | undefined;
    if (!first || !second) return FALLBACK_STEP_PX;
    return Math.abs(second.getBoundingClientRect().left - first.getBoundingClientRect().left) || FALLBACK_STEP_PX;
  }, []);

  /** Loop mode: move to the slide at DOM index `idx`. */
  const goToChild = useCallback(
    (idx: number) => {
      const track = trackRef.current;
      const child = track?.children[idx] as HTMLElement | undefined;
      if (!track || !child) return;
      animateBy(child.getBoundingClientRect().left - track.getBoundingClientRect().left);
    },
    [animateBy]
  );

  // Position on the first real slide (skipping the leading clone) once, on mount.
  useEffect(() => {
    if (!loop) return;
    const track = trackRef.current;
    const firstReal = track?.children[1] as HTMLElement | undefined;
    if (track && firstReal) alignChildToStart(track, firstReal, INSTANT);
  }, [loop]);

  // Swipes: when scrolling stops (no scroll event for a moment, and no finger
  // down), settle(). Animated moves call settle() themselves when they finish.
  useEffect(() => {
    if (!loop) return;
    const track = trackRef.current;
    if (!track) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (delay: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (animatingRef.current || touchingRef.current) return;
        settle();
      }, delay);
    };
    const onScroll = () => schedule(140);
    const onTouchEnd = () => {
      touchingRef.current = false;
      schedule(200);
    };
    const onTouchStart = () => {
      touchingRef.current = true;
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    track.addEventListener("touchstart", onTouchStart, { passive: true });
    track.addEventListener("touchend", onTouchEnd, { passive: true });
    track.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      clearTimeout(timer);
      track.removeEventListener("scroll", onScroll);
      track.removeEventListener("touchstart", onTouchStart);
      track.removeEventListener("touchend", onTouchEnd);
      track.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [loop, settle]);

  // Keep the dots in step with swipes (throttled to one update per frame).
  useEffect(() => {
    if (!loop) return;
    const track = trackRef.current;
    if (!track) return;
    let frame: number | null = null;
    const onScroll = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        syncActive();
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    syncActive();
    return () => {
      track.removeEventListener("scroll", onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [loop, syncActive]);

  /** prev = -1, next = +1 (the buttons' wiring; the multi-slide variants keep their original direction). */
  const move = useCallback(
    (direction: 1 | -1) => {
      const track = trackRef.current;
      if (!track) return;

      if (!loop) {
        animateBy(direction * slideStep());
        return;
      }

      const children = Array.from(track.children) as HTMLElement[];
      const current = findActiveChild(track);
      const currentIdx = current ? children.indexOf(current) : 1;
      let target = currentIdx + direction;
      if (target < 0) target = children.length - 2;
      if (target > children.length - 1) target = 1;
      goToChild(target);
    },
    [loop, animateBy, slideStep, goToChild]
  );

  /** One automatic step: loop mode goes to the next image; the others scroll a slide and wind back at the end. */
  const advance = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    if (loop) return move(1);

    const maxScroll = track.scrollWidth - track.clientWidth;
    if (maxScroll <= 2) return; // everything already fits — nothing to scroll
    if (Math.abs(track.scrollLeft) >= maxScroll - 2) {
      animateBy(-track.scrollLeft, 1100); // back to the start
      return;
    }
    const towardEnd = getComputedStyle(track).direction === "rtl" ? -1 : 1;
    animateBy(towardEnd * slideStep());
  }, [loop, move, animateBy, slideStep]);

  const { rootRef, handlers, pauseFor } = useAutoplay({
    enabled: autoplay && images.length > 1,
    advance,
    isBusy: () => animatingRef.current || userPausedRef.current,
  });

  useEffect(() => stopAnimation, [stopAnimation]);

  if (images.length === 0) return null;

  function onButton(direction: 1 | -1) {
    pauseFor(AUTOPLAY_MS * 1.5);
    move(direction);
  }

  // WCAG 2.2.2: moving content that runs for more than 5 seconds needs a
  // visible way to pause it.
  function toggleAutoplay() {
    userPausedRef.current = !userPausedRef.current;
    setUserPaused(userPausedRef.current);
  }

  /** The visitor grabbed the track (wheel / mouse): stop any running slide and leave them alone for a while. */
  function onUserTakeover() {
    stopAnimation();
    pauseFor(AUTOPLAY_MS * 1.5);
  }

  return (
    <div ref={rootRef} className={`${styles.carousel} ${single ? styles.carouselSingle : ""}`} {...handlers}>
      <div
        className={`${styles.track} ${single ? styles.trackSingle : ""}`}
        ref={trackRef}
        onTouchStart={stopAnimation}
        onWheel={onUserTakeover}
        onPointerDown={(e) => {
          if (e.pointerType !== "touch") onUserTakeover();
        }}
      >
        {slides.map((img, i) => (
          <div
            key={`${img.id}-${i}`}
            className={`${styles.slide} ${single ? styles.slideSingle : narrow ? styles.slideNarrow : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button type="button" className={`${styles.nav} ${styles.prev}`} onClick={() => onButton(-1)} aria-label={t.prev}>
            ‹
          </button>
          <button type="button" className={`${styles.nav} ${styles.next}`} onClick={() => onButton(1)} aria-label={t.next}>
            ›
          </button>
        </>
      )}
      {autoplay && images.length > 1 && (
        <button
          type="button"
          className={styles.playToggle}
          onClick={toggleAutoplay}
          aria-label={userPaused ? t.playSlides : t.pauseSlides}
          aria-pressed={userPaused}
        >
          <PlayPauseIcon playing={!userPaused} />
        </button>
      )}
      {loop && (
        <div className={styles.dots}>
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className={`${styles.dot} ${i === active ? styles.dotActive : ""}`}
              aria-label={`${i + 1} / ${images.length}`}
              aria-current={i === active}
              onClick={() => {
                pauseFor(AUTOPLAY_MS * 1.5);
                goToChild(i + 1);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
