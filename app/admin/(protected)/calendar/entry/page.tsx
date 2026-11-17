import Link from "next/link";
import { requireAdminSection } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { deleteCalendarEntry, saveCalendarEntry } from "@/lib/actions/admin/calendar";
import { ENTRY_KINDS, entryFromRow, type EntryKind } from "@/lib/calendarEntries";
import { todayIsraelIso } from "@/lib/date";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import styles from "../../../admin.module.css";
import e from "./entry.module.css";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function CalendarEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; date?: string; kind?: string; error?: string }>;
}) {
  await requireAdminSection("calendar");
  const { id, date, kind, error } = await searchParams;

  const row = id ? (await supabaseAdmin().from("calendar_entries").select("*").eq("id", id).maybeSingle()).data : null;
  const entry = row ? entryFromRow(row) : null;

  const startDate = entry?.startDate ?? (date && ISO_DATE.test(date) ? date : todayIsraelIso());
  const currentKind: EntryKind = entry?.kind ?? (kind === "note" || kind === "blocked" ? kind : "meeting");

  return (
    <>
      <h1>{entry ? "עריכת רשומה" : "רשומה חדשה בלוח"}</h1>

      {entry?.source === "google" && <p className={styles.muted}>הרשומה נוצרה ב-Google Calendar. שינויים כאן יופיעו גם שם.</p>}
      {error && <p className={styles.error}>{error}</p>}

      <form action={saveCalendarEntry} className={styles.card}>
        {entry && <input type="hidden" name="id" value={entry.id} />}

        <div className={e.kinds}>
          {ENTRY_KINDS.map((k) => (
            <label key={k.value} className={e.kind}>
              <input type="radio" name="kind" value={k.value} defaultChecked={currentKind === k.value} />
              <span>
                {k.label}
                <small>{k.hint}</small>
              </span>
            </label>
          ))}
        </div>

        <div className={e.grid}>
          <div className={`${styles.field} ${e.full}`}>
            <label htmlFor="title">כותרת</label>
            <input id="title" name="title" required defaultValue={entry?.title ?? ""} placeholder="למשל: פגישה עם ספק הירקות / דנה בחופשה" />
          </div>
          <div className={styles.field}>
            <label htmlFor="startDate">תאריך</label>
            <input id="startDate" name="startDate" type="date" required defaultValue={startDate} />
          </div>
          <div className={styles.field}>
            <label htmlFor="endDate">עד תאריך (אם זה כמה ימים)</label>
            <input id="endDate" name="endDate" type="date" defaultValue={entry && entry.endDate !== entry.startDate ? entry.endDate : ""} />
          </div>
          <div className={styles.field}>
            <label htmlFor="startTime">משעה (ריק = כל היום)</label>
            <input id="startTime" name="startTime" type="time" defaultValue={entry?.startTime ?? ""} />
          </div>
          <div className={styles.field}>
            <label htmlFor="endTime">עד שעה</label>
            <input id="endTime" name="endTime" type="time" defaultValue={entry?.endTime ?? ""} />
          </div>
          <div className={`${styles.field} ${e.full}`}>
            <label htmlFor="location">מקום</label>
            <input id="location" name="location" defaultValue={entry?.location ?? ""} />
          </div>
          <div className={`${styles.field} ${e.full}`}>
            <label htmlFor="details">פרטים והערות</label>
            <textarea id="details" name="details" rows={4} defaultValue={entry?.details ?? ""} />
          </div>
        </div>

        <div className={e.actions}>
          <button type="submit" className={styles.btn}>
            שמירה
          </button>
          <Link href="/admin/calendar" className={styles.btnSecondary}>
            ביטול
          </Link>
        </div>
      </form>

      {entry && (
        <form action={deleteCalendarEntry}>
          <input type="hidden" name="id" value={entry.id} />
          <ConfirmButton className={styles.btnDanger} message="למחוק את הרשומה? היא תימחק גם מ-Google Calendar.">
            מחיקת הרשומה
          </ConfirmButton>
        </form>
      )}
    </>
  );
}
