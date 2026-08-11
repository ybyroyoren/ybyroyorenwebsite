import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getEquipmentList } from "@/lib/kitchen/data";
import { createEquipment, deleteEquipment, updateEquipment } from "@/lib/actions/admin/kitchen-basics";
import { EquipmentRow } from "@/components/admin/kitchen/EquipmentRow";
import { AdminSearchTable } from "@/components/admin/kitchen/AdminSearch";
import { sortArrow, sortHref, sortRows } from "@/lib/sortLink";
import styles from "../../../admin.module.css";

export default async function KitchenEquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const admin = await requireAdmin();
  const isOwner = admin.role === "owner";
  const sp = await searchParams;
  const equipment = sortRows(await getEquipmentList(), sp, {
    name: (e) => e.name,
    note: (e) => e.note,
  });

  return (
    <>
      <h1>ציוד</h1>
      {!isOwner && <p className={styles.muted}>צפייה בלבד.</p>}

      {isOwner && (
        <div className={styles.card}>
          <h2>ציוד חדש</h2>
          <form action={createEquipment} className={styles.form}>
            <div className={styles.field}>
              <label>שם</label>
              <input name="name" type="text" required />
            </div>
            <div className={styles.field}>
              <label>הערה</label>
              <input name="note" type="text" />
            </div>
            <button type="submit" className={styles.btn}>
              הוספה
            </button>
          </form>
        </div>
      )}

      <AdminSearchTable
        placeholder="חיפוש ציוד..."
        emptyMessage="אין ציוד עדיין."
        colSpan={3}
        head={
          <tr>
            <th>
              <Link href={sortHref(sp, "name")}>שם{sortArrow(sp, "name")}</Link>
            </th>
            <th>
              <Link href={sortHref(sp, "note")}>הערה{sortArrow(sp, "note")}</Link>
            </th>
            {isOwner && <th></th>}
          </tr>
        }
        rows={equipment.map((e) => ({
          key: e.id,
          searchText: [e.name, e.note].filter(Boolean).join(" "),
          node: isOwner ? (
            <EquipmentRow equipment={e} updateAction={updateEquipment} deleteAction={deleteEquipment} />
          ) : (
            <tr>
              <td>{e.name}</td>
              <td>{e.note || "—"}</td>
            </tr>
          ),
        }))}
      />
    </>
  );
}
