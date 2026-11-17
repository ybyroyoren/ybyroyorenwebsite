import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getEvents } from "@/lib/kitchen/data";
import { DEAL_STATUS_LABEL, categoryLabel } from "@/lib/kitchen/eventDossier";
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
        <h1>תיקי אירועים</h1>
        {isOwner && (
          <Link href="/admin/kitchen/events/new" className={styles.btn}>
            תיק אירוע חדש
          </Link>
        )}
      </div>

      <AdminSearchGrid
        placeholder="חיפוש אירוע..."
        emptyMessage="אין תיקי אירועים עדיין."
        minColumnWidth={280}
        items={events.map((ev) => ({
          key: ev.id,
          searchText: [ev.name, ev.location].filter(Boolean).join(" "),
          node: (
            <div className={`${styles.card} ${kitchenStyles.eventCard}`}>
              <Link
                href={isOwner ? `/admin/kitchen/events/${ev.id}` : `/admin/kitchen/events/${ev.id}/summary`}
                className={kitchenStyles.eventCardOpen}
                aria-label={`פתיחת התיק — ${ev.name}`}
              />
              <span className={ev.eventType === "offsite" ? styles.badgePending : styles.badgePaid}>
                {ev.eventType === "offsite" ? "אירוע חוץ" : "אצלנו"}
              </span>
              <span
                className={ev.dossier.dealStatus === "closed" ? styles.badgePaid : styles.badgePending}
                style={{ marginInlineStart: 6 }}
              >
                {DEAL_STATUS_LABEL[ev.dossier.dealStatus]}
              </span>
              {ev.closedAt && (
                <span className={styles.badgePending} style={{ marginInlineStart: 6 }}>
                  עלות נעולה
                </span>
              )}
              <h2 style={{ marginTop: 10 }}>{ev.name}</h2>
              <div className={kitchenStyles.eventMeta}>
                <span>
                  {formatEventDate(ev.date)}
                  {ev.dossier.startTime ? ` · ${ev.dossier.startTime}` : ""}
                </span>
                {ev.dossier.category && <span>{categoryLabel(ev.dossier.category, ev.dossier.categoryOther)}</span>}
                <span>{ev.guestCount} סועדים</span>
                <span>{ev.menu.length} פריטי תפריט</span>
                {ev.eventType === "offsite" && ev.location && <span>{ev.location}</span>}
              </div>
              {isOwner && (
                <div className={kitchenStyles.eventCardActions}>
                  <Link href={`/admin/kitchen/events/${ev.id}`} className={styles.btnSecondary}>
                    תיק האירוע
                  </Link>
                  <Link href={`/admin/kitchen/events/${ev.id}/summary`} className={styles.btnSecondary}>
                    פתק הכנה
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
