"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { getDict, type Locale } from "@/lib/dictionary";
import styles from "./ShopFilters.module.css";

export function ShopFilters({ locale }: { locale: Locale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("cat") ?? "all";
  const activeSort = searchParams.get("sort") ?? "default";
  const t = getDict(locale).shop;

  const CATEGORIES = [
    { value: "all", label: t.categories.all },
    { value: "desserts", label: t.categories.desserts },
    { value: "spreads", label: t.categories.spreads },
    { value: "frozen", label: t.categories.frozen },
    { value: "pasta", label: t.categories.pasta },
  ];

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
        <option value="default">{t.sort.default}</option>
        <option value="asc">{t.sort.asc}</option>
        <option value="desc">{t.sort.desc}</option>
      </select>
    </div>
  );
}
