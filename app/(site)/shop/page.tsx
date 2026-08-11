import type { Metadata } from "next";
import { getActiveProducts } from "@/lib/products";
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
  const products = await getActiveProducts();

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
        <div className={styles.eyebrow}>חנות</div>
        <h1>מהמטבח שלי, ישר אליכם</h1>
        <p>כל המוצרים מיוצרים אצלנו לפי הזמנה. בחרו, הוסיפו לעגלה ובחרו תאריך איסוף בסוף התהליך.</p>
        <div className={styles.pickupNote}>
          איסוף עצמי מרחוב השוק 34, תל אביב · משלוח מוגבל בקרוב
        </div>
      </div>

      <div className="wrap">
        <ShopFilters />
        {filtered.length === 0 ? (
          <div className={styles.empty}>אין מוצרים בקטגוריה הזו כרגע.</div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
