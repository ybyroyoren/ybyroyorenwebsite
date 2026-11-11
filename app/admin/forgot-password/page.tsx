"use client";

import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "@/lib/actions/admin/password";
import styles from "../admin.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch {
      setError("משהו השתבש. נסו שוב בעוד רגע.");
    }
    setPending(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ink)", padding: 16 }}>
      <form onSubmit={handleSubmit} className={styles.card} style={{ width: 360, maxWidth: "100%", background: "var(--cream)" }}>
        <h2>שחזור סיסמה</h2>
        {sent ? (
          <>
            <p>
              אם הכתובת <b>{email}</b> שייכת למשתמש בתוכנת הניהול, נשלח אליה עכשיו מייל עם קישור לבחירת סיסמה חדשה. הקישור תקף לשעה.
            </p>
            <p className={styles.muted}>לא הגיע? בדקו בתיקיית הספאם, או נסו שוב בעוד כמה דקות.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              <Link href="/admin/login" className={styles.btnSecondary}>
                חזרה לכניסה
              </Link>
              <Link href="/" className={styles.btnSecondary}>
                חזרה לאתר
              </Link>
            </div>
          </>
        ) : (
          <div className={styles.form} style={{ flexDirection: "column", alignItems: "stretch" }}>
            <p className={styles.muted}>הזינו את האימייל שלכם ונשלח אליו קישור לבחירת סיסמה חדשה.</p>
            <div className={styles.field}>
              <label htmlFor="email">אימייל</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.btn} disabled={pending}>
              {pending ? "שולח..." : "שליחת קישור"}
            </button>
            <Link href="/admin/login" className={styles.muted} style={{ textAlign: "center" }}>
              חזרה לכניסה
            </Link>
            <Link href="/" className={styles.btnSecondary} style={{ display: "block", textAlign: "center", marginTop: 4 }}>
              חזרה לאתר
            </Link>
          </div>
        )}
      </form>
    </div>
  );
}
