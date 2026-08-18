import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActiveProducts, getProductBySlug } from "@/lib/products";
import { getLocale } from "@/lib/i18n";
import { getDict } from "@/lib/dictionary";
import { ProductPurchase } from "@/components/shop/ProductPurchase";
import { formatCurrency, priceIncludingVat } from "@/lib/pricing";
import styles from "./page.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product?.name ?? "מוצר" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, locale] = await Promise.all([getProductBySlug(slug), getLocale()]);
  if (!product) notFound();
  const t = getDict(locale);

  const allProducts = await getActiveProducts();
  const related = allProducts.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <>
      <div className={`wrap ${styles.breadcrumb}`}>
        <Link href="/shop">{t.shop.eyebrow}</Link> / {product.name}
      </div>

      <div className={`wrap ${styles.layout}`}>
        <div>
          <div className={`${styles.galleryMain} ${product.imageUrls[0] ? styles.hasPhoto : ""}`}>
            {product.imageUrls[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.galleryPhoto} src={product.imageUrls[0]} alt={product.name} />
            )}
          </div>
          {product.imageUrls.length > 1 && (
            <div className={styles.galleryThumbs}>
              {product.imageUrls.slice(1).map((url) => (
                <div key={url} className={styles.galleryThumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={product.name} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.info}>
          <h1>{product.name}</h1>
          <p className={styles.desc}>{product.description}</p>

          <div className={styles.infoBlock}>
            <h4>{t.product.allergensHeading}</h4>
            <p className={styles.allergenTag}>{product.allergens}</p>
          </div>

          <ProductPurchase product={product} locale={locale} />
        </div>
      </div>

      {related.length > 0 && (
        <div className={`wrap ${styles.relatedSection}`}>
          <h2>{t.product.relatedHeading}</h2>
          <div className={styles.relatedGrid}>
            {related.map((p) => (
              <Link key={p.id} href={`/shop/${p.slug}`} className={styles.relatedCard}>
                <div className={styles.relatedVisual}>
                  {p.imageUrls[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrls[0]} alt={p.name} />
                  )}
                </div>
                <div className={styles.relatedName}>{p.name}</div>
                {p.sizes[0] && (
                  <div className={styles.relatedPrice}>
                    {formatCurrency(priceIncludingVat(p.sizes[0].priceBeforeVat))} {t.shop.inclVat}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
