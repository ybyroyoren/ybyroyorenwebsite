"use client";

import { useRef, useState } from "react";
import { getDict, type Locale } from "@/lib/dictionary";
import { useSwipe } from "@/lib/useSwipe";
import { PlayPauseIcon } from "@/components/site/PlayPauseIcon";
import { AUTOPLAY_MS, useAutoplay } from "@/lib/useAutoplay";
import styles from "@/app/(site)/[locale]/shop/[slug]/page.module.css";

export function ProductGallery({
  imageUrls,
  alt,
  locale,
}: {
  imageUrls: string[];
  alt: string;
  locale: Locale;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const userPausedRef = useRef(false);
  const t = getDict(locale).shop;

  const { rootRef, handlers, pauseFor } = useAutoplay({
    enabled: imageUrls.length > 1,
    advance: () => setActiveIndex((i) => (i + 1) % imageUrls.length),
    isBusy: () => userPausedRef.current,
  });

  function changePhoto(delta: 1 | -1) {
    pauseFor(AUTOPLAY_MS * 1.5);
    setActiveIndex((i) => (i + delta + imageUrls.length) % imageUrls.length);
  }

  function toggleAutoplay() {
    userPausedRef.current = !userPausedRef.current;
    setUserPaused(userPausedRef.current);
  }

  const swipe = useSwipe(changePhoto);

  if (imageUrls.length === 0) {
    return <div className={styles.galleryMain} />;
  }

  return (
    <div ref={rootRef} {...handlers}>
      <div
        className={`${styles.galleryMain} ${styles.hasPhoto}`}
        onTouchStart={imageUrls.length > 1 ? swipe.onTouchStart : undefined}
        onTouchEnd={imageUrls.length > 1 ? swipe.onTouchEnd : undefined}
      >
        {/* All photos stacked; the active one fades in over the previous. */}
        {imageUrls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            className={`${styles.galleryPhoto} ${i === activeIndex ? styles.galleryPhotoActive : ""}`}
            src={url}
            alt={i === activeIndex ? alt : ""}
            loading={i === 0 ? undefined : "lazy"}
            decoding="async"
          />
        ))}
        {imageUrls.length > 1 && (
          <button
            type="button"
            className={styles.galleryPlayToggle}
            onClick={toggleAutoplay}
            aria-label={userPaused ? t.playRotation : t.pauseRotation}
            aria-pressed={userPaused}
          >
            <PlayPauseIcon playing={!userPaused} />
          </button>
        )}
        {imageUrls.length > 1 && (
          <>
            <button type="button" className={`${styles.galleryNav} ${styles.galleryPrev}`} onClick={() => changePhoto(-1)} aria-label={t.prevPhoto}>
              ‹
            </button>
            <button type="button" className={`${styles.galleryNav} ${styles.galleryNext}`} onClick={() => changePhoto(1)} aria-label={t.nextPhoto}>
              ›
            </button>
          </>
        )}
      </div>
      {imageUrls.length > 1 && (
        <div className={styles.galleryThumbs}>
          {imageUrls.map((url, i) => (
            <button
              key={url}
              type="button"
              className={`${styles.galleryThumb} ${i === activeIndex ? styles.galleryThumbActive : ""}`}
              onClick={() => {
                pauseFor(AUTOPLAY_MS * 1.5);
                setActiveIndex(i);
              }}
              aria-label={`${alt} ${i + 1}`}
              aria-current={i === activeIndex}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
