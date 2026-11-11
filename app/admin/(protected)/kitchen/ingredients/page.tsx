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
      <div className={styles.helpBox}>
        <b>איך זה עובד, בקצרה:</b> מזינים את המחיר פעם אחת, כמו בחשבונית: מה קנית ובכמה. אחר כך מגדירים איזה מרכיבים במתכונים יוצאים ממנו ומה אחוז הפחת. המערכת מחשבת לבד כמה עולה גרם שמיש. שום מחיר לא משתנה בלי אישור שלך, ולפני שמירה רואים איך עלויות המתכונים ישתנו. <b>העלות הסופית</b> שליד כל מרכיב מחושבת אוטומטית מכל הנתונים (מחיר, כמות, פחת) ואי אפשר לשנות אותה ידנית: משנים את הנתונים והיא מתעדכנת.
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>דוגמאות: ביצים, תירס, בצל (לחץ לפתיחה)</summary>
          <div style={{ marginTop: 10, lineHeight: 1.7 }}>
            <p>
              <b>ביצים L (מחיר ביצה 1.21).</b> פריט: ״ביצים L״, קונים לפי <b>ביצה</b>, מחיר <b>1.21</b>. אחר כך שלושה מרכיבים מאותו פריט, כל אחד עם &quot;כמה יוצא מ-1 ביצה&quot; = 60 גרם (המשקל עם קליפה):
              <br />• ״ביצה (בלי קליפה)״: 60 גרם, מתוכם <b>50</b> שמישים
              <br />• ״חלמון״: 60 גרם, מתוכם <b>20</b> שמישים
              <br />• ״חלבון״: 60 גרם, מתוכם <b>30</b> שמישים
              <br />התוצאה: גרם ביצה 0.0242, גרם חלמון 0.0605, גרם חלבון 0.0403 ₪.
            </p>
            <p>
              <b>תירס.</b> פריט: ״קלחי תירס״, קונים לפי <b>ק״ג</b>, מחיר ל-ק״ג לפי החשבונית. מרכיב: ״גרעיני תירס״: יוצאים 1000 גרם (קילו קלחים), מתוכם <b>440</b> שמישים (גרעינים).
            </p>
            <p>
              <b>בצל סגול.</b> פריט: ״בצל סגול״, קונים לפי <b>ק״ג</b>, מחיר ל-ק״ג. מרכיבים: ״בצל סגול מקולף״: 1000 גרם, מתוכם למשל <b>850</b> שמישים. ״בצל סגול פרוס דק״: 1000 גרם, מתוכם למשל <b>800</b> שמישים.
            </p>
            <p className={styles.muted}>
              הפריטים הקיימים נשמרו כמו שהיו: ״קונים לפי גרם״ ומחיר לגרם, כדי שהעלויות לא ישתנו. כשמעדכנים מחיר מחשבונית, לחצו ״עריכה״ ואז ״המר לק״ג״ כדי להזין את המחיר לקילו כמו בחשבונית.
            </p>
          </div>
        </details>
      </div>
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
            <label>קונים לפי (ק״ג, ביצה, קלח...)</label>
            <input name="purchaseUnit" type="text" list="purchase-units" placeholder="ק״ג / ביצה / קלח" required style={{ width: 110 }} />
          </div>
          <div className={styles.field}>
            <label>מחיר ליחידת קנייה אחת, לפני מע״מ</label>
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
            המרכיב הראשון שמשתמשים בו במתכונים (אפשר להוסיף מרכיבים נוספים מאותו פריט אחר כך, למשל חלמון וחלבון מביצה):
          </p>
          <div className={styles.field}>
            <label>שם המרכיב במתכונים (ריק = כמו הפריט)</label>
            <input name="formName" type="text" />
          </div>
          <div className={styles.field}>
            <label>מודדים במתכון ב-</label>
            <input name="formUnit" type="text" list="measure-units" defaultValue="גרם" required style={{ width: 90 }} />
          </div>
          <div className={styles.field}>
            <label>כמה יוצא מיחידת קנייה אחת (לפני פחת)</label>
            <input name="unitsPerPurchaseUnit" type="number" min="0.00001" step="any" defaultValue={1000} required style={{ width: 110 }} />
          </div>
          <div className={styles.field}>
            <label>כמה אחוז שמיש אחרי פחת (ריק = 100%)</label>
            <input name="yieldPercent" type="number" min="1" max="100" step="0.1" placeholder="למשל 85" style={{ width: 110 }} />
          </div>
          <button type="submit" className={styles.btn}>
            הוספה
          </button>
        </form>
      </div>

      <AdminSearchTable
        placeholder="חיפוש פריט, מרכיב, ספק..."
        emptyMessage="אין פריטים עדיין."
        colSpan={11}
        head={
          <tr>
            <th>
              <Link href={sortHref(sp, "name")}>פריט מהחשבונית{sortArrow(sp, "name")}</Link>
            </th>
            <th>
              <Link href={sortHref(sp, "supplier")}>ספק{sortArrow(sp, "supplier")}</Link>
            </th>
            <th>
              <Link href={sortHref(sp, "purchaseUnit")}>קונים לפי{sortArrow(sp, "purchaseUnit")}</Link>
            </th>
            <th>
              <Link href={sortHref(sp, "price")}>מחיר ליחידה (לפני מע״מ){sortArrow(sp, "price")}</Link>
            </th>
            <th>מע״מ</th>
            <th>
              <Link href={sortHref(sp, "updated")}>עודכן{sortArrow(sp, "updated")}</Link>
            </th>
            <th>יוצא מיחידה אחת</th>
            <th>מתוכו שמיש</th>
            <th>עלות סופית ל-1 גרם שמיש</th>
            <th>עלות סופית ל-1,000 שמיש (ק״ג / ליטר)</th>
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
