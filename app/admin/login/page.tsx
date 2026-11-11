"use client";

import Link from "next/link";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { recordAdminLogin, recordFailedLogin } from "@/lib/actions/admin/session";
import styles from "../admin.module.css";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    try {
      const supabase = supabaseBrowser();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        void recordFailedLogin(email).catch(() => {});
        setError("אימייל או סיסמה שגויים");
        setPending(false);
        return;
      }

      // Note the sign-in in the activity log, but never let that hold the user up: at most ~1.5 seconds.
      await Promise.race([
        (async () => {
          for (let attempt = 0; attempt < 3; attempt++) {
            const ok = await recordAdminLogin().catch(() => false);
            if (ok) return;
            await new Promise((r) => setTimeout(r, 300));
          }
        })(),
        new Promise((r) => setTimeout(r, 1500)),
      ]);
    } catch {
      setError("משהו השתבש בכניסה. נסו לרענן את הדף ולהיכנס שוב.");
      setPending(false);
      return;
    }

    // A full page load (not a client-side navigation): the new session cookie is sent for sure, and
    // the form can never be left "connecting" by a router that is waiting on something.
    window.location.assign("/admin");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ink)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        className={styles.card}
        style={{ width: 340, background: "var(--cream)" }}
      >
        <h2>כניסה לפאנל ניהול</h2>
        <div className={styles.form} style={{ flexDirection: "column", alignItems: "stretch" }}>
          <div className={styles.field}>
            <label htmlFor="email">אימייל</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">סיסמה</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.btn} disabled={pending}>
            {pending ? "מתחבר..." : "כניסה"}
          </button>
          <Link href="/admin/forgot-password" className={styles.muted} style={{ textAlign: "center" }}>
            שכחתי סיסמה
          </Link>
        </div>
      </form>
    </div>
  );
}
