import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getSuppliers } from "@/lib/kitchen/data";
import { createSupplier, deleteSupplier, updateSupplier } from "@/lib/actions/admin/kitchen-basics";
import { SupplierRow } from "@/components/admin/kitchen/SupplierRow";
import { AdminSearchTable } from "@/components/admin/kitchen/AdminSearch";
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

      <AdminSearchTable
        placeholder="חיפוש ספק..."
        emptyMessage="אין ספקים עדיין."
        colSpan={5}
        head={
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
        }
        rows={suppliers.map((s) => ({
          key: s.id,
          searchText: [s.name, s.phone, s.email, s.note].filter(Boolean).join(" "),
          node: isOwner ? (
            <SupplierRow supplier={s} updateAction={updateSupplier} deleteAction={deleteSupplier} />
          ) : (
            <tr>
              <td>{s.name}</td>
              <td>{s.phone || "—"}</td>
              <td>{s.email || "—"}</td>
              <td>{s.note || "—"}</td>
            </tr>
          ),
        }))}
      />
    </>
  );
}
