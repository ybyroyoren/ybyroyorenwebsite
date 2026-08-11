"use client";

import { useActionState } from "react";
import { submitContactForm, type ContactState } from "@/lib/actions/contact";
import styles from "@/app/(site)/contact/page.module.css";

const initialState: ContactState = { status: "idle", message: "" };

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContactForm, initialState);

  return (
    <form className={styles.form} action={action}>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor="name">שם מלא</label>
          <input id="name" name="name" type="text" required />
        </div>
        <div className={styles.field}>
          <label htmlFor="phone">טלפון</label>
          <input id="phone" name="phone" type="tel" required />
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="email">אימייל</label>
        <input id="email" name="email" type="email" required />
      </div>
      <div className={styles.field}>
        <label htmlFor="message">הודעה</label>
        <textarea id="message" name="message" placeholder="איך אפשר לעזור?" required />
      </div>

      {state.message && (
        <p
          className={styles.resultMsg}
          style={{ color: state.status === "error" ? "var(--danger)" : "var(--olive-deep)" }}
        >
          {state.message}
        </p>
      )}

      <button type="submit" className={styles.submitBtn} disabled={pending}>
        {pending ? "שולח..." : "שליחה"}
      </button>
      <p className={styles.footnote}>
        לתיאום אירוע פרטי, מומלץ להשתמש בטופס הייעודי בעמוד האירועים הפרטיים.
      </p>
    </form>
  );
}
