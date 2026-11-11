"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { recordPasswordChange } from "@/lib/actions/admin/password";
import styles from "../admin.module.css";

function ResetForm() {
  const params = useSearchParams();
  const tokenHash = params.get("token_hash");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkProblem, setLinkProblem] = useState(!tokenHash);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("הסיסמה חייבת להכיל לפחות 8 תווים.");
    if (password !== confirm) return setError("שתי הסיסמאות לא זהות.");

    setPending(true);
    try {
      const supabase = supabaseBrowser();
      // The one-time link is only used up now, when the new password is submitted.
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash ?? "", type: "recovery" });
      if (verifyError) {
        setLinkProblem(true);
        setPending(false);
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(/different|same/i.test(updateError.message) ? "הסיסמה החדשה חייבת להיות שונה מהקודמת." : /weak|short|least/i.test(updateError.message) ? "הסיסמה חלשה מדי. בחרו סיסמה ארוכה יותר." : "לא ניתן היה לשמור את הסיסמה. נסו שוב.");
        setPending(false);
        return;
      }
      await Promise.race([recordPasswordChange("reset").catch(() => false), new Promise((r) => setTimeout(r, 1500))]);
      window.location.assign("/admin");
    } catch {
      setError("משהו השתבש. נסו שוב.");
      setPending(false);
    }
  }

  if (linkProblem) {
    return (
      <>
        <h2>הקישור לא תקף</h2>
        <p>הקישור פג תוקף או שכבר נעשה בו שימוש. אפשר לבקש קישור חדש.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <Link href="/admin/forgot-password" className={styles.btn}>
            בקשת קישור חדש
          </Link>
          <Link href="/" className={styles.btnSecondary}>
            חזרה לאתר
          </Link>
        </div>
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>בחירת סיסמה חדשה</h2>
      <div className={styles.form} style={{ flexDirection: "column", alignItems: "stretch" }}>
        <div className={styles.field}>
          <label htmlFor="password">סיסמה חדשה (לפחות 8 תווים)</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
        </div>
        <div className={styles.field}>
          <label htmlFor="confirm">הקלדה חוזרת</label>
          <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.btn} disabled={pending}>
          {pending ? "שומר..." : "שמירה וכניסה"}
        </button>
        <Link href="/" className={styles.btnSecondary} style={{ display: "block", textAlign: "center" }}>
          חזרה לאתר
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ink)", padding: 16 }}>
      <div className={styles.card} style={{ width: 360, maxWidth: "100%", background: "var(--cream)" }}>
        <Suspense fallback={null}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
