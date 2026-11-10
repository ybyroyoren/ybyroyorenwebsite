"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ProductView } from "@/lib/products";
import type { AllergenTag } from "@/lib/allergenTags";
import { getDict, type Locale } from "@/lib/dictionary";
import { useRowAlign } from "@/lib/useRowAlign";
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
  allergens,
  locale,
}: {
  products: ProductView[];
  categories: { slug: string; label: string; color: string }[];
  /** Allergen tags in use, for the "free of" filter. */
  allergens: AllergenTag[];
  locale: Locale;
}) {
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("default");
  const [rotating, setRotating] = useState(true);
  const [excluded, setExcluded] = useState<string[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const t = getDict(locale).shop;
  const hasGalleries = products.some((p) => p.imageUrls.length > 1);

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

  const categoryBySlug = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);

  // All of a product's category labels (colored), in the owner's category order.
  const categoryTags = (product: ProductView) =>
    product.categories.flatMap((slug) => categoryBySlug.get(slug) ?? []);

  const visible = useMemo(() => {
    const byCategory = category === "all" ? products : products.filter((p) => p.categories.includes(category));
    // "Free of": hide every product that carries one of the chosen allergens.
    const filtered =
      excluded.length === 0 ? byCategory : byCategory.filter((p) => !p.allergens.some((a) => excluded.includes(a.id)));
    if (sort !== "asc" && sort !== "desc") return filtered;
    return [...filtered].sort((a, b) => {
      const priceA = a.sizes[a.defaultSizeIndex]?.priceBeforeVat ?? 0;
      const priceB = b.sizes[b.defaultSizeIndex]?.priceBeforeVat ?? 0;
      return sort === "asc" ? priceA - priceB : priceB - priceA;
    });
  }, [products, category, sort, excluded]);

  // Older browsers without CSS subgrid: line the card parts up in script instead.
  useRowAlign(gridRef, [visible]);

  return (
    <>
      <ShopFilters
        locale={locale}
        categories={categories}
        activeCategory={category}
        activeSort={sort}
        onCategoryChange={(next) => update(next, sort)}
        onSortChange={(next) => update(category, next)}
        allergens={allergens}
        excludedAllergens={excluded}
        onToggleAllergen={(id) => setExcluded((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))}
        onClearAllergens={() => setExcluded([])}
        rotation={hasGalleries ? { playing: rotating, onToggle: () => setRotating((r) => !r) } : undefined}
      />
      {visible.length === 0 ? (
        <div className={styles.empty}>{t.empty}</div>
      ) : (
        <div className={styles.grid} ref={gridRef}>
          {visible.map((product, index) => (
            <ProductCard
              key={product.id}
              index={index}
              autoplay={rotating}
              product={product}
              locale={locale}
              categoryTags={categoryTags(product)}
            />
          ))}
        </div>
      )}
    </>
  );
}
