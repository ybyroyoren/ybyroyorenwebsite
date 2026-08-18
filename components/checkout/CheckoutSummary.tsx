"use client";

import { useCart } from "@/components/cart/CartContext";
import { formatCurrency } from "@/lib/pricing";
import { getDict, type Locale } from "@/lib/dictionary";
import styles from "@/app/(site)/checkout/page.module.css";

export function CheckoutSummary({ locale }: { locale: Locale }) {
  const cart = useCart();
  const t = getDict(locale).checkout;

  return (
    <div className={styles.summary}>
      <h2>{t.summaryHeading}</h2>
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
          <span>{t.giftCardLine(cart.greetingCardMessage.trim())}</span>
        </div>
      )}

      <div className={styles.totalsRow}>
        <span>{t.subtotal}</span>
        <span>{formatCurrency(cart.totals.subtotal)}</span>
      </div>
      {cart.totals.discount > 0 && (
        <div className={styles.totalsRow}>
          <span>{t.discount}</span>
          <span>-{formatCurrency(cart.totals.discount)}</span>
        </div>
      )}
      {cart.totals.extraFee > 0 && (
        <div className={styles.totalsRow}>
          <span>{t.giftCardFee}</span>
          <span>{formatCurrency(cart.totals.extraFee)}</span>
        </div>
      )}
      <div className={styles.totalsRow}>
        <span>{t.vat}</span>
        <span>{formatCurrency(cart.totals.vat)}</span>
      </div>
      <div className={`${styles.totalsRow} ${styles.grand}`}>
        <span>{t.total}</span>
        <span>{formatCurrency(cart.totals.total)}</span>
      </div>
    </div>
  );
}
