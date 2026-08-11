"use client";

import { useActionState } from "react";
import { subscribeToNewsletter, type NewsletterState } from "@/lib/actions/newsletter";
import styles from "./Footer.module.css";

const initialState: NewsletterState = { status: "idle", message: "" };

export function NewsletterForm({ source = "footer" }: { source?: "footer" | "events_form" }) {
  const [state, action, pending] = useActionState(subscribeToNewsletter, initialState);

  return (
    <>
      <form className={styles.newsletterForm} action={action}>
        <input type="hidden" name="source" value={source} />
        <input type="email" name="email" placeholder="האימייל שלכם" required />
        <button type="submit" disabled={pending}>
          {pending ? "..." : "הרשמה"}
        </button>
      </form>
      {state.message && <p className={styles.newsletterMsg}>{state.message}</p>}
    </>
  );
}
