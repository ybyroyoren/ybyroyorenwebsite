"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProductView } from "@/lib/products";
import { useCart } from "@/components/cart/CartContext";
import { formatCurrency, priceIncludingVat } from "@/lib/pricing";
import { getDict, type Locale } from "@/lib/dictionary";
import { localePath } from "@/lib/i18n";
import { localizedProduct } from "@/lib/localizedProduct";
import { useSwipe } from "@/lib/useSwipe";
import styles from "./ProductCard.module.css";

export function ProductCard({
  product,
  locale,
  categoryLabel,
}: {
  product: ProductView;
  locale: Locale;
  categoryLabel: string;
}) {
  const cart = useCart();
  const [sizeIndex, setSizeIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [justAdded, setJustAdded] = useState(false);
  const t = getDict(locale).shop;
  const p = localizedProduct(product, locale);

  const size = product.sizes[sizeIndex];
  const inStock = size?.stockStatus === "in_stock";
  const photos = product.imageUrls;

  async function handleAdd() {
    if (!size || !inStock) return;
    await cart.addItem(size.id, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  function changePhoto(e: React.MouseEvent, delta: 1 | -1) {
    e.preventDefault();
    e.stopPropagation();
    setPhotoIndex((i) => (i + delta + photos.length) % photos.length);
  }

  const swipe = useSwipe((delta) => setPhotoIndex((i) => (i + delta + photos.length) % photos.length));

  return (
    <div className={styles.card}>
      <div
        className={`${styles.visual} ${photos[0] ? styles.hasPhoto : ""}`}
        onTouchStart={photos.length > 1 ? swipe.onTouchStart : undefined}
        onTouchEnd={photos.length > 1 ? swipe.onTouchEnd : undefined}
      >
        {photos[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.photo} src={photos[photoIndex]} alt={p.name} />
        )}
        <span className={styles.tag}>{categoryLabel}</span>
        {photos.length > 1 && (
          <>
            <button type="button" className={`${styles.photoNav} ${styles.photoPrev}`} onClick={(e) => changePhoto(e, -1)} aria-label={t.prevPhoto}>
              ‹
            </button>
            <button type="button" className={`${styles.photoNav} ${styles.photoNext}`} onClick={(e) => changePhoto(e, 1)} aria-label={t.nextPhoto}>
              ›
            </button>
            <div className={styles.photoDots}>
              {photos.map((url, i) => (
                <span key={url} className={`${styles.photoDot} ${i === photoIndex ? styles.photoDotActive : ""}`} />
              ))}
            </div>
          </>
        )}
      </div>
      <div className={styles.info}>
        <div>
          <Link className={styles.name} href={localePath(locale, `/shop/${product.slug}`)}>
            {p.name}
          </Link>
          <div className={styles.desc}>{p.description}</div>
          <div className={styles.allergens}>
            {t.allergensLabel}: {p.allergens}
          </div>
        </div>
      </div>

      {product.sizes.length > 1 ? (
        <select
          className={styles.sizeSelect}
          value={sizeIndex}
          onChange={(e) => setSizeIndex(Number(e.target.value))}
        >
          {product.sizes.map((s, i) => (
            <option key={s.id} value={i}>
              {s.label}
            </option>
          ))}
        </select>
      ) : (
        <div className={styles.sizeFixed}>{size?.label}</div>
      )}

      <div className={styles.footer}>
        {size && (
          <span className={styles.price}>
            {formatCurrency(priceIncludingVat(size.priceBeforeVat))}{" "}
            <span className={styles.priceVat}>{t.inclVat}</span>
          </span>
        )}
        {inStock ? (
          <button
            type="button"
            className={`${styles.addBtn} ${justAdded ? styles.added : ""}`}
            onClick={handleAdd}
            disabled={cart.isLoading}
          >
            {justAdded ? t.added : t.addToCart}
          </button>
        ) : (
          <span className={styles.outOfStock}>{t.outOfStock}</span>
        )}
      </div>
    </div>
  );
}
