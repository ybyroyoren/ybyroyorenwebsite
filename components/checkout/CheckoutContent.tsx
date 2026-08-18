"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartContext";
import { CheckoutSummary } from "./CheckoutSummary";
import { CheckoutForm } from "./CheckoutForm";
import { getDict, type Locale } from "@/lib/dictionary";
import { localePath } from "@/lib/i18n";
import styles from "@/app/(site)/[locale]/checkout/page.module.css";

export function CheckoutContent({ locale }: { locale: Locale }) {
  const cart = useCart();
  const t = getDict(locale).checkout;

  if (cart.items.length === 0) {
    return (
      <div className={styles.empty}>
        <p>{t.emptyCart}</p>
        <Link href={localePath(locale, "/shop")}>{t.backToShop}</Link>
      </div>
    );
  }

  return (
    <div className={`wrap ${styles.layout}`}>
      <CheckoutSummary locale={locale} />
      <CheckoutForm locale={locale} />
    </div>
  );
}
