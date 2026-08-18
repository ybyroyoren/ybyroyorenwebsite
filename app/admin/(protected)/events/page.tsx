import { requireAdminSection } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { deleteInquiry, updateInquiryStatus } from "@/lib/actions/admin/events";
import styles from "../../admin.module.css";

const EVENT_TYPE_LABELS: Record<string, string> = {
  family: "ערב משפחתי",
  corporate: "אירוע חברה",
  wedding: "חתונה",
  birthday: "יום הולדת",
  holiday: "ארוחת חג",
  bachelor: "מסיבת רווקים/ות",
  barmitzvah: "בר מצווה",
  other: "אחר",
};

const FORMAT_LABELS: Record<string, string> = {
  buffet: "בופה",
  seated: "ארוחת שף מלאה",
  other: "אחר",
};

const SERVICE_LABELS: Record<string, string> = {
  plated: "הגשה אישית",
  family: "הגשה למרכז השולחן",
};

const STATUS_LABELS: Record<string, string> = {
  new: "חדש",
  contacted: "נוצר קשר",
  quoted: "נשלחה הצעת מחיר",
  approved_unpaid: "אושר אך לא שולם",
  deposit_paid: "הועברה מקדמה",
  paid_closed: "שולם ונסגר",
  closed: "סגור",
};

const DONE_STATUSES = new Set(["paid_closed", "closed"]);

export default async function AdminEventsPage() {
  const admin = await requireAdminSection("events");
  const isOwner = admin.role === "owner";
  const db = supabaseAdmin();
  const { data: inquiries } = await db
    .from("event_inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <h1>פניות לאירועים פרטיים</h1>

      {(inquiries ?? []).map((inq) => (
        <div key={inq.id} className={styles.card}>
          <h2>
            {EVENT_TYPE_LABELS[inq.event_type] ?? inq.event_type} — {inq.full_name}{" "}
            <span
              className={DONE_STATUSES.has(inq.status) ? styles.badgePaid : styles.badgePending}
              style={{ marginRight: 10 }}
            >
              {STATUS_LABELS[inq.status]}
            </span>
          </h2>
          <dl className={styles.details}>
            <dt>טלפון</dt>
            <dd>{inq.phone}</dd>
            <dt>אימייל</dt>
            <dd>{inq.email}</dd>

            <dt>תאריך רצוי</dt>
            <dd>
              {inq.event_date ?? "לא צוין"} {inq.start_time ?? ""}
            </dd>
            <dt>מיקום</dt>
            <dd>{inq.location_type === "venue" ? "אצלנו" : `חוץ — ${inq.location_detail || "—"}`}</dd>

            <dt>סגנון</dt>
            <dd>
              {FORMAT_LABELS[inq.format] ?? inq.format}
              {inq.service_style ? ` (${SERVICE_LABELS[inq.service_style]})` : ""}
            </dd>
            <dt>מספר אורחים</dt>
            <dd>{inq.guest_count}</dd>

            <dt>ניוזלטר</dt>
            <dd>{inq.newsletter_opt_in ? "כן" : "לא"}</dd>
            <dt>התקבל</dt>
            <dd>{new Date(inq.created_at).toLocaleDateString("he-IL")}</dd>

            {inq.details && (
              <>
                <dt>פרטים</dt>
                <dd style={{ gridColumn: "2 / -1" }}>{inq.details}</dd>
              </>
            )}
          </dl>

          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginTop: 12 }}>
            <form action={updateInquiryStatus} className={styles.form}>
              <input type="hidden" name="id" value={inq.id} />
              <div className={styles.field}>
                <label>סטטוס</label>
                <select name="status" defaultValue={inq.status}>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className={styles.btnSecondary}>
                עדכון סטטוס
              </button>
            </form>
            {isOwner && (
              <form action={deleteInquiry}>
                <input type="hidden" name="id" value={inq.id} />
                <button type="submit" className={styles.btnDanger}>
                  מחיקת פנייה
                </button>
              </form>
            )}
          </div>
        </div>
      ))}

      {(inquiries ?? []).length === 0 && <p className={styles.muted}>אין פניות עדיין.</p>}
    </>
  );
}
