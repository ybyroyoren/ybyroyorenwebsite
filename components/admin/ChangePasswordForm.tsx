"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { recordPasswordChange } from "@/lib/actions/admin/password";
import styles from "@/app/admin/admin.module.css";

export function ChangePasswordForm({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (next.length < 8) return setMessage({ ok: false, text: "הסיסמה החדשה חייבת להכיל לפחות 8 תווים." });
    if (next !== confirm) return setMessage({ ok: false, text: "שתי הסיסמאות החדשות לא זהות." });
    if (next === current) return setMessage({ ok: false, text: "הסיסמה החדשה חייבת להיות שונה מהנוכחית." });

    setPending(true);
    try {
      const supabase = supabaseBrowser();
      // Prove it's really them: the current password has to be right.
      const { error: checkError } = await supabase.auth.signInWithPassword({ email, password: current });
      if (checkError) {
        setMessage({ ok: false, text: "הסיסמה הנוכחית שגויה." });
        setPending(false);
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) {
        setMessage({ ok: false, text: /weak|short|least/i.test(updateError.message) ? "הסיסמה חלשה מדי. בחרו סיסמה ארוכה יותר." : "לא ניתן היה להחליף את הסיסמה. נסו שוב." });
        setPending(false);
        return;
      }
      await Promise.race([recordPasswordChange("change").catch(() => false), new Promise((r) => setTimeout(r, 1500))]);
      setCurrent("");
      setNext("");
      setConfirm("");
      setMessage({ ok: true, text: "הסיסמה הוחלפה. הכניסה הבאה תהיה עם הסיסמה החדשה." });
    } catch {
      setMessage({ ok: false, text: "משהו השתבש. נסו שוב." });
    }
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} style={{ flexDirection: "column", alignItems: "stretch", maxWidth: 380 }}>
      <div className={styles.field}>
        <label htmlFor="current">סיסמה נוכחית</label>
        <input id="current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
      </div>
      <div className={styles.field}>
        <label htmlFor="next">סיסמה חדשה (לפחות 8 תווים)</label>
        <input id="next" type="password" value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" />
      </div>
      <div className={styles.field}>
        <label htmlFor="confirm">הקלדה חוזרת של הסיסמה החדשה</label>
        <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
      </div>
      {message && <p className={message.ok ? styles.success : styles.error}>{message.text}</p>}
      <button type="submit" className={styles.btn} disabled={pending}>
        {pending ? "שומר..." : "החלפת סיסמה"}
      </button>
    </form>
  );
}
