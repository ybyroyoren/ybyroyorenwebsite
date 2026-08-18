"use client";

import { useActionState } from "react";
import { subscribeToNewsletter, type NewsletterState } from "@/lib/actions/newsletter";
import { getDict, type Locale } from "@/lib/dictionary";
import styles from "./Footer.module.css";

const initialState: NewsletterState = { status: "idle", message: "" };

export function NewsletterForm({
  source = "footer",
  locale,
}: {
  source?: "footer" | "events_form";
  locale: Locale;
}) {
  const [state, action, pending] = useActionState(subscribeToNewsletter, initialState);
  const t = getDict(locale).footer;

  return (
    <>
      <form className={styles.newsletterForm} action={action}>
        <input type="hidden" name="source" value={source} />
        <input type="email" name="email" placeholder={t.newsletterPlaceholder} required />
        <button type="submit" disabled={pending}>
          {pending ? t.newsletterSubmitting : t.newsletterSubmit}
        </button>
      </form>
      {state.message && <p className={styles.newsletterMsg}>{state.message}</p>}
    </>
  );
}
