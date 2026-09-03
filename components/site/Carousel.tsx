"use client";

import { useEffect, useRef } from "react";
import type { MediaItem } from "@/lib/media";
import { getDict, type Locale } from "@/lib/dictionary";
import styles from "./Carousel.module.css";

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
}: {
  images: MediaItem[];
  narrow?: boolean;
  single?: boolean;
  locale?: Locale;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const t = getDict(locale).common;
  // Clone-based infinite looping relies on exactly one slide being visible
  // at a time to unambiguously detect "which slide is active" — true for
  // `single` (the home page carousel), not for the narrow/default variants
  // that show several slides per screen at once (meals/events/about), where
  // that detection would tie and misfire. Those keep the original
  // non-looping scroll behavior below.
  const loop = single === true && images.length > 1;
  const slides = loop ? [images[images.length - 1], ...images, images[0]] : images;

  // Position on the first real slide (skipping the leading clone) once, on mount.
  useEffect(() => {
    if (!loop) return;
    const track = trackRef.current;
    const firstReal = track?.children[1] as HTMLElement | undefined;
    if (track && firstReal) alignChildToStart(track, firstReal, "instant");
  }, [loop]);

  // Once a swipe (or button scroll) settles on a clone slide, jump instantly
  // to the equivalent real slide at the other end — invisible to the viewer
  // since it's the same image, but lets scrolling continue indefinitely.
  // IntersectionObserver rather than a scroll-event listener: it reports
  // once a clone has become the dominant visible slide without needing a
  // manual debounce, and doesn't depend on 'scroll' events being dispatched
  // for every programmatic/compositor-driven scroll update.
  useEffect(() => {
    if (!loop) return;
    const track = trackRef.current;
    if (!track) return;
    const children = Array.from(track.children) as HTMLElement[];
    const leadingClone = children[0];
    const trailingClone = children[children.length - 1];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio < 0.9) continue;
          const current = trackRef.current;
          if (!current) continue;
          if (entry.target === leadingClone) {
            alignChildToStart(current, current.children[images.length] as HTMLElement, "instant");
          } else if (entry.target === trailingClone) {
            alignChildToStart(current, current.children[1] as HTMLElement, "instant");
          }
        }
      },
      { root: track, threshold: 0.9 }
    );
    observer.observe(leadingClone);
    observer.observe(trailingClone);
    return () => observer.disconnect();
  }, [loop, images.length]);

  function scroll(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;

    if (!loop) {
      // Button wiring below was flipped for the loop branch's index math
      // (prev=-1/next=+1); this reproduces the original prev=-260/next=+260
      // pixel scroll unchanged for the non-looping variants.
      track.scrollBy({ left: direction * 260, behavior: "smooth" });
      return;
    }

    const children = Array.from(track.children) as HTMLElement[];
    const active = findActiveChild(track);
    const activeIdx = active ? children.indexOf(active) : 1;

    let targetIdx = activeIdx + direction;
    if (targetIdx < 0) targetIdx = children.length - 2;
    if (targetIdx > children.length - 1) targetIdx = 1;

    alignChildToStart(track, children[targetIdx], "smooth");
  }

  return (
    <div className={styles.carousel}>
      <div className={styles.track} ref={trackRef}>
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
          <button type="button" className={`${styles.nav} ${styles.prev}`} onClick={() => scroll(-1)} aria-label={t.prev}>
            ‹
          </button>
          <button type="button" className={`${styles.nav} ${styles.next}`} onClick={() => scroll(1)} aria-label={t.next}>
            ›
          </button>
        </>
      )}
    </div>
  );
}
