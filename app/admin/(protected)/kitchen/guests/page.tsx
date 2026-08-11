import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getEvents, getGuestsList, getKitchenGraph } from "@/lib/kitchen/data";
import { createGuest, deleteGuest, updateGuest } from "@/lib/actions/admin/kitchen-basics";
import { GuestRow } from "@/components/admin/kitchen/GuestRow";
import { GuestNameCell, type GuestHistoryEvent } from "@/components/admin/kitchen/GuestNameCell";
import { sortArrow, sortHref, sortRows } from "@/lib/sortLink";
import styles from "../../../admin.module.css";

export default async function KitchenGuestsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const admin = await requireAdmin();
  const isOwner = admin.role === "owner";
  const sp = await searchParams;
  const [rawGuests, events, { recipesById }] = await Promise.all([getGuestsList(), getEvents(), getKitchenGraph()]);
  const guests = sortRows(rawGuests, sp, {
    name: (g) => g.name,
    phone: (g) => g.phone,
    restrictions: (g) => g.restrictions,
  });

  function historyFor(guestId: string): GuestHistoryEvent[] {
    return events
      .filter((ev) => ev.seats.some((s) => s.guestId === guestId))
      .map((ev) => ({
        id: ev.id,
        name: ev.name,
        date: ev.date,
        eventType: ev.eventType,
        menu: ev.menu.map((m) => {
          const recipe = recipesById.get(m.recipeId);
          return { recipeName: recipe?.name ?? "—", servings: m.servings, baseUnit: recipe?.baseUnit ?? "" };
        }),
      }))
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }

  return (
    <>
      <h1>סועדים</h1>
      {!isOwner && <p className={styles.muted}>צפייה בלבד.</p>}

      {isOwner && (
        <div className={styles.card}>
          <h2>סועד/ת חדש/ה</h2>
          <form action={createGuest} className={styles.form}>
            <div className={styles.field}>
              <label>שם</label>
              <input name="name" type="text" required />
            </div>
            <div className={styles.field}>
              <label>טלפון</label>
              <input name="phone" type="tel" style={{ width: 130 }} />
            </div>
            <div className={styles.field}>
              <label>הגבלות תזונה</label>
              <input name="restrictions" type="text" />
            </div>
            <button type="submit" className={styles.btn}>
              הוספה
            </button>
          </form>
        </div>
      )}

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>
                <Link href={sortHref(sp, "name")}>שם{sortArrow(sp, "name")}</Link>
              </th>
              <th>
                <Link href={sortHref(sp, "phone")}>טלפון{sortArrow(sp, "phone")}</Link>
              </th>
              <th>
                <Link href={sortHref(sp, "restrictions")}>הגבלות תזונה{sortArrow(sp, "restrictions")}</Link>
              </th>
              {isOwner && <th></th>}
            </tr>
          </thead>
          <tbody>
            {guests.map((g) =>
              isOwner ? (
                <GuestRow
                  key={g.id}
                  guest={g}
                  history={historyFor(g.id)}
                  updateAction={updateGuest}
                  deleteAction={deleteGuest}
                />
              ) : (
                <tr key={g.id}>
                  <td>
                    <GuestNameCell name={g.name} history={historyFor(g.id)} />
                  </td>
                  <td>{g.phone || "—"}</td>
                  <td>{g.restrictions || "—"}</td>
                </tr>
              )
            )}
            {guests.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.muted}>
                  אין סועדים עדיין.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
