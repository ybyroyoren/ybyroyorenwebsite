"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProductView } from "@/lib/products";
import { getDict, type Locale } from "@/lib/dictionary";
import { ShopFilters } from "./ShopFilters";
import { ProductCard } from "./ProductCard";
import styles from "@/app/(site)/[locale]/shop/page.module.css";

// Category filter + sort live here, in the browser, instead of being
// server-side search params. That keeps /shop a fully cacheable page and
// makes every filter click instant — it used to be a navigation to a server
// in another continent. The URL is still kept in sync (replaceState) so a
// filtered view can be refreshed or shared.
export function ShopCatalog({
  products,
  categories,
  locale,
}: {
  products: ProductView[];
  categories: { slug: string; label: string }[];
  locale: Locale;
}) {
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("default");
  const t = getDict(locale).shop;

  // Pick up a deep link like /shop?cat=pasta on first load. Initial render
  // stays on the defaults so it matches the statically generated HTML.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("cat");
    const sortParam = params.get("sort");
    /* eslint-disable react-hooks/set-state-in-effect -- syncing from the URL once after hydration */
    if (cat) setCategory(cat);
    if (sortParam === "asc" || sortParam === "desc") setSort(sortParam);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function update(nextCategory: string, nextSort: string) {
    setCategory(nextCategory);
    setSort(nextSort);
    const params = new URLSearchParams();
    if (nextCategory !== "all") params.set("cat", nextCategory);
    if (nextSort !== "default") params.set("sort", nextSort);
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${window.location.pathname}?${query}` : window.location.pathname
    );
  }

  const categoryLabelBySlug = useMemo(
    () => new Map(categories.map((c) => [c.slug, c.label])),
    [categories]
  );

  const visible = useMemo(() => {
    const filtered = category === "all" ? products : products.filter((p) => p.category === category);
    if (sort !== "asc" && sort !== "desc") return filtered;
    return [...filtered].sort((a, b) => {
      const priceA = a.sizes[0]?.priceBeforeVat ?? 0;
      const priceB = b.sizes[0]?.priceBeforeVat ?? 0;
      return sort === "asc" ? priceA - priceB : priceB - priceA;
    });
  }, [products, category, sort]);

  return (
    <>
      <ShopFilters
        locale={locale}
        categories={categories}
        activeCategory={category}
        activeSort={sort}
        onCategoryChange={(next) => update(next, sort)}
        onSortChange={(next) => update(category, next)}
      />
      {visible.length === 0 ? (
        <div className={styles.empty}>{t.empty}</div>
      ) : (
        <div className={styles.grid}>
          {visible.map((product, index) => (
            <ProductCard
              key={product.id}
              index={index}
              product={product}
              locale={locale}
              categoryLabel={categoryLabelBySlug.get(product.category) ?? product.category}
            />
          ))}
        </div>
      )}
    </>
  );
}
