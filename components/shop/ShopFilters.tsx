"use client";

import { getDict, type Locale } from "@/lib/dictionary";
import { PlayPauseIcon } from "@/components/site/PlayPauseIcon";
import styles from "./ShopFilters.module.css";

export function ShopFilters({
  locale,
  categories,
  activeCategory,
  activeSort,
  onCategoryChange,
  onSortChange,
  rotation,
}: {
  locale: Locale;
  categories: { slug: string; label: string }[];
  activeCategory: string;
  activeSort: string;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: string) => void;
  /** Pause/play for the cards' automatic photo cycling; omitted when no product has several photos. */
  rotation?: { playing: boolean; onToggle: () => void };
}) {
  const t = getDict(locale).shop;

  const CATEGORIES = [
    { value: "all", label: t.allCategories },
    ...categories.map((c) => ({ value: c.slug, label: c.label })),
  ];

  return (
    <div className={styles.filters}>
      <div className={styles.chips}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            className={`${styles.chip} ${activeCategory === cat.value ? styles.active : ""}`}
            onClick={() => onCategoryChange(cat.value)}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className={styles.tools}>
      {rotation && (
        <button
          type="button"
          className={styles.rotationToggle}
          onClick={rotation.onToggle}
          aria-pressed={!rotation.playing}
        >
          <PlayPauseIcon playing={rotation.playing} size={11} />
          {rotation.playing ? t.pauseRotation : t.playRotation}
        </button>
      )}
      <select
        className={styles.sortSelect}
        value={activeSort}
        onChange={(e) => onSortChange(e.target.value)}
      >
        <option value="default">{t.sort.default}</option>
        <option value="asc">{t.sort.asc}</option>
        <option value="desc">{t.sort.desc}</option>
      </select>
      </div>
    </div>
  );
}
