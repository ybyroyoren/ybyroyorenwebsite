"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { recordAdminLogin, recordFailedLogin } from "@/lib/actions/admin/session";
import styles from "../admin.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const supabase = supabaseBrowser();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      void recordFailedLogin(email);
      setError("אימייל או סיסמה שגויים");
      setPending(false);
      return;
    }

    // Logging the sign-in must never hold the user up: it runs in the background, retrying while the
    // session cookie isn't visible to the server yet.
    void (async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        const ok = await recordAdminLogin().catch(() => false);
        if (ok) return;
        await new Promise((r) => setTimeout(r, 800));
      }
    })();
    router.push("/admin");
    router.refresh();
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
        </div>
      </form>
    </div>
  );
}
