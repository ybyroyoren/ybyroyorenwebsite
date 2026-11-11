import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getIngredients, getInvoiceItems, getSuppliers } from "@/lib/kitchen/data";
import {
  addForm,
  createInvoiceItem,
  deleteForm,
  moveFormToItem,
  previewKitchenCostChange,
  updateForm,
  updateInvoiceItem,
  updateItemAndForm,
} from "@/lib/actions/admin/kitchen-invoice";
import { InvoiceItemRows } from "@/components/admin/kitchen/InvoiceItemRows";
import { AdminSearchTable } from "@/components/admin/kitchen/AdminSearch";
import { formWarnings, outlierWarning, priceOutlierIds } from "@/lib/kitchen/invoicePricing";
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

  const [ingredients, items, suppliers] = await Promise.all([getIngredients(), getInvoiceItems(), getSuppliers()]);
  const supplierName = (id: string | null) => suppliers.find((s) => s.id === id)?.name ?? "";

  // ---------- read-only view (kitchen / sales): ingredients with their units, no prices ----------
  if (!isOwner) {
    return (
      <>
        <h1>מרכיבים</h1>
        <p className={styles.muted}>צפייה בלבד.</p>
        <AdminSearchTable
          placeholder="חיפוש מרכיב, ספק..."
          emptyMessage="אין מרכיבים עדיין."
          colSpan={4}
          head={
            <tr>
              <th>שם</th>
              <th>יחידה</th>
              <th>ספק</th>
              <th>תפוקה %</th>
            </tr>
          }
          rows={ingredients.map((ing) => ({
            key: ing.id,
            searchText: [ing.name, ing.unit, supplierName(ing.supplierId)].filter(Boolean).join(" "),
            node: (
              <tr>
                <td>{ing.name}</td>
                <td>{ing.unit}</td>
                <td>{supplierName(ing.supplierId)}</td>
                <td>{ing.yieldPercent ?? "—"}</td>
              </tr>
            ),
          }))}
        />
      </>
    );
  }

  // ---------- owner view: invoice items, each with its forms ----------
  const formsByItem = new Map<string, typeof ingredients>();
  for (const ing of ingredients) {
    if (!ing.invoiceItemId) continue;
    formsByItem.set(ing.invoiceItemId, [...(formsByItem.get(ing.invoiceItemId) ?? []), ing]);
  }
  const outliers = priceOutlierIds(items);

  const warningsFor = (itemId: string) => {
    const item = items.find((i) => i.id === itemId)!;
    const out: Record<string, string[]> = {};
    if (outliers.has(itemId)) out.item = [outlierWarning(item)];
    for (const f of formsByItem.get(itemId) ?? []) {
      const w = formWarnings(item, f);
      if (w.length > 0) out[f.id] = w;
    }
    return out;
  };

  const sorted = sortRows(items, sp, {
    name: (i) => i.name,
    supplier: (i) => supplierName(i.supplierId),
    purchaseUnit: (i) => i.purchaseUnit,
    price: (i) => i.priceNet,
    updated: (i) => i.priceUpdatedAt,
  });

  const warningCount = items.filter((i) => Object.keys(warningsFor(i.id)).length > 0).length;
  const missingPrice = items.filter((i) => i.priceNet === null).length;

  const actions = {
    updateItemAndForm,
    updateInvoiceItem,
    updateForm,
    addForm,
    moveFormToItem,
    deleteForm,
    preview: previewKitchenCostChange,
  };

  return (
    <>
      <h1>מרכיבים ופריטים מהחשבונית</h1>
      <p className={styles.muted}>
        כל מחיר מוזן פעם אחת לפריט מהחשבונית, נטו וליחידת הקנייה כמו בחשבונית (ק״ג, קלח, שק). המרכיבים שהמתכונים משתמשים בהם הם צורות של הפריט:
        לכל צורה כמות משלה ביחידת קנייה ואחוז תפוקה משלה. מחיר ליחידת מדידה מחושב אוטומטית. שום מחיר לא משתנה בלי אישור שלך, ולפני שמירה אפשר לראות בתצוגה מקדימה איך עלויות המתכונים ישתנו.
      </p>
      <p className={styles.muted}>
        {items.length} פריטים · {missingPrice} בלי מחיר{warningCount > 0 ? ` · ${warningCount} עם אזהרה (⚠, אזהרה בלבד, שום דבר לא נשנה אוטומטית)` : ""}
      </p>

      <datalist id="purchase-units">
        {["ק״ג", "ליטר", "יחידה", "קלח", "שק", "מארז", "צרור", "קרטון", "גרם"].map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
      <datalist id="measure-units">
        {["גרם", "מ״ל", "יחידה", "צרור"].map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

      <div className={styles.card}>
        <h2>פריט חדש מהחשבונית</h2>
        <form action={createInvoiceItem} className={styles.form}>
          <div className={styles.field}>
            <label>שם בחשבונית</label>
            <input name="itemName" type="text" required />
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
            <label>יחידת קנייה</label>
            <input name="purchaseUnit" type="text" list="purchase-units" placeholder="ק״ג / קלח / שק" required style={{ width: 110 }} />
          </div>
          <div className={styles.field}>
            <label>מחיר נטו ליחידת קנייה</label>
            <input name="priceNet" type="number" min="0" step="0.0001" style={{ width: 130 }} />
          </div>
          <div className={styles.field}>
            <label>מע״מ %</label>
            <input name="vatRate" type="number" min="0" max="99" step="0.1" defaultValue={18} style={{ width: 80 }} />
          </div>
          <div className={styles.field}>
            <label>תאריך חשבונית</label>
            <input name="invoiceDate" type="date" />
          </div>
          <div className={styles.field}>
            <label>מס׳ חשבונית</label>
            <input name="invoiceNo" type="text" style={{ width: 100 }} />
          </div>
          <p className={styles.sectionNote} style={{ width: "100%", margin: "4px 0" }}>
            המרכיב הראשון של הפריט (אפשר להוסיף צורות נוספות אחר כך):
          </p>
          <div className={styles.field}>
            <label>שם המרכיב (ריק = כמו הפריט)</label>
            <input name="formName" type="text" />
          </div>
          <div className={styles.field}>
            <label>יחידת מדידה</label>
            <input name="formUnit" type="text" list="measure-units" defaultValue="גרם" required style={{ width: 90 }} />
          </div>
          <div className={styles.field}>
            <label>כמות ביחידת קנייה</label>
            <input name="unitsPerPurchaseUnit" type="number" min="0.00001" step="any" defaultValue={1000} required style={{ width: 110 }} />
          </div>
          <div className={styles.field}>
            <label>אחוז תפוקה</label>
            <input name="yieldPercent" type="number" min="1" max="100" step="0.1" style={{ width: 90 }} />
          </div>
          <button type="submit" className={styles.btn}>
            הוספה
          </button>
        </form>
      </div>

      <AdminSearchTable
        placeholder="חיפוש פריט, מרכיב, ספק..."
        emptyMessage="אין פריטים עדיין."
        colSpan={10}
        head={
          <tr>
            <th>
              <Link href={sortHref(sp, "name")}>פריט / מרכיב{sortArrow(sp, "name")}</Link>
            </th>
            <th>
              <Link href={sortHref(sp, "supplier")}>ספק{sortArrow(sp, "supplier")}</Link>
            </th>
            <th>
              <Link href={sortHref(sp, "purchaseUnit")}>יחידת קנייה{sortArrow(sp, "purchaseUnit")}</Link>
            </th>
            <th>
              <Link href={sortHref(sp, "price")}>מחיר נטו{sortArrow(sp, "price")}</Link>
            </th>
            <th>מע״מ</th>
            <th>
              <Link href={sortHref(sp, "updated")}>עודכן{sortArrow(sp, "updated")}</Link>
            </th>
            <th>כמות ביחידה</th>
            <th>תפוקה %</th>
            <th>מחיר ליחידת מדידה</th>
            <th></th>
          </tr>
        }
        rows={sorted.map((item) => {
          const forms = formsByItem.get(item.id) ?? [];
          return {
            key: item.id,
            searchText: [item.name, supplierName(item.supplierId), item.purchaseUnit, ...forms.map((f) => f.name)].filter(Boolean).join(" "),
            node: (
              <InvoiceItemRows
                item={item}
                forms={forms}
                suppliers={suppliers}
                otherItems={items.filter((o) => o.id !== item.id).map((o) => ({ id: o.id, name: o.name }))}
                warnings={warningsFor(item.id)}
                actions={actions}
              />
            ),
          };
        })}
      />
    </>
  );
}
