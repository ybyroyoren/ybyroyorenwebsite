import type { Metadata } from "next";
import { getActiveProducts } from "@/lib/products";
import { getCategories, categoryLabel } from "@/lib/categories";
import { resolveLocale } from "@/lib/i18n";
import { getDict } from "@/lib/dictionary";
import { ShopCatalog } from "@/components/shop/ShopCatalog";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "חנות" };

// No searchParams here on purpose: category/sort filtering happens client
// side in ShopCatalog, which is what lets this page be statically
// generated and served from the CDN instead of rendered on every request.
export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const [products, categories] = await Promise.all([getActiveProducts(), getCategories()]);
  const t = getDict(locale).shop;

  return (
    <>
      <div className={`wrap ${styles.pageHead}`}>
        <div className={styles.eyebrow}>{t.eyebrow}</div>
        <h1>{t.heading}</h1>
        <p>{t.sub}</p>
        <div className={styles.pickupNote}>{t.pickupNote}</div>
      </div>

      <div className="wrap">
        <ShopCatalog
          products={products}
          categories={categories.map((c) => ({ slug: c.slug, label: categoryLabel(c, locale) }))}
          locale={locale}
        />
      </div>
    </>
  );
}
