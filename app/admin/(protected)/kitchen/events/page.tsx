import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getEvents } from "@/lib/kitchen/data";
import { AdminSearchGrid } from "@/components/admin/kitchen/AdminSearch";
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

      <AdminSearchGrid
        placeholder="חיפוש אירוע..."
        emptyMessage="אין אירועים עדיין."
        minColumnWidth={280}
        items={events.map((ev) => ({
          key: ev.id,
          searchText: [ev.name, ev.location].filter(Boolean).join(" "),
          node: (
            <div className={`${styles.card} ${kitchenStyles.eventCard}`}>
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
          ),
        }))}
      />
    </>
  );
}
