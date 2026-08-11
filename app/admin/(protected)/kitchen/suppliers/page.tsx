import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getSuppliers } from "@/lib/kitchen/data";
import { createSupplier, deleteSupplier, updateSupplier } from "@/lib/actions/admin/kitchen-basics";
import { SupplierRow } from "@/components/admin/kitchen/SupplierRow";
import { sortArrow, sortHref, sortRows } from "@/lib/sortLink";
import styles from "../../../admin.module.css";

export default async function KitchenSuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const admin = await requireAdmin();
  const isOwner = admin.role === "owner";
  const sp = await searchParams;
  const suppliers = sortRows(await getSuppliers(), sp, {
    name: (s) => s.name,
    phone: (s) => s.phone,
    email: (s) => s.email,
    note: (s) => s.note,
  });

  return (
    <>
      <h1>ספקים</h1>
      {!isOwner && <p className={styles.muted}>צפייה בלבד.</p>}

      {isOwner && (
        <div className={styles.card}>
          <h2>ספק חדש</h2>
          <form action={createSupplier} className={styles.form}>
            <div className={styles.field}>
              <label>שם</label>
              <input name="name" type="text" required />
            </div>
            <div className={styles.field}>
              <label>טלפון</label>
              <input name="phone" type="tel" style={{ width: 140 }} />
            </div>
            <div className={styles.field} style={{ flex: 1 }}>
              <label>אימייל</label>
              <input name="email" type="email" />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>הערה</label>
              <input name="note" type="text" />
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
                <Link href={sortHref(sp, "email")}>אימייל{sortArrow(sp, "email")}</Link>
              </th>
              <th>
                <Link href={sortHref(sp, "note")}>הערה{sortArrow(sp, "note")}</Link>
              </th>
              {isOwner && <th></th>}
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) =>
              isOwner ? (
                <SupplierRow key={s.id} supplier={s} updateAction={updateSupplier} deleteAction={deleteSupplier} />
              ) : (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.phone || "—"}</td>
                  <td>{s.email || "—"}</td>
                  <td>{s.note || "—"}</td>
                </tr>
              )
            )}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.muted}>
                  אין ספקים עדיין.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
