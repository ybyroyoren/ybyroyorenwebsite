import type { Metadata } from "next";
import { getActiveProducts } from "@/lib/products";
import { getLocale } from "@/lib/i18n";
import { getDict } from "@/lib/dictionary";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { ProductCard } from "@/components/shop/ProductCard";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "חנות" };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; sort?: string }>;
}) {
  const { cat = "all", sort = "default" } = await searchParams;
  const [products, locale] = await Promise.all([getActiveProducts(), getLocale()]);
  const t = getDict(locale).shop;

  let filtered = cat === "all" ? products : products.filter((p) => p.category === cat);

  if (sort === "asc" || sort === "desc") {
    filtered = [...filtered].sort((a, b) => {
      const priceA = a.sizes[0]?.priceBeforeVat ?? 0;
      const priceB = b.sizes[0]?.priceBeforeVat ?? 0;
      return sort === "asc" ? priceA - priceB : priceB - priceA;
    });
  }

  return (
    <>
      <div className={`wrap ${styles.pageHead}`}>
        <div className={styles.eyebrow}>{t.eyebrow}</div>
        <h1>{t.heading}</h1>
        <p>{t.sub}</p>
        <div className={styles.pickupNote}>{t.pickupNote}</div>
      </div>

      <div className="wrap">
        <ShopFilters locale={locale} />
        {filtered.length === 0 ? (
          <div className={styles.empty}>{t.empty}</div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
