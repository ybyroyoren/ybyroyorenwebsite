"use client";

import { useState } from "react";
import type { ProductView } from "@/lib/products";
import { useCart } from "@/components/cart/CartContext";
import { formatCurrency, priceIncludingVat } from "@/lib/pricing";
import styles from "@/app/(site)/shop/[slug]/page.module.css";

export function ProductPurchase({ product }: { product: ProductView }) {
  const cart = useCart();
  const [sizeIndex, setSizeIndex] = useState(0);
  const [qty, setQty] = useState(1);

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
        <span className={styles.priceVatNote}>כולל מע&quot;מ</span>
      </div>

      {product.sizes.length > 1 && (
        <div className={styles.sizeSelect}>
          <h4>גודל</h4>
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
              הוסיפו לעגלה
            </button>
          </div>
          <div className={styles.pickupNote}>
            איסוף עצמי מרחוב השוק 34, תל אביב · משלוח מוגבל בקרוב
          </div>
        </>
      ) : (
        <div>
          <div className={styles.outOfStockBadge}>אזל המלאי</div>
          <p className={styles.outOfStockText}>
            המוצר לא זמין כרגע. השאירו מייל ונעדכן אתכם ברגע שהוא חוזר.
          </p>
        </div>
      )}
    </>
  );
}
