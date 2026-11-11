"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/admin/Modal";
import { formatNum } from "@/lib/kitchen/invoicePricing";
import type { KLIngredient, KLInvoiceItem, KLSupplier } from "@/lib/kitchen/types";
import type { PreviewResult } from "@/lib/actions/admin/kitchen-invoice";
import styles from "@/app/admin/admin.module.css";

type Action = (formData: FormData) => Promise<void>;

export interface InvoiceActions {
  updateItemAndForm: Action;
  updateInvoiceItem: Action;
  updateForm: Action;
  addForm: Action;
  moveFormToItem: Action;
  deleteForm: Action;
  preview: (formData: FormData) => Promise<PreviewResult>;
}

type Mode = "combined" | "item" | "form" | "newForm" | "move";

const round = (n: number) => Math.round(n * 100000) / 100000;
const money = (n: number | null) => (n === null ? "—" : formatNum(n));
/** What 1 usable gram (or ml / piece) really costs: price per unit divided by the usable share. */
const perUsable = (f: KLIngredient) => (f.price === null ? null : f.price / ((f.yieldPercent ?? 100) / 100));
const isBulk = (unit: string) => /^גרם|^מ["״']?ל/.test(unit.trim());
/** The final, calculated cost shown next to each form. A plain read-only cell: there is no field to type it into. */
function FinalCost({ form }: { form: KLIngredient }) {
  const c = perUsable(form);
  return (
    <>
      <td className={styles.finalCost} title="מחושב אוטומטית ממחיר הפריט, הכמות והפחת. אי אפשר לערוך ידנית.">
        {c === null ? "אין מחיר" : `₪${formatNum(Math.round(c * 1e6) / 1e6)}`}
      </td>
      <td className={styles.finalCost} title="מחושב אוטומטית. אי אפשר לערוך ידנית.">
        {c !== null && isBulk(form.unit) ? `₪${formatNum(Math.round(c * 1000 * 100) / 100)}` : "—"}
      </td>
    </>
  );
}
const dateText = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" }) : "—");

/** Rows for one invoice item: a single simple row when it has one form, otherwise the item row with its forms below. */
export function InvoiceItemRows({
  item,
  forms,
  suppliers,
  otherItems,
  warnings,
  actions,
}: {
  item: KLInvoiceItem;
  forms: KLIngredient[];
  suppliers: KLSupplier[];
  otherItems: { id: string; name: string }[];
  warnings: Record<string, string[]>; // by ingredient id; "item" key = warnings of the item itself
  actions: InvoiceActions;
}) {
  const [modal, setModal] = useState<{ mode: Mode; form?: KLIngredient } | null>(null);
  const supplierName = suppliers.find((s) => s.id === item.supplierId)?.name ?? "—";
  const single = forms.length === 1 ? forms[0] : null;
  const itemWarnings = warnings.item ?? [];
  const allWarnings = [...itemWarnings, ...forms.flatMap((f) => warnings[f.id] ?? [])];

  const close = () => setModal(null);

  return (
    <>
      <tr>
        <td>
          {item.name}
          {single && single.name !== item.name && <div className={styles.muted}>מרכיב: {single.name}</div>}
          {allWarnings.length > 0 && (
            <span className={styles.warnBadge} title={allWarnings.join("\n")}>
              ⚠ {allWarnings.length}
            </span>
          )}
        </td>
        <td>{supplierName}</td>
        <td>{item.purchaseUnit || "—"}</td>
        <td>{money(item.priceNet)}</td>
        <td>{formatNum(item.vatRate)}%</td>
        <td>{dateText(item.priceUpdatedAt)}</td>
        {single ? (
          <>
            <td>
              {formatNum(single.unitsPerPurchaseUnit)} {single.unit}
            </td>
            <td>{formatNum(single.unitsPerPurchaseUnit * ((single.yieldPercent ?? 100) / 100))} {single.unit}</td>
            <FinalCost form={single} />
            <td>
              <div className={styles.rowActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModal({ mode: "combined", form: single })}>
                  עריכה
                </button>
                <button type="button" className={styles.btnSecondary} onClick={() => setModal({ mode: "newForm" })} title="צורה נוספת של אותו פריט, עם אותו מחיר">
                  + מרכיב
                </button>
              </div>
            </td>
          </>
        ) : (
          <>
            <td colSpan={4} className={styles.muted}>
              {forms.length} מרכיבים לאותו פריט (העלות הסופית של כל אחד מוצגת בשורה שלו)
            </td>
            <td>
              <div className={styles.rowActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModal({ mode: "item" })}>
                  עריכת מחיר הפריט
                </button>
                <button type="button" className={styles.btnSecondary} onClick={() => setModal({ mode: "newForm" })}>
                  + מרכיב
                </button>
              </div>
            </td>
          </>
        )}
      </tr>

      {!single &&
        forms.map((f) => (
          <tr key={f.id} className={styles.formRow}>
            <td>
              ↳ מרכיב: {f.name}
              {(warnings[f.id] ?? []).length > 0 && (
                <span className={styles.warnBadge} title={(warnings[f.id] ?? []).join("\n")}>
                  ⚠
                </span>
              )}
            </td>
            <td colSpan={5}></td>
            <td>
              {formatNum(f.unitsPerPurchaseUnit)} {f.unit}
            </td>
            <td>{formatNum(f.unitsPerPurchaseUnit * ((f.yieldPercent ?? 100) / 100))} {f.unit}</td>
            <FinalCost form={f} />
            <td>
              <div className={styles.rowActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModal({ mode: "form", form: f })}>
                  עריכת המרכיב
                </button>
              </div>
            </td>
          </tr>
        ))}

      {modal && (
        <EditModal
          mode={modal.mode}
          item={item}
          form={modal.form}
          suppliers={suppliers}
          otherItems={otherItems}
          actions={actions}
          canMove={Boolean(modal.form) && otherItems.length > 0}
          onClose={close}
        />
      )}
    </>
  );
}

function EditModal({
  mode: initialMode,
  item,
  form,
  suppliers,
  otherItems,
  actions,
  canMove,
  onClose,
}: {
  mode: Mode;
  item: KLInvoiceItem;
  form?: KLIngredient;
  suppliers: KLSupplier[];
  otherItems: { id: string; name: string }[];
  actions: InvoiceActions;
  canMove: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [saving, setSaving] = useState(false);
  const [review, setReview] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showItem = mode === "combined" || mode === "item";
  const showForm = mode === "combined" || mode === "form" || mode === "newForm";
  const title =
    mode === "newForm" ? `מרכיב נוסף מהפריט ״${item.name}״` : mode === "move" ? `העברת ${form?.name} לפריט אחר` : mode === "item" ? `עריכת הפריט ״${item.name}״` : `עריכת ${form?.name ?? item.name}`;

  // Values that feed the live explanation ("what does this cost me per gram?").
  const [priceNet, setPriceNet] = useState(item.priceNet === null ? "" : String(item.priceNet));
  const [purchaseUnit, setPurchaseUnit] = useState(item.purchaseUnit);
  const [formName, setFormName] = useState(mode === "newForm" ? "" : (form?.name ?? item.name));
  const [formUnit, setFormUnit] = useState(form?.unit ?? "גרם");
  const [units, setUnits] = useState(String(form?.unitsPerPurchaseUnit ?? 1000));
  const [usable, setUsable] = useState(form ? String(round(form.unitsPerPurchaseUnit * ((form.yieldPercent ?? 100) / 100))) : "");
  const unitsN = Number(units);
  const usableN = usable === "" ? unitsN : Number(usable);
  const yieldPct = unitsN > 0 && usableN > 0 && usableN < unitsN ? Math.round((usableN / unitsN) * 10000) / 100 : null;
  const priceN = priceNet === "" ? null : Number(priceNet);
  const costPerUsable = priceN !== null && usableN > 0 ? priceN / usableN : null;

  const saveAction: Action =
    mode === "combined" ? actions.updateItemAndForm : mode === "item" ? actions.updateInvoiceItem : mode === "form" ? actions.updateForm : mode === "newForm" ? actions.addForm : actions.moveFormToItem;

  async function commit(fd: FormData) {
    setSaving(true);
    setError(null);
    try {
      await saveAction(fd);
      router.refresh();
      onClose();
    } catch {
      setError("השמירה נכשלה, נסו שוב.");
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("mode", mode);
    if (review) return commit(fd); // second click = confirmed

    if (mode === "newForm") return commit(fd); // a new form isn't used in any recipe yet
    setSaving(true);
    setError(null);
    try {
      const result = await actions.preview(fd);
      const nothingToReview = result.preview !== null && result.preview.ingredients.length === 0 && result.preview.recipes.length === 0 && result.warnings.length === 0;
      if (!result.ok || nothingToReview) return commit(fd);
      setReview(result);
      setSaving(false);
    } catch {
      setError("לא ניתן להציג תצוגה מקדימה, נסו שוב.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!form) return;
    if (!window.confirm(`למחוק את "${form.name}"? המרכיב יוסר מכל המתכונים שמשתמשים בו.`)) return;
    const fd = new FormData();
    fd.set("ingredientId", form.id);
    setSaving(true);
    await actions.deleteForm(fd);
    router.refresh();
    onClose();
  }

  const hasChanges = review?.preview && (review.preview.ingredients.length > 0 || review.preview.recipes.length > 0);

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.form} onChange={() => review && setReview(null)}>
        <input type="hidden" name="itemId" value={item.id} />
        {form && <input type="hidden" name="ingredientId" value={form.id} />}

        {showItem && (
          <>
            <p className={styles.helpBox} style={{ width: "100%" }}>
              <b>שלב 1: מה קונים ובכמה?</b> כמו שכתוב בחשבונית של הספק.
            </p>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>שם הפריט בחשבונית</label>
              <input name="itemName" type="text" defaultValue={item.name} required placeholder="למשל: ביצים L / בצל סגול / קלחי תירס" />
            </div>
            {mode === "combined" && /^גרם$/.test(purchaseUnit.trim()) && Number(units) === 1 && priceN !== null && (
              <div style={{ width: "100%" }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => {
                    // Same cost, expressed the way the invoice reads: per kg (price x 1000, 1000 g per kg).
                    setPurchaseUnit("ק״ג");
                    setPriceNet(String(round((priceN ?? 0) * 1000)));
                    setUnits("1000");
                    if (usable !== "") setUsable(String(round(Number(usable) * 1000)));
                  }}
                >
                  המר לק״ג (כמו בחשבונית), העלות לא משתנה
                </button>
              </div>
            )}
            <div className={styles.field} style={{ flex: 1 }}>
              <label>ספק</label>
              <select name="supplierId" defaultValue={item.supplierId ?? ""}>
                <option value="">—</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>קונים לפי (יחידת קנייה)</label>
              <input
                name="purchaseUnit"
                type="text"
                list="purchase-units"
                value={purchaseUnit}
                onChange={(e) => setPurchaseUnit(e.target.value)}
                required
                style={{ width: 130 }}
                placeholder="ק״ג / ביצה / קלח"
              />
              <small className={styles.hint}>מה הספק סופר בחשבונית: ק״ג, ביצה, קלח, שק...</small>
            </div>
            <div className={styles.field}>
              <label>מחיר ליחידת קנייה אחת, לפני מע״מ</label>
              <input
                name="priceNet"
                type="number"
                min="0"
                step="0.0001"
                value={priceNet}
                onChange={(e) => setPriceNet(e.target.value)}
                style={{ width: 150 }}
              />
              <small className={styles.hint}>
                {purchaseUnit ? `כמה עולה 1 ${purchaseUnit} (למשל 1.21 לביצה אחת, או 7.5 לק״ג)` : "למשל 1.21 לביצה אחת, או 7.5 לק״ג"}
              </small>
            </div>
            <div className={styles.field}>
              <label>מע״מ % (לידיעה בלבד)</label>
              <input name="vatRate" type="number" min="0" max="99" step="0.1" defaultValue={item.vatRate} style={{ width: 90 }} />
            </div>
            <div className={styles.field}>
              <label>תאריך חשבונית</label>
              <input name="invoiceDate" type="date" defaultValue={item.invoiceDate ?? ""} />
            </div>
            <div className={styles.field}>
              <label>מס׳ חשבונית</label>
              <input name="invoiceNo" type="text" defaultValue={item.invoiceNo} style={{ width: 110 }} />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>הערה</label>
              <input name="itemNote" type="text" defaultValue={item.note} />
            </div>
          </>
        )}

        {showForm && (
          <>
            <p className={styles.helpBox} style={{ width: "100%" }}>
              <b>{mode === "newForm" ? "המרכיב החדש:" : "שלב 2: מה משתמשים במתכונים?"}</b> זה השם שיופיע בעריכת מתכון. מאותו פריט אפשר להכין כמה מרכיבים, למשל מביצה: ״ביצה (בלי קליפה)״, ״חלמון״ ו״חלבון״.
            </p>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>שם המרכיב במתכונים</label>
              <input
                name="formName"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder="למשל: חלמון / בצל סגול מקולף / גרעיני תירס"
              />
            </div>
            <div className={styles.field}>
              <label>במה מודדים אותו במתכון?</label>
              <input
                name="formUnit"
                type="text"
                list="measure-units"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                required
                style={{ width: 100 }}
              />
              <small className={styles.hint}>בדרך כלל גרם</small>
            </div>
            <div className={styles.field}>
              <label>כמה {formUnit || "גרם"} יוצאים מ-1 {purchaseUnit || "יחידת קנייה"}? (לפני פחת)</label>
              <input
                name="unitsPerPurchaseUnit"
                type="number"
                min="0.00001"
                step="any"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                required
                style={{ width: 150 }}
              />
              <small className={styles.hint}>המשקל המלא של מה שקנית, כולל קליפה / עצם / גבעולים. ביצה L: 60. קילו: 1000.</small>
            </div>
            <div className={styles.field}>
              <label>ומתוכם כמה {formUnit || "גרם"} שמישים אחרי הפחת?</label>
              <input
                type="number"
                min="0.00001"
                step="any"
                value={usable}
                onChange={(e) => setUsable(e.target.value)}
                placeholder={`ריק = הכול שמיש (${units || 0})`}
                style={{ width: 150 }}
              />
              <input type="hidden" name="yieldPercent" value={yieldPct ?? ""} />
              <small className={styles.hint}>
                מה נשאר אחרי קילוף / קליפה / גזירה, מה שבאמת נכנס למתכון. {yieldPct !== null ? `(זה ${yieldPct}% תפוקה)` : ""}
              </small>
            </div>

            <div className={styles.explainBox} style={{ width: "100%" }}>
              <b>איך המערכת תחשב (העלות הסופית מחושבת לבד, אי אפשר לערוך אותה ידנית):</b>{" "}
              {priceN !== null && purchaseUnit && unitsN > 0 ? (
                <>
                  קונים 1 {purchaseUnit} ב-₪{formatNum(priceN)}. ממנו יוצאים {formatNum(unitsN)} {formUnit}, ומתוכם {formatNum(usableN)} {formUnit} שמישים
                  {yieldPct !== null ? ` (${yieldPct}%)` : ""}. לכן 1 {formUnit} של ״{formName || "המרכיב"}״ עולה{" "}
                  <b>₪{costPerUsable !== null ? formatNum(Math.round(costPerUsable * 1e6) / 1e6) : "?"}</b>.
                </>
              ) : (
                <>מלאו מחיר, יחידת קנייה וכמות כדי לראות כאן כמה עולה 1 {formUnit || "גרם"}.</>
              )}
            </div>

            {mode !== "newForm" && (
              <details style={{ width: "100%" }}>
                <summary className={styles.muted}>רשימת קניות (לא חובה)</summary>
                <div className={styles.form} style={{ marginTop: 8 }}>
                  <div className={styles.field} style={{ flex: 1 }}>
                    <label>שם ברשימת קניות (אם שונה)</label>
                    <input name="purchaseName" type="text" defaultValue={form?.purchaseName ?? ""} />
                  </div>
                  <div className={styles.field}>
                    <label>יחידה ברשימת קניות</label>
                    <input name="listUnit" type="text" defaultValue={form?.purchaseUnit ?? ""} style={{ width: 100 }} />
                  </div>
                </div>
              </details>
            )}
          </>
        )}

        {mode === "move" && (
          <>
            <p className={styles.helpBox} style={{ width: "100%" }}>
              המרכיב ״{form?.name}״ יהפוך למרכיב של פריט אחר מהחשבונית וייקח את המחיר שלו. למשל: להעביר את ״חלמון״ ו״חלבון״ לפריט ״ביצים L״, כדי שמחיר אחד יעדכן את שלושתם. אפשר לראות בתצוגה המקדימה איך העלויות ישתנו לפני שמירה.
            </p>
            <div className={styles.field} style={{ flex: 1 }}>
              <label>העבר לפריט</label>
              <select name="targetItemId" required defaultValue="">
                <option value="" disabled>
                  בחירת פריט...
                </option>
                {otherItems.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>כמה {form?.unit ?? "גרם"} יוצאים מיחידת קנייה אחת של הפריט החדש? (לפני פחת)</label>
              <input name="unitsPerPurchaseUnit" type="number" min="0.00001" step="any" defaultValue={form?.unitsPerPurchaseUnit ?? 1000} required style={{ width: 150 }} />
              <small className={styles.hint}>אחרי ההעברה אפשר לערוך את המרכיב ולהגדיר כמה ממנו שמיש.</small>
            </div>
          </>
        )}

        {review && (
          <div className={styles.reviewBox} style={{ width: "100%" }}>
            <h3>תצוגה מקדימה: מה ישתנה</h3>
            {review.warnings.length > 0 && (
              <ul className={styles.warnList}>
                {review.warnings.map((w) => (
                  <li key={w}>⚠ {w}</li>
                ))}
              </ul>
            )}
            {review.preview && review.preview.ingredients.length > 0 && (
              <>
                <p className={styles.muted}>מחיר ליחידת מדידה:</p>
                <ul>
                  {review.preview.ingredients.map((i) => (
                    <li key={i.id}>
                      {i.name}: {money(i.oldPrice)} ← <b>{money(i.newPrice)}</b> ל{i.unit}
                      {i.oldYield !== i.newYield && ` · תפוקה ${i.oldYield ?? 100}% ← ${i.newYield ?? 100}%`}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {review.preview && review.preview.recipes.length > 0 ? (
              <>
                <p className={styles.muted}>עלות מתכונים (בסיס המתכון):</p>
                <ul>
                  {review.preview.recipes.map((r) => (
                    <li key={r.id}>
                      {r.name}: ₪{formatNum(r.oldCost)} ← <b>₪{formatNum(r.newCost)}</b>
                      {r.changePct !== null && ` (${r.changePct > 0 ? "+" : ""}${Math.round(r.changePct * 10) / 10}%)`}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              !hasChanges && <p className={styles.muted}>אין שינוי בעלות של אף מתכון.</p>
            )}
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div style={{ display: "flex", gap: 10, width: "100%", flexWrap: "wrap" }}>
          <button type="submit" className={styles.btn} disabled={saving}>
            {saving ? "רגע..." : review ? "אישור ושמירה" : mode === "newForm" ? "הוספה" : "בדיקה ושמירה"}
          </button>
          {review && (
            <button type="button" className={styles.btnSecondary} onClick={() => setReview(null)}>
              חזרה לעריכה
            </button>
          )}
          {(mode === "form" || mode === "combined") && form && canMove && !review && (
            <button type="button" className={styles.btnSecondary} onClick={() => setMode("move")}>
              העברה לפריט אחר
            </button>
          )}
          {(mode === "form" || mode === "combined") && form && (
            <button type="button" className={styles.btnDanger} onClick={handleDelete} disabled={saving}>
              מחיקה
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
