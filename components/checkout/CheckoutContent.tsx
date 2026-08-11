"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartContext";
import { CheckoutSummary } from "./CheckoutSummary";
import { CheckoutForm } from "./CheckoutForm";
import styles from "@/app/(site)/checkout/page.module.css";

export function CheckoutContent() {
  const cart = useCart();

  if (cart.items.length === 0) {
    return (
      <div className={styles.empty}>
        <p>העגלה שלך ריקה.</p>
        <Link href="/shop">לחזרה לחנות</Link>
      </div>
    );
  }

  return (
    <div className={`wrap ${styles.layout}`}>
      <CheckoutSummary />
      <CheckoutForm />
    </div>
  );
}
