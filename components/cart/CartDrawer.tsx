"use client";

import { useState } from "react";
import Link from "next/link";
import { GREETING_CARD_MAX_LENGTH, useCart } from "./CartContext";
import { formatCurrency } from "@/lib/pricing";
import { getDict, type Locale } from "@/lib/dictionary";
import { localePath } from "@/lib/i18n";
import styles from "./CartDrawer.module.css";

export function CartDrawer({ locale }: { locale: Locale }) {
  const cart = useCart();
  const [couponCode, setCouponCode] = useState("");
  const t = getDict(locale).cart;

  return (
    <>
      <div
        className={`${styles.overlay} ${cart.isOpen ? styles.open : ""}`}
        onClick={cart.close}
      />
      <div className={`${styles.drawer} ${cart.isOpen ? styles.open : ""}`}>
        <div className={styles.head}>
          <h3>{t.title}</h3>
          <button type="button" className={styles.close} onClick={cart.close}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {cart.items.length === 0 ? (
            <div className={styles.empty}>{t.empty}</div>
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
                      {formatCurrency(item.priceBeforeVat)} {t.beforeVat} · {formatCurrency(unitIncl)} {t.inclVat}
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
                      {t.remove}
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
                placeholder={t.couponPlaceholder}
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              <button type="button" onClick={() => cart.applyCoupon(couponCode)}>
                {t.couponApply}
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
              {t.giftToggle} (+{formatCurrency(8)})
            </label>
            {cart.greetingCardEnabled && (
              <div className={styles.giftBlock}>
                <textarea
                  value={cart.greetingCardMessage}
                  onChange={(e) => cart.setGreetingCardMessage(e.target.value)}
                  maxLength={GREETING_CARD_MAX_LENGTH}
                  placeholder={t.giftPlaceholder}
                  rows={3}
                />
                <span className={styles.giftCount}>
                  {cart.greetingCardMessage.length}/{GREETING_CARD_MAX_LENGTH}
                </span>
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

            <Link href={localePath(locale, "/checkout")} className={styles.checkoutBtn} onClick={cart.close}>
              {t.checkoutBtn}
            </Link>
            <p className={styles.note}>{t.note}</p>
          </div>
        )}
      </div>
    </>
  );
}
