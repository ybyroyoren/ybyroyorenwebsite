"use client";

import { track } from "@/lib/analytics/client";
import { useActionState, useState } from "react";
import { submitCheckout, type CheckoutState } from "@/lib/actions/checkout";
import { useCart } from "@/components/cart/CartContext";
import { PickupCalendar } from "@/components/checkout/PickupCalendar";
import { getDict, type Locale } from "@/lib/dictionary";
import styles from "@/app/(site)/[locale]/checkout/page.module.css";

const initialState: CheckoutState = { error: null };

export function CheckoutForm({ locale }: { locale: Locale }) {
  const cart = useCart();
  const [state, action, pending] = useActionState(submitCheckout, initialState);
  const hasLeadTime = cart.items.some((item) => item.leadTimeDays > 0);
  const f = getDict(locale).checkout.form;

  // The pickup calendar only lets the customer choose a day on which pickup is open and everything in the cart is in stock.
  const [pickupDate, setPickupDate] = useState("");
  const cartKey = cart.items.map((i) => `${i.productSizeId}:${i.qty}`).join(",");
  const blocked = !pickupDate;

  return (
    <form className={styles.form} action={action} onSubmit={() => track("checkout_submit")}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="couponCode" value={cart.couponCode} />
      <input
        type="hidden"
        name="greetingCardMessage"
        value={cart.greetingCardEnabled ? cart.greetingCardMessage.trim() : ""}
      />

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor="customerName">{f.nameLabel}</label>
          <input id="customerName" name="customerName" type="text" required />
        </div>
        <div className={styles.field}>
          <label htmlFor="customerPhone">{f.phoneLabel}</label>
          <input id="customerPhone" name="customerPhone" type="tel" required />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="customerEmail">{f.emailLabel}</label>
        <input id="customerEmail" name="customerEmail" type="email" required />
      </div>

      <div className={styles.field}>
        <label>{f.pickupDateLabel}</label>
        <input type="hidden" name="pickupDate" value={pickupDate} />
        <PickupCalendar locale={locale} value={pickupDate} onChange={setPickupDate} cartKey={cartKey} />
        {hasLeadTime && <p className={styles.fieldNote}>{f.leadTimeNote(cart.minPickupDate.split("-").reverse().join("."))}</p>}
      </div>

      <div className={styles.field}>
        <label htmlFor="notes">{f.notesLabel}</label>
        <textarea id="notes" name="notes" placeholder={f.notesPlaceholder} />
      </div>

      {state.error && <p className={styles.error}>{state.error}</p>}

      <button type="submit" className={`ybtn ${styles.submitBtn}`} disabled={pending || blocked}>
        {pending ? f.submitting : f.submit}
      </button>
    </form>
  );
}
