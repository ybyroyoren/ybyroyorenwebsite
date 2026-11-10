"use client";

import { getDict, type Locale } from "@/lib/dictionary";
import { PlayPauseIcon } from "@/components/site/PlayPauseIcon";
import { allergenLabel, tagTextColor, type AllergenTag } from "@/lib/allergenTags";
import styles from "./ShopFilters.module.css";

export function ShopFilters({
  locale,
  categories,
  activeCategory,
  activeSort,
  onCategoryChange,
  onSortChange,
  rotation,
  allergens,
  excludedAllergens,
  onToggleAllergen,
  onClearAllergens,
}: {
  locale: Locale;
  categories: { slug: string; label: string }[];
  activeCategory: string;
  activeSort: string;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: string) => void;
  /** Pause/play for the cards' automatic photo cycling; omitted when no product has several photos. */
  rotation?: { playing: boolean; onToggle: () => void };
  /** Allergen tags that at least one product carries. */
  allergens: AllergenTag[];
  /** Ids of the allergens the visitor wants to avoid. */
  excludedAllergens: string[];
  onToggleAllergen: (id: string) => void;
  onClearAllergens: () => void;
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
      {allergens.length > 0 && (
        <div className={styles.allergenRow} role="group" aria-label={t.allergenFilter}>
          <span className={styles.allergenLabel}>{t.allergenFilter}</span>
          {allergens.map((a) => {
            const on = excludedAllergens.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                className={`${styles.allergenChip} ${on ? styles.allergenOn : ""}`}
                style={{
                  borderColor: a.color,
                  ...(on ? { background: a.color, color: tagTextColor(a.color) } : {}),
                }}
                aria-pressed={on}
                onClick={() => onToggleAllergen(a.id)}
              >
                {on ? "✓ " : ""}
                {allergenLabel(a, locale)}
              </button>
            );
          })}
          {excludedAllergens.length > 0 && (
            <button type="button" className={styles.allergenClear} onClick={onClearAllergens}>
              {t.allergenFilterClear}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
