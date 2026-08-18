"use client";

import { useActionState } from "react";
import { submitContactForm, type ContactState } from "@/lib/actions/contact";
import { getDict, type Locale } from "@/lib/dictionary";
import styles from "@/app/(site)/contact/page.module.css";

const initialState: ContactState = { status: "idle", message: "" };

export function ContactForm({ locale }: { locale: Locale }) {
  const [state, action, pending] = useActionState(submitContactForm, initialState);
  const f = getDict(locale).contact.form;

  return (
    <form className={styles.form} action={action}>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor="name">{f.nameLabel}</label>
          <input id="name" name="name" type="text" required />
        </div>
        <div className={styles.field}>
          <label htmlFor="phone">{f.phoneLabel}</label>
          <input id="phone" name="phone" type="tel" required />
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="email">{f.emailLabel}</label>
        <input id="email" name="email" type="email" required />
      </div>
      <div className={styles.field}>
        <label htmlFor="message">{f.messageLabel}</label>
        <textarea id="message" name="message" placeholder={f.messagePlaceholder} required />
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
        {pending ? f.submitting : f.submit}
      </button>
      <p className={styles.footnote}>{f.footnote}</p>
    </form>
  );
}
