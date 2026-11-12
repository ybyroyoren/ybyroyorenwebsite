"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { seatsDisplay } from "@/lib/seats";
import type { SeatsMeterMode, SeatsTextMode } from "@/lib/supabase/types";
import styles from "@/app/admin/admin.module.css";

const TEXT_OPTIONS: { value: SeatsTextMode; label: string; hint: string }[] = [
  { value: "auto", label: "אוטומטי", hint: "״פתוח להרשמה״ כשאין נרשמים, ״מתמלא״ מהנרשם הראשון, ״נשארו מעט מקומות״ כשנשארו 13 או פחות, והמספר המדויק כשנשארו 7 או פחות" },
  { value: "open", label: "תמיד ״פתוח להרשמה״", hint: "לא משתנה כשאנשים נרשמים" },
  { value: "few", label: "״נשארו מעט מקומות״", hint: "מופיע רק כשבאמת נשארו 13 מקומות או פחות, אחרת ״פתוח להרשמה״ / ״מתמלא״" },
  { value: "exact", label: "״נשארו N מקומות״", hint: "המספר האמיתי, תמיד" },
  { value: "custom", label: "טקסט משלי", hint: "כל משפט שתרצה, למשל ״ארוחה עם שף אורח״ או ״ההרשמה נסגרת ביום ראשון״" },
  { value: "hidden", label: "בלי טקסט", hint: "מסתיר את שורת הטקסט" },
  { value: "full", label: "סגור להרשמה (מוצג ״מלא״)", hint: "חוסם הרשמה באמת, גם אם נשארו מקומות" },
];

const METER_OPTIONS: { value: SeatsMeterMode; label: string; hint: string }[] = [
  { value: "auto", label: "אוטומטי", hint: "12.5% כשאין נרשמים, 25% מהנרשם הראשון, 50% כשנשארו מעט, ואחר כך לפי המלא בפועל" },
  { value: "real", label: "המצב האמיתי", hint: "כל סועד מקדם את המד באופן ישר ומדויק" },
  { value: "hidden", label: "בלי מד", hint: "מסתיר את המד" },
];

/** Per-meal control of how seats are shown on the public page: the text and the meter separately, with a live preview. */
export function MealSeatsDisplay({
  mealId,
  total,
  taken,
  remaining,
  initial,
  saveAction,
}: {
  mealId: string;
  total: number;
  taken: number;
  remaining: number;
  initial: { textMode: SeatsTextMode; textHe: string; textEn: string; meterMode: SeatsMeterMode };
  saveAction: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [textMode, setTextMode] = useState(initial.textMode);
  const [textHe, setTextHe] = useState(initial.textHe);
  const [textEn, setTextEn] = useState(initial.textEn);
  const [meterMode, setMeterMode] = useState(initial.meterMode);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const preview = seatsDisplay({ remaining, total, taken, textMode, textHe, textEn, meterMode }, "he");
  const dirty = textMode !== initial.textMode || textHe !== initial.textHe || textEn !== initial.textEn || meterMode !== initial.meterMode;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await saveAction(new FormData(e.currentTarget));
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <details style={{ marginTop: 14 }}>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>
        תצוגת המקומות באתר <span className={styles.muted}>(מד וטקסט, בנפרד)</span>
      </summary>
      <form onSubmit={save} className={styles.form} style={{ marginTop: 12 }} onChange={() => setSaved(false)}>
        <input type="hidden" name="id" value={mealId} />
        <div className={styles.field} style={{ width: "100%" }}>
          <p className={styles.muted}>
            המצב האמיתי: <b>{taken}</b> רשומים מתוך {total}, נשארו <b>{remaining}</b> מקומות. ההגדרות כאן משנות רק את מה שהגולשים רואים, והמספרים האמיתיים לא משתנים.
          </p>
        </div>

        <div className={styles.field} style={{ minWidth: 260, flex: 1 }}>
          <label>הטקסט</label>
          <select name="textMode" value={textMode} onChange={(e) => setTextMode(e.target.value as SeatsTextMode)}>
            {TEXT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <small className={styles.hint}>{TEXT_OPTIONS.find((o) => o.value === textMode)?.hint}</small>
        </div>

        <div className={styles.field} style={{ minWidth: 260, flex: 1 }}>
          <label>המד</label>
          <select name="meterMode" value={meterMode} onChange={(e) => setMeterMode(e.target.value as SeatsMeterMode)}>
            {METER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <small className={styles.hint}>{METER_OPTIONS.find((o) => o.value === meterMode)?.hint}</small>
        </div>

        {textMode === "custom" && (
          <>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>הטקסט בעברית</label>
              <input name="textHe" type="text" maxLength={120} value={textHe} onChange={(e) => setTextHe(e.target.value)} placeholder="למשל: ארוחה עם שף אורח" />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>הטקסט באנגלית (ריק = יוצג הטקסט בעברית)</label>
              <input name="textEn" type="text" maxLength={120} value={textEn} onChange={(e) => setTextEn(e.target.value)} />
            </div>
            <p className={styles.sectionNote} style={{ width: "100%" }}>
              הטקסט שלך מוצג כמו שהוא. כדאי לכתוב רק דברים נכונים: טענות כמו ״נשארו רק 3 מקומות״ כשבפועל נשארו הרבה נחשבות הטעיה של צרכנים לפי החוק.
            </p>
          </>
        )}

        <div className={styles.explainBox} style={{ width: "100%" }}>
          <b>כך זה נראה באתר:</b>
          <div style={{ marginTop: 8, maxWidth: 260 }}>
            {preview.pct !== null && (
              <div style={{ height: 6, borderRadius: 999, background: "var(--olive-mist)", overflow: "hidden", marginBottom: 8 }}>
                <div style={{ height: "100%", width: `${preview.pct}%`, background: "var(--olive-deep)", borderRadius: 999 }} />
              </div>
            )}
            <div style={{ fontWeight: 600, color: preview.low ? "var(--danger)" : undefined }}>{preview.label ?? "(בלי טקסט)"}</div>
            {preview.closed && <div className={styles.muted}>ההרשמה חסומה לארוחה הזו.</div>}
          </div>
        </div>

        <button type="submit" className={styles.btn} disabled={saving || !dirty}>
          {saving ? "שומר..." : "שמירה"}
        </button>
        {saved && !dirty && <span className={styles.success}>נשמר</span>}
      </form>
    </details>
  );
}
