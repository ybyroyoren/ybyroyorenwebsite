"use client";

import { useMemo, useState } from "react";
import styles from "@/app/(site)/events/page.module.css";

const EVENT_TYPES = [
  { value: "family", label: "ערב משפחתי" },
  { value: "corporate", label: "אירוע חברה" },
  { value: "wedding", label: "חתונה" },
  { value: "birthday", label: "יום הולדת" },
  { value: "holiday", label: "ארוחת חג" },
  { value: "bachelor", label: "מסיבת רווקים/ות" },
  { value: "barmitzvah", label: "בר מצווה" },
  { value: "other", label: "אחר" },
];

const HOURS = Array.from({ length: 16 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);

type Location = "venue" | "other" | null;
type Format = "buffet" | "seated" | "other" | null;

function guestRange(location: Location, format: Format): { min: number; max: number | null; label: string | null } {
  if (location === "venue" && format === "seated") return { min: 10, max: 24, label: "אצלנו, בישיבה" };
  if (location === "venue" && format === "buffet") return { min: 10, max: 60, label: "אצלנו, עמידה" };
  if (location === "other" && format === "seated") return { min: 10, max: 30, label: "אירוע חוץ, סביב שולחן" };
  return { min: 10, max: null, label: null };
}

export function EventsForm() {
  const [eventType, setEventType] = useState<string | null>(null);
  const [location, setLocation] = useState<Location>(null);
  const [format, setFormat] = useState<Format>(null);
  const [service, setService] = useState<string | null>(null);
  const [guests, setGuests] = useState(10);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => guestRange(location, format), [location, format]);

  function clamp(value: number): number {
    let v = value;
    if (v < range.min) v = range.min;
    if (range.max && v > range.max) v = range.max;
    return v;
  }

  function setGuestsClamped(value: number) {
    setGuests(clamp(value));
  }

  const guestNote = range.max
    ? `טווח מותר: ${range.min} עד ${range.max} סועדים (${range.label}) · מינימום חיוב על ${range.min}` +
      (location === "other" && guests > 30
        ? " · לאירועים מעל 30 סועדים נדרשת השכרת ציוד מחברה חיצונית; העלות מועברת ללקוח כפי שהיא, בנוסף למחיר האירוע."
        : "")
    : `מינימום חיוב: ${range.min} סועדים, גם אם מגיעים פחות`;

  if (submitted) {
    return (
      <p className={styles.successMsg}>
        תודה! הפנייה נקלטה ואחזור אליכם בדרך כלל תוך יום עסקים אחד.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!eventType) return setError("נא לבחור סוג אירוע");
    if (!location) return setError("נא לבחור מיקום אירוע");
    if (!format) return setError("נא לבחור סגנון הגשה");

    const form = e.currentTarget;
    const data = new FormData(form);

    setSubmitting(true);
    try {
      const res = await fetch("/api/events/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          fullName: String(data.get("fullName") ?? ""),
          phone: String(data.get("phone") ?? ""),
          email: String(data.get("email") ?? ""),
          eventDate: String(data.get("date") ?? ""),
          startTime: String(data.get("startTime") ?? ""),
          locationType: location,
          locationDetail: String(data.get("locationDetail") ?? ""),
          format,
          serviceStyle: service ?? "",
          guestCount: guests,
          details: String(data.get("details") ?? ""),
          newsletterOptIn: data.get("newsletter") === "on",
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        setError(result.error ?? "משהו השתבש, נסו שוב");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("משהו השתבש, נסו שוב");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label>
          סוג האירוע <span className={styles.req}>*</span>
        </label>
        <div className={styles.chips}>
          {EVENT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`${styles.chip} ${eventType === t.value ? styles.selected : ""}`}
              onClick={() => setEventType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor="fullName">
            שם מלא <span className={styles.req}>*</span>
          </label>
          <input id="fullName" name="fullName" type="text" required />
        </div>
        <div className={styles.field}>
          <label htmlFor="phone">
            טלפון <span className={styles.req}>*</span>
          </label>
          <input id="phone" name="phone" type="tel" required />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="email">
          אימייל <span className={styles.req}>*</span>
        </label>
        <input id="email" name="email" type="email" required />
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor="date">תאריך רצוי</label>
          <input id="date" name="date" type="date" />
        </div>
        <div className={styles.field}>
          <label htmlFor="startTime">שעת התחלה</label>
          <select id="startTime" name="startTime" defaultValue={HOURS[0]}>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label>
          מיקום האירוע <span className={styles.req}>*</span>
        </label>
        <div className={styles.chips}>
          <button
            type="button"
            className={`${styles.chip} ${location === "venue" ? styles.selected : ""}`}
            onClick={() => setLocation("venue")}
          >
            אצלנו, בחלל האירוח
          </button>
          <button
            type="button"
            className={`${styles.chip} ${location === "other" ? styles.selected : ""}`}
            onClick={() => setLocation("other")}
          >
            בלוקיישן אחר
          </button>
        </div>
        {location === "other" && (
          <input
            type="text"
            name="locationDetail"
            placeholder="פרטי המיקום (כתובת / סוג המקום)"
            style={{ marginTop: 6 }}
          />
        )}
        {location === "venue" && (
          <p className={styles.fieldNote}>📍 חלל האירוח שלנו: רחוב השוק 34, תל אביב</p>
        )}
      </div>

      <div className={styles.field}>
        <label>
          סגנון ההגשה <span className={styles.req}>*</span>
        </label>
        <div className={styles.chips}>
          <button
            type="button"
            className={`${styles.chip} ${format === "buffet" ? styles.selected : ""}`}
            onClick={() => setFormat("buffet")}
          >
            בופה (עמידה, דרינקים וביסים)
          </button>
          <button
            type="button"
            className={`${styles.chip} ${format === "seated" ? styles.selected : ""}`}
            onClick={() => setFormat("seated")}
          >
            ארוחת שף מלאה, סביב שולחן
          </button>
          <button
            type="button"
            className={`${styles.chip} ${format === "other" ? styles.selected : ""}`}
            onClick={() => setFormat("other")}
          >
            אחר
          </button>
        </div>
        {format === "seated" && (
          <div className={styles.chips} style={{ marginTop: 10 }}>
            <button
              type="button"
              className={`${styles.chip} ${service === "plated" ? styles.selected : ""}`}
              onClick={() => setService("plated")}
            >
              הגשה אישית לצלחת
            </button>
            <button
              type="button"
              className={`${styles.chip} ${service === "family" ? styles.selected : ""}`}
              onClick={() => setService("family")}
            >
              הגשה למרכז השולחן
            </button>
          </div>
        )}
      </div>

      <div className={styles.field}>
        <label>מספר אורחים משוער</label>
        <div className={styles.guestStepper}>
          <button type="button" onClick={() => setGuestsClamped(guests - 1)}>
            −
          </button>
          <input
            type="number"
            value={guests}
            min={range.min}
            onChange={(e) => setGuestsClamped(Number(e.target.value) || range.min)}
          />
          <button type="button" onClick={() => setGuestsClamped(guests + 1)}>
            +
          </button>
        </div>
        <p className={styles.fieldNote}>{guestNote}</p>
      </div>

      <div className={styles.field}>
        <label htmlFor="details">ספרו לי קצת על האירוע</label>
        <textarea
          id="details"
          name="details"
          placeholder="תפריט חלומי, אילוצי תזונה, תקציב משוער, כל מה שחשוב לדעת..."
        />
      </div>

      <label className={styles.checkboxRow}>
        <input type="checkbox" name="newsletter" />
        <span>אשמח לקבל עדכונים על ארוחות פתוחות ומוצרים חדשים</span>
      </label>

      <p className={styles.fieldNote}>
        בכל אירוע פרטי נוספת עלות קבועה של ₪600 לצוות ניקיון ושטיפת כלים. באירועי חוץ, החלל
        מוחזר נקי לחלוטין בסיום.
      </p>

      {error && <p style={{ color: "var(--danger)", fontSize: 13.5 }}>{error}</p>}

      <button type="submit" className={styles.submitBtn} disabled={submitting}>
        {submitting ? "שולח..." : "שליחת פנייה"}
      </button>
      <p className={styles.footnote}>אחזור אליכם בדרך כלל תוך יום עסקים אחד</p>
    </form>
  );
}
