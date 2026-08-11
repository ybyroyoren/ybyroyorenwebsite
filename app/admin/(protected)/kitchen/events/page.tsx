import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getEvents } from "@/lib/kitchen/data";
import styles from "../../../admin.module.css";
import kitchenStyles from "../kitchen.module.css";

const WEEKDAY_LABEL = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

function formatEventDate(date: string | null): string {
  if (!date) return "ללא תאריך";
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return `יום ${WEEKDAY_LABEL[d.getDay()]}׳, ${date}`;
}

export default async function KitchenEventsPage() {
  const admin = await requireAdmin();
  const isOwner = admin.role === "owner";
  const events = await getEvents();

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>אירועים</h1>
        {isOwner && (
          <Link href="/admin/kitchen/events/new" className={styles.btn}>
            אירוע חדש
          </Link>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginTop: 16 }}>
        {events.map((ev) => (
          <div key={ev.id} className={`${styles.card} ${kitchenStyles.eventCard}`}>
            <Link
              href={`/admin/kitchen/events/${ev.id}/summary`}
              className={kitchenStyles.eventCardOpen}
              aria-label={`פתיחת הפתק — ${ev.name}`}
            />
            <span className={ev.eventType === "offsite" ? styles.badgePending : styles.badgePaid}>
              {ev.eventType === "offsite" ? "אירוע חוץ" : "אצלנו"}
            </span>
            <h2 style={{ marginTop: 10 }}>{ev.name}</h2>
            <div className={kitchenStyles.eventMeta}>
              <span>{formatEventDate(ev.date)}</span>
              <span>{ev.guestCount} סועדים</span>
              <span>{ev.menu.length} פריטי תפריט</span>
              {ev.eventType === "offsite" && ev.location && <span>{ev.location}</span>}
            </div>
            {isOwner && (
              <div className={kitchenStyles.eventCardActions}>
                <Link href={`/admin/kitchen/events/${ev.id}`} className={styles.btnSecondary}>
                  עריכה
                </Link>
              </div>
            )}
          </div>
        ))}
        {events.length === 0 && <p className={styles.muted}>אין אירועים עדיין.</p>}
      </div>
    </>
  );
}
