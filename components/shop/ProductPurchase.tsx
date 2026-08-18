"use client";

import { useState } from "react";
import type { ProductView } from "@/lib/products";
import { useCart } from "@/components/cart/CartContext";
import { formatCurrency, priceIncludingVat } from "@/lib/pricing";
import { getDict, type Locale } from "@/lib/dictionary";
import styles from "@/app/(site)/[locale]/shop/[slug]/page.module.css";

export function ProductPurchase({ product, locale }: { product: ProductView; locale: Locale }) {
  const cart = useCart();
  const [sizeIndex, setSizeIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const t = getDict(locale);

  const size = product.sizes[sizeIndex];
  const inStock = size?.stockStatus === "in_stock";

  async function handleAdd() {
    if (!size || !inStock) return;
    await cart.addItem(size.id, qty);
  }

  return (
    <>
      <div className={styles.priceRow}>
        <span className={styles.priceMain}>
          {size ? formatCurrency(priceIncludingVat(size.priceBeforeVat)) : ""}
        </span>
        <span className={styles.priceVatNote}>{t.shop.inclVat}</span>
      </div>

      {product.sizes.length > 1 && (
        <div className={styles.sizeSelect}>
          <h4>{t.product.sizeHeading}</h4>
          <div className={styles.sizeChips}>
            {product.sizes.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`${styles.sizeChip} ${i === sizeIndex ? styles.selected : ""}`}
                onClick={() => setSizeIndex(i)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {inStock ? (
        <>
          <div className={styles.qtyAddRow}>
            <div className={styles.qtyControl}>
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                −
              </button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)}>
                +
              </button>
            </div>
            <button
              type="button"
              className={styles.addToCartBtn}
              onClick={handleAdd}
              disabled={cart.isLoading}
            >
              {t.shop.addToCart}
            </button>
          </div>
          <div className={styles.pickupNote}>{t.shop.pickupNote}</div>
        </>
      ) : (
        <div>
          <div className={styles.outOfStockBadge}>{t.shop.outOfStock}</div>
          <p className={styles.outOfStockText}>{t.product.outOfStockText}</p>
        </div>
      )}
    </>
  );
}
