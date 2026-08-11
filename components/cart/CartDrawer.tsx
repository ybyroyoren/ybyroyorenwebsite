"use client";

import { useState } from "react";
import Link from "next/link";
import { GREETING_CARD_MAX_LENGTH, useCart } from "./CartContext";
import { formatCurrency } from "@/lib/pricing";
import styles from "./CartDrawer.module.css";

export function CartDrawer() {
  const cart = useCart();
  const [couponCode, setCouponCode] = useState("");

  return (
    <>
      <div
        className={`${styles.overlay} ${cart.isOpen ? styles.open : ""}`}
        onClick={cart.close}
      />
      <div className={`${styles.drawer} ${cart.isOpen ? styles.open : ""}`}>
        <div className={styles.head}>
          <h3>העגלה שלך</h3>
          <button type="button" className={styles.close} onClick={cart.close}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {cart.items.length === 0 ? (
            <div className={styles.empty}>העגלה שלך ריקה עדיין</div>
          ) : (
            cart.items.map((item) => {
              const unitIncl = item.priceBeforeVat * 1.18;
              const lineTotalIncl = unitIncl * item.qty;
              const displayName = item.sizeLabel
                ? `${item.productName} — ${item.sizeLabel}`
                : item.productName;
              return (
                <div key={item.id} className={styles.item}>
                  <div className={styles.itemVisual} />
                  <div className={styles.itemInfo}>
                    <div className={styles.itemName}>{displayName}</div>
                    <div className={styles.itemPrice}>
                      {formatCurrency(item.priceBeforeVat)} לפני מע&quot;מ · {formatCurrency(unitIncl)} כולל מע&quot;מ
                    </div>
                    <div className={styles.qtyControl}>
                      <button
                        type="button"
                        onClick={() => cart.updateQty(item.id, item.qty - 1)}
                        disabled={cart.isLoading}
                      >
                        −
                      </button>
                      <span>{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => cart.updateQty(item.id, item.qty + 1)}
                        disabled={cart.isLoading}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className={styles.itemTotal}>{formatCurrency(lineTotalIncl)}</div>
                    <button
                      type="button"
                      className={styles.remove}
                      onClick={() => cart.removeItem(item.id)}
                      disabled={cart.isLoading}
                    >
                      הסר
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cart.items.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.couponRow}>
              <input
                type="text"
                placeholder="הזינו קוד קופון"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              <button type="button" onClick={() => cart.applyCoupon(couponCode)}>
                החל
              </button>
            </div>
            {cart.couponMessage && (
              <p
                className={`${styles.couponMsg} ${
                  cart.couponStatus === "success" ? styles.success : styles.error
                }`}
              >
                {cart.couponMessage}
              </p>
            )}

            <label className={styles.giftToggle}>
              <input
                type="checkbox"
                checked={cart.greetingCardEnabled}
                onChange={(e) => cart.setGreetingCardEnabled(e.target.checked)}
              />
              הוספת כרטיס ברכה (+{formatCurrency(8)})
            </label>
            {cart.greetingCardEnabled && (
              <div className={styles.giftBlock}>
                <textarea
                  value={cart.greetingCardMessage}
                  onChange={(e) => cart.setGreetingCardMessage(e.target.value)}
                  maxLength={GREETING_CARD_MAX_LENGTH}
                  placeholder="מה נרשום על הכרטיס?"
                  rows={3}
                />
                <span className={styles.giftCount}>
                  {cart.greetingCardMessage.length}/{GREETING_CARD_MAX_LENGTH}
                </span>
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

            <Link href="/checkout" className={styles.checkoutBtn} onClick={cart.close}>
              המשך לתשלום
            </Link>
            <p className={styles.note}>קבלה תישלח אוטומטית למייל לאחר התשלום</p>
          </div>
        )}
      </div>
    </>
  );
}
