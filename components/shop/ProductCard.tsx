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
import { stagger } from "@/lib/motion";
import { AUTOPLAY_MS, useAutoplay } from "@/lib/useAutoplay";
import { ChevronIcon } from "@/components/site/ChevronIcon";
import { AllergenTags } from "./AllergenTags";
import { tagTextColor } from "@/lib/allergenTags";
import styles from "./ProductCard.module.css";

export function ProductCard({
  product,
  locale,
  categoryTags,
  index = 0,
  autoplay = true,
}: {
  product: ProductView;
  locale: Locale;
  /** Every category the product is in, each with the owner's color. */
  categoryTags: { slug: string; label: string; color: string }[];
  /** Position in the grid: the first row animates in at once, later cards as they scroll into view. */
  index?: number;
  /** Cycle through the product's photos on their own (the shop page can switch this off). */
  autoplay?: boolean;
}) {
  const cart = useCart();
  const [sizeIndex, setSizeIndex] = useState(product.defaultSizeIndex);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [justAdded, setJustAdded] = useState(false);
  const t = getDict(locale).shop;
  const p = localizedProduct(product, locale);

  const size = product.sizes[sizeIndex];
  const inStock = size?.stockStatus === "in_stock";
  const photos = product.imageUrls;

  async function handleAdd() {
    if (!size || !inStock) return;
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
    try {
      await cart.addItem(size.id, 1);
    } catch {
      setJustAdded(false);
    }
  }

  function changePhoto(e: React.MouseEvent, delta: 1 | -1) {
    e.preventDefault();
    e.stopPropagation();
    pauseFor(AUTOPLAY_MS * 1.5);
    setPhotoIndex((i) => (i + delta + photos.length) % photos.length);
  }

  const { rootRef, handlers, pauseFor } = useAutoplay({
    enabled: autoplay && photos.length > 1,
    // Cards start out of step so a whole grid doesn't flip in unison.
    initialDelayMs: AUTOPLAY_MS + (index % 4) * 650,
    advance: () => setPhotoIndex((i) => (i + 1) % photos.length),
  });

  const swipe = useSwipe((delta) => {
    pauseFor(AUTOPLAY_MS * 1.5);
    setPhotoIndex((i) => (i + delta + photos.length) % photos.length);
  });

  return (
    <div
      ref={rootRef}
      {...handlers}
      className={`${styles.card} ${index < 3 ? "enter" : ""}`}
      {...(index >= 3 ? { "data-reveal": "" } : {})}
      style={index < 3 ? stagger(index) : undefined}
    >
      <div
        className={`${styles.visual} ${photos[0] ? styles.hasPhoto : ""}`}
        onTouchStart={photos.length > 1 ? swipe.onTouchStart : undefined}
        onTouchEnd={photos.length > 1 ? swipe.onTouchEnd : undefined}
      >
        {/* All photos stacked; the active one fades in over the previous. */}
        {photos.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            className={`${styles.photo} ${i === photoIndex ? styles.photoActive : ""}`}
            src={url}
            alt={i === photoIndex ? p.name : ""}
            loading={i === 0 ? undefined : "lazy"}
            decoding="async"
          />
        ))}
        {categoryTags.length > 0 && (
          <div className={styles.tags}>
            {categoryTags.map((c) => (
              <span key={c.slug} className={styles.tag} style={{ background: c.color, color: tagTextColor(c.color) }}>
                {c.label}
              </span>
            ))}
          </div>
        )}
        {photos.length > 1 && (
          <>
            <button type="button" className={`${styles.photoNav} ${styles.photoPrev}`} onClick={(e) => changePhoto(e, -1)} aria-label={t.prevPhoto}>
              <ChevronIcon dir="prev" size={16} />
            </button>
            <button type="button" className={`${styles.photoNav} ${styles.photoNext}`} onClick={(e) => changePhoto(e, 1)} aria-label={t.nextPhoto}>
              <ChevronIcon dir="next" size={16} />
            </button>
            <div className={styles.photoDots}>
              {photos.map((url, i) => (
                <span key={url} className={`${styles.photoDot} ${i === photoIndex ? styles.photoDotActive : ""}`} />
              ))}
            </div>
          </>
        )}
      </div>
      {/* name / description / allergens / size / price are direct children of the card so each
          gets its own row on the shared grid (see .card below): they line up across a whole row of cards. */}
      <Link className={styles.name} data-part="name" href={localePath(locale, `/shop/${product.slug}`)}>
        {p.name}
      </Link>
      <div className={styles.desc} data-part="desc">{p.description}</div>
      <div className={styles.allergens} data-part="allergens">
        <AllergenTags tags={product.allergens} locale={locale} label={t.allergensLabel} />
      </div>

      {product.sizes.length > 1 ? (
        <select
          className={styles.sizeSelect}
          data-part="size"
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
        <div className={styles.sizeFixed} data-part="size">{size?.label}</div>
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
            className={`ybtn ${styles.addBtn} ${justAdded ? styles.added : ""}`}
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
