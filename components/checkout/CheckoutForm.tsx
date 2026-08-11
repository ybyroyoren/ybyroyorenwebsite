"use client";

import { useActionState } from "react";
import { submitCheckout, type CheckoutState } from "@/lib/actions/checkout";
import { useCart } from "@/components/cart/CartContext";
import styles from "@/app/(site)/checkout/page.module.css";

const initialState: CheckoutState = { error: null };

export function CheckoutForm() {
  const cart = useCart();
  const [state, action, pending] = useActionState(submitCheckout, initialState);
  const hasLeadTime = cart.items.some((item) => item.leadTimeDays > 0);

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
          <label htmlFor="customerName">שם מלא</label>
          <input id="customerName" name="customerName" type="text" required />
        </div>
        <div className={styles.field}>
          <label htmlFor="customerPhone">טלפון</label>
          <input id="customerPhone" name="customerPhone" type="tel" required />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="customerEmail">אימייל</label>
        <input id="customerEmail" name="customerEmail" type="email" required />
      </div>

      <div className={styles.field}>
        <label htmlFor="pickupDate">תאריך איסוף</label>
        <input
          id="pickupDate"
          name="pickupDate"
          type="date"
          min={cart.minPickupDate}
          defaultValue={cart.minPickupDate}
          required
        />
        {hasLeadTime && (
          <p className={styles.fieldNote}>
            חלק מהמוצרים בעגלה דורשים הכנה מראש — האיסוף המוקדם ביותר האפשרי הוא{" "}
            {cart.minPickupDate}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="notes">הערות להזמנה (אופציונלי)</label>
        <textarea id="notes" name="notes" placeholder="למשל: רגישות/אלרגיה, בקשה מיוחדת..." />
      </div>

      {state.error && <p className={styles.error}>{state.error}</p>}

      <button type="submit" className={styles.submitBtn} disabled={pending}>
        {pending ? "מעבד..." : "המשך לתשלום"}
      </button>
    </form>
  );
}
