"use client";

import { useRouter, useSearchParams } from "next/navigation";
import styles from "./ShopFilters.module.css";

const CATEGORIES = [
  { value: "all", label: "הכל" },
  { value: "desserts", label: "קינוחים" },
  { value: "spreads", label: "ממרחים" },
  { value: "frozen", label: "קפואים" },
  { value: "pasta", label: "פסטה" },
];

export function ShopFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("cat") ?? "all";
  const activeSort = searchParams.get("sort") ?? "default";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "default") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `/shop?${query}` : "/shop");
  }

  return (
    <div className={styles.filters}>
      <div className={styles.chips}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            className={`${styles.chip} ${activeCategory === cat.value ? styles.active : ""}`}
            onClick={() => updateParam("cat", cat.value)}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <select
        className={styles.sortSelect}
        value={activeSort}
        onChange={(e) => updateParam("sort", e.target.value)}
      >
        <option value="default">מיון: לפי המלצה</option>
        <option value="asc">מחיר: מהנמוך לגבוה</option>
        <option value="desc">מחיר: מהגבוה לנמוך</option>
      </select>
    </div>
  );
}
