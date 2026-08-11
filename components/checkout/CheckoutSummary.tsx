"use client";

import { useCart } from "@/components/cart/CartContext";
import { formatCurrency } from "@/lib/pricing";
import styles from "@/app/(site)/checkout/page.module.css";

export function CheckoutSummary() {
  const cart = useCart();

  return (
    <div className={styles.summary}>
      <h2>סיכום הזמנה</h2>
      {cart.items.map((item) => {
        const displayName = item.sizeLabel ? `${item.productName} — ${item.sizeLabel}` : item.productName;
        return (
          <div key={item.id} className={styles.line}>
            <span>
              {displayName} × {item.qty}
            </span>
            <span>{formatCurrency(item.priceBeforeVat * item.qty)}</span>
          </div>
        );
      })}
      {cart.greetingCardEnabled && cart.greetingCardMessage.trim() && (
        <div className={styles.line}>
          <span>כרטיס ברכה: &quot;{cart.greetingCardMessage.trim()}&quot;</span>
        </div>
      )}

      <div className={styles.totalsRow}>
        <span>סכום ביניים</span>
        <span>{formatCurrency(cart.totals.subtotal)}</span>
      </div>
      {cart.totals.discount > 0 && (
        <div className={styles.totalsRow}>
          <span>הנחה</span>
          <span>-{formatCurrency(cart.totals.discount)}</span>
        </div>
      )}
      {cart.totals.extraFee > 0 && (
        <div className={styles.totalsRow}>
          <span>כרטיס ברכה</span>
          <span>{formatCurrency(cart.totals.extraFee)}</span>
        </div>
      )}
      <div className={styles.totalsRow}>
        <span>מע&quot;מ (18%)</span>
        <span>{formatCurrency(cart.totals.vat)}</span>
      </div>
      <div className={`${styles.totalsRow} ${styles.grand}`}>
        <span>סה&quot;כ לתשלום</span>
        <span>{formatCurrency(cart.totals.total)}</span>
      </div>
    </div>
  );
}
