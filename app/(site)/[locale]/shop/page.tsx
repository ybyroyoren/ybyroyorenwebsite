import type { Metadata } from "next";
import { getActiveProducts } from "@/lib/products";
import { getCategories, categoryLabel } from "@/lib/categories";
import { resolveLocale } from "@/lib/i18n";
import { getDict } from "@/lib/dictionary";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { ProductCard } from "@/components/shop/ProductCard";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "חנות" };

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ cat?: string; sort?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const { cat = "all", sort = "default" } = await searchParams;
  const [products, categories] = await Promise.all([getActiveProducts(), getCategories()]);
  const t = getDict(locale).shop;
  const categoryLabelBySlug = new Map(categories.map((c) => [c.slug, categoryLabel(c, locale)]));

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
        <ShopFilters
          locale={locale}
          categories={categories.map((c) => ({ slug: c.slug, label: categoryLabel(c, locale) }))}
        />
        {filtered.length === 0 ? (
          <div className={styles.empty}>{t.empty}</div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                locale={locale}
                categoryLabel={categoryLabelBySlug.get(product.category) ?? product.category}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
