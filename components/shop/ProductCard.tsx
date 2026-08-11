"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProductView } from "@/lib/products";
import { useCart } from "@/components/cart/CartContext";
import { formatCurrency, priceIncludingVat } from "@/lib/pricing";
import styles from "./ProductCard.module.css";

const CATEGORY_LABELS: Record<string, string> = {
  desserts: "קינוחים",
  spreads: "ממרחים",
  frozen: "קפואים",
  pasta: "פסטה",
};

export function ProductCard({ product }: { product: ProductView }) {
  const cart = useCart();
  const [sizeIndex, setSizeIndex] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  const size = product.sizes[sizeIndex];
  const inStock = size?.stockStatus === "in_stock";

  async function handleAdd() {
    if (!size || !inStock) return;
    await cart.addItem(size.id, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <div className={styles.card}>
      <div className={`${styles.visual} ${product.imageUrls[0] ? styles.hasPhoto : ""}`}>
        {product.imageUrls[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.photo} src={product.imageUrls[0]} alt={product.name} />
        )}
        <span className={styles.tag}>{CATEGORY_LABELS[product.category] ?? product.category}</span>
      </div>
      <div className={styles.info}>
        <div>
          <Link className={styles.name} href={`/shop/${product.slug}`}>
            {product.name}
          </Link>
          <div className={styles.desc}>{product.description}</div>
          <div className={styles.allergens}>אלרגנים: {product.allergens}</div>
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
            <span className={styles.priceVat}>כולל מע&quot;מ</span>
          </span>
        )}
        {inStock ? (
          <button
            type="button"
            className={`${styles.addBtn} ${justAdded ? styles.added : ""}`}
            onClick={handleAdd}
            disabled={cart.isLoading}
          >
            {justAdded ? "נוסף ✓" : "הוסיפו לעגלה"}
          </button>
        ) : (
          <span className={styles.outOfStock}>אזל המלאי</span>
        )}
      </div>
    </div>
  );
}
