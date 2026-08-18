import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActiveProducts, getProductBySlug } from "@/lib/products";
import { localizedProduct } from "@/lib/localizedProduct";
import { resolveLocale, localePath } from "@/lib/i18n";
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

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const t = getDict(locale);
  const p = localizedProduct(product, locale);

  const allProducts = await getActiveProducts();
  const related = allProducts.filter((r) => r.id !== product.id).slice(0, 4);

  return (
    <>
      <div className={`wrap ${styles.breadcrumb}`}>
        <Link href={localePath(locale, "/shop")}>{t.shop.eyebrow}</Link> / {p.name}
      </div>

      <div className={`wrap ${styles.layout}`}>
        <div>
          <div className={`${styles.galleryMain} ${product.imageUrls[0] ? styles.hasPhoto : ""}`}>
            {product.imageUrls[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.galleryPhoto} src={product.imageUrls[0]} alt={p.name} />
            )}
          </div>
          {product.imageUrls.length > 1 && (
            <div className={styles.galleryThumbs}>
              {product.imageUrls.slice(1).map((url) => (
                <div key={url} className={styles.galleryThumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={p.name} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.info}>
          <h1>{p.name}</h1>
          <p className={styles.desc}>{p.description}</p>

          <div className={styles.infoBlock}>
            <h4>{t.product.allergensHeading}</h4>
            <p className={styles.allergenTag}>{p.allergens}</p>
          </div>

          <ProductPurchase product={product} locale={locale} />
        </div>
      </div>

      {related.length > 0 && (
        <div className={`wrap ${styles.relatedSection}`}>
          <h2>{t.product.relatedHeading}</h2>
          <div className={styles.relatedGrid}>
            {related.map((r) => {
              const rp = localizedProduct(r, locale);
              return (
                <Link key={r.id} href={localePath(locale, `/shop/${r.slug}`)} className={styles.relatedCard}>
                  <div className={styles.relatedVisual}>
                    {r.imageUrls[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.imageUrls[0]} alt={rp.name} />
                    )}
                  </div>
                  <div className={styles.relatedName}>{rp.name}</div>
                  {r.sizes[0] && (
                    <div className={styles.relatedPrice}>
                      {formatCurrency(priceIncludingVat(r.sizes[0].priceBeforeVat))} {t.shop.inclVat}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
