"use client";

import { useState } from "react";
import { getDict, type Locale } from "@/lib/dictionary";
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
  const t = getDict(locale).shop;

  if (imageUrls.length === 0) {
    return <div className={styles.galleryMain} />;
  }

  function changePhoto(delta: 1 | -1) {
    setActiveIndex((i) => (i + delta + imageUrls.length) % imageUrls.length);
  }

  return (
    <div>
      <div className={`${styles.galleryMain} ${styles.hasPhoto}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.galleryPhoto} src={imageUrls[activeIndex]} alt={alt} />
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
              onClick={() => setActiveIndex(i)}
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
