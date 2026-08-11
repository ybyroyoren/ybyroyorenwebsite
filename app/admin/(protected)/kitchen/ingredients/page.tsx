import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getIngredients, getSuppliers } from "@/lib/kitchen/data";
import { createIngredient, deleteIngredient, updateIngredient } from "@/lib/actions/admin/kitchen-basics";
import { IngredientRow } from "@/components/admin/kitchen/IngredientRow";
import { AdminSearchTable } from "@/components/admin/kitchen/AdminSearch";
import { sortArrow, sortHref, sortRows } from "@/lib/sortLink";
import styles from "../../../admin.module.css";

export default async function KitchenIngredientsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const admin = await requireAdmin();
  const isOwner = admin.role === "owner";
  const sp = await searchParams;

  const [rawIngredients, suppliers] = await Promise.all([getIngredients(), getSuppliers()]);
  const supplierName = (id: string | null) => suppliers.find((s) => s.id === id)?.name ?? "";
  const ingredients = sortRows(rawIngredients, sp, {
    name: (i) => i.name,
    unit: (i) => i.unit,
    supplier: (i) => supplierName(i.supplierId),
    purchaseName: (i) => i.purchaseName,
    purchaseUnit: (i) => i.purchaseUnit,
    yieldPercent: (i) => i.yieldPercent,
    price: (i) => i.price,
  });

  return (
    <>
      <h1>מרכיבים</h1>
      {!isOwner && <p className={styles.muted}>צפייה בלבד.</p>}

      {isOwner && (
        <div className={styles.card}>
          <h2>מרכיב חדש</h2>
          <form action={createIngredient} className={styles.form}>
            <div className={styles.field}>
              <label>שם</label>
              <input name="name" type="text" required />
            </div>
            <div className={styles.field}>
              <label>יחידה</label>
              <input name="unit" type="text" placeholder="גרם / יח'" required style={{ width: 90 }} />
            </div>
            <div className={styles.field}>
              <label>ספק</label>
              <select name="supplierId" defaultValue="">
                <option value="">—</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>שם לרכישה (אם שונה)</label>
              <input name="purchaseName" type="text" />
            </div>
            <div className={styles.field}>
              <label>יחידת רכישה (אם שונה)</label>
              <input name="purchaseUnit" type="text" style={{ width: 90 }} />
            </div>
            <div className={styles.field}>
              <label>אחוז תפוקה</label>
              <input name="yieldPercent" type="number" min="1" max="99" step="0.1" style={{ width: 80 }} />
            </div>
            <div className={styles.field}>
              <label>מחיר ליחידת רכישה</label>
              <input name="price" type="number" min="0" step="0.0001" style={{ width: 100 }} />
            </div>
            <button type="submit" className={styles.btn}>
              הוספה
            </button>
          </form>
        </div>
      )}

      <AdminSearchTable
        placeholder="חיפוש מרכיב, ספק..."
        emptyMessage="אין מרכיבים עדיין."
        colSpan={8}
        head={
          <tr>
            <th>
              <Link href={sortHref(sp, "name")}>שם{sortArrow(sp, "name")}</Link>
            </th>
            <th>
              <Link href={sortHref(sp, "unit")}>יחידה{sortArrow(sp, "unit")}</Link>
            </th>
            <th>
              <Link href={sortHref(sp, "supplier")}>ספק{sortArrow(sp, "supplier")}</Link>
            </th>
            <th>
              <Link href={sortHref(sp, "purchaseName")}>שם רכישה{sortArrow(sp, "purchaseName")}</Link>
            </th>
            <th>
              <Link href={sortHref(sp, "purchaseUnit")}>יח&apos; רכישה{sortArrow(sp, "purchaseUnit")}</Link>
            </th>
            <th>
              <Link href={sortHref(sp, "yieldPercent")}>תפוקה %{sortArrow(sp, "yieldPercent")}</Link>
            </th>
            {isOwner && (
              <th>
                <Link href={sortHref(sp, "price")}>מחיר{sortArrow(sp, "price")}</Link>
              </th>
            )}
            {isOwner && <th></th>}
          </tr>
        }
        rows={ingredients.map((ing) => ({
          key: ing.id,
          searchText: [ing.name, ing.unit, supplierName(ing.supplierId), ing.purchaseName, ing.purchaseUnit]
            .filter(Boolean)
            .join(" "),
          node: isOwner ? (
            <IngredientRow
              ingredient={ing}
              suppliers={suppliers}
              isOwner={isOwner}
              updateAction={updateIngredient}
              deleteAction={deleteIngredient}
            />
          ) : (
            <tr>
              <td>{ing.name}</td>
              <td>{ing.unit}</td>
              <td>{supplierName(ing.supplierId)}</td>
              <td>{ing.purchaseName || "—"}</td>
              <td>{ing.purchaseUnit || "—"}</td>
              <td>{ing.yieldPercent ?? "—"}</td>
            </tr>
          ),
        }))}
      />
    </>
  );
}
