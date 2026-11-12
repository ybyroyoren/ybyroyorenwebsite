"use client";

import { track } from "@/lib/analytics/client";
import { useActionState, useEffect, useState } from "react";
import { submitCheckout, type CheckoutState } from "@/lib/actions/checkout";
import { useCart } from "@/components/cart/CartContext";
import { getDict, type Locale } from "@/lib/dictionary";
import styles from "@/app/(site)/[locale]/checkout/page.module.css";

const initialState: CheckoutState = { error: null };

export function CheckoutForm({ locale }: { locale: Locale }) {
  const cart = useCart();
  const [state, action, pending] = useActionState(submitCheckout, initialState);
  const hasLeadTime = cart.items.some((item) => item.leadTimeDays > 0);
  const f = getDict(locale).checkout.form;

  // Is every product in the cart still available on the chosen pickup date (stock, daily limits)?
  const [pickupDate, setPickupDate] = useState(cart.minPickupDate);
  const [availability, setAvailability] = useState<{ problems: string[]; alternatives: string[] }>({ problems: [], alternatives: [] });
  const cartKey = cart.items.map((i) => `${i.productSizeId}:${i.qty}`).join(",");
  useEffect(() => {
    if (!pickupDate || cart.items.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/cart/availability?date=${encodeURIComponent(pickupDate)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled && data) setAvailability({ problems: data.problems ?? [], alternatives: data.alternatives ?? [] });
        })
        .catch(() => {});
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupDate, cartKey]);
  const blocked = availability.problems.length > 0;

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
        <label htmlFor="pickupDate">{f.pickupDateLabel}</label>
        <input
          id="pickupDate"
          name="pickupDate"
          type="date"
          min={cart.minPickupDate}
          value={pickupDate}
          onChange={(e) => setPickupDate(e.target.value)}
          required
        />
        {blocked && (
          <div className={styles.error} role="alert">
            {availability.problems.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {availability.alternatives.length > 0 && (
              <p>
                {locale === "en" ? "Dates that work: " : "תאריכים פנויים: "}
                {availability.alternatives.map((d) => (
                  <button key={d} type="button" className={styles.altDate} onClick={() => setPickupDate(d)}>
                    {d.split("-").reverse().join(".")}
                  </button>
                ))}
              </p>
            )}
          </div>
        )}
        {hasLeadTime && <p className={styles.fieldNote}>{f.leadTimeNote(cart.minPickupDate)}</p>}
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
