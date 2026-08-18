"use client";

import { useActionState } from "react";
import { submitCheckout, type CheckoutState } from "@/lib/actions/checkout";
import { useCart } from "@/components/cart/CartContext";
import { getDict, type Locale } from "@/lib/dictionary";
import styles from "@/app/(site)/checkout/page.module.css";

const initialState: CheckoutState = { error: null };

export function CheckoutForm({ locale }: { locale: Locale }) {
  const cart = useCart();
  const [state, action, pending] = useActionState(submitCheckout, initialState);
  const hasLeadTime = cart.items.some((item) => item.leadTimeDays > 0);
  const f = getDict(locale).checkout.form;

  return (
    <form className={styles.form} action={action}>
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
        <label htmlFor="pickupDate">{f.pickupDateLabel}</label>
        <input
          id="pickupDate"
          name="pickupDate"
          type="date"
          min={cart.minPickupDate}
          defaultValue={cart.minPickupDate}
          required
        />
        {hasLeadTime && <p className={styles.fieldNote}>{f.leadTimeNote(cart.minPickupDate)}</p>}
      </div>

      <div className={styles.field}>
        <label htmlFor="notes">{f.notesLabel}</label>
        <textarea id="notes" name="notes" placeholder={f.notesPlaceholder} />
      </div>

      {state.error && <p className={styles.error}>{state.error}</p>}

      <button type="submit" className={styles.submitBtn} disabled={pending}>
        {pending ? f.submitting : f.submit}
      </button>
    </form>
  );
}
