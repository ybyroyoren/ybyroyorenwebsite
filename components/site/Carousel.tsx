"use client";

import { useRef } from "react";
import type { MediaItem } from "@/lib/media";
import styles from "./Carousel.module.css";

export function Carousel({ images, narrow }: { images: MediaItem[]; narrow?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (images.length === 0) return null;

  function scroll(direction: 1 | -1) {
    trackRef.current?.scrollBy({ left: direction * -260, behavior: "smooth" });
  }

  return (
    <div className={styles.carousel}>
      <div className={styles.track} ref={trackRef}>
        {images.map((img) => (
          <div key={img.id} className={`${styles.slide} ${narrow ? styles.slideNarrow : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button type="button" className={`${styles.nav} ${styles.prev}`} onClick={() => scroll(1)} aria-label="הקודם">
            ‹
          </button>
          <button type="button" className={`${styles.nav} ${styles.next}`} onClick={() => scroll(-1)} aria-label="הבא">
            ›
          </button>
        </>
      )}
    </div>
  );
}
