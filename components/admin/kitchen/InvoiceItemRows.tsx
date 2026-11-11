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

const money = (n: number | null) => (n === null ? "—" : formatNum(n));
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
            <td>{single.yieldPercent ?? "—"}</td>
            <td>{money(single.price)}</td>
            <td>
              <div className={styles.rowActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModal({ mode: "combined", form: single })}>
                  עריכה
                </button>
                <button type="button" className={styles.btnSecondary} onClick={() => setModal({ mode: "newForm" })} title="צורה נוספת של אותו פריט, עם אותו מחיר">
                  + צורה
                </button>
              </div>
            </td>
          </>
        ) : (
          <>
            <td colSpan={3} className={styles.muted}>
              {forms.length} צורות
            </td>
            <td>
              <div className={styles.rowActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModal({ mode: "item" })}>
                  עריכת הפריט
                </button>
                <button type="button" className={styles.btnSecondary} onClick={() => setModal({ mode: "newForm" })}>
                  + צורה
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
              ↳ {f.name}
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
            <td>{f.yieldPercent ?? "—"}</td>
            <td>{money(f.price)}</td>
            <td>
              <div className={styles.rowActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModal({ mode: "form", form: f })}>
                  עריכה
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
    mode === "newForm" ? `צורה נוספת של ${item.name}` : mode === "move" ? `העברת ${form?.name} לפריט אחר` : mode === "item" ? `עריכת ${item.name}` : `עריכת ${form?.name ?? item.name}`;

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
            <div className={styles.field} style={{ width: "100%" }}>
              <label>שם הפריט (כמו בחשבונית)</label>
              <input name="itemName" type="text" defaultValue={item.name} required />
            </div>
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
              <label>יחידת קנייה</label>
              <input name="purchaseUnit" type="text" list="purchase-units" defaultValue={item.purchaseUnit} required style={{ width: 110 }} />
            </div>
            <div className={styles.field}>
              <label>מחיר נטו ליחידת קנייה</label>
              <input name="priceNet" type="number" min="0" step="0.0001" defaultValue={item.priceNet ?? ""} style={{ width: 130 }} />
            </div>
            <div className={styles.field}>
              <label>מע״מ % (מידע בלבד)</label>
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
            {mode === "combined" && (
              <p className={styles.sectionNote} style={{ width: "100%" }}>
                המרכיב שמתכונים משתמשים בו: כמה גרם (או מ״ל / יחידות) מתקבלים מיחידת קנייה אחת, ואחוז התפוקה אחרי קילוף וגזירה.
              </p>
            )}
            <div className={styles.field} style={{ width: "100%" }}>
              <label>שם המרכיב</label>
              <input name="formName" type="text" defaultValue={mode === "newForm" ? "" : (form?.name ?? item.name)} required placeholder={mode === "newForm" ? "למשל: בצל מקולף" : ""} />
            </div>
            <div className={styles.field}>
              <label>יחידת מדידה במתכון</label>
              <input name="formUnit" type="text" list="measure-units" defaultValue={form?.unit ?? "גרם"} required style={{ width: 100 }} />
            </div>
            <div className={styles.field}>
              <label>כמות ביחידת קנייה</label>
              <input name="unitsPerPurchaseUnit" type="number" min="0.00001" step="any" defaultValue={form?.unitsPerPurchaseUnit ?? 1000} required style={{ width: 120 }} />
            </div>
            <div className={styles.field}>
              <label>אחוז תפוקה (ריק = 100%)</label>
              <input name="yieldPercent" type="number" min="1" max="100" step="0.1" defaultValue={form?.yieldPercent ?? ""} style={{ width: 120 }} />
            </div>
            {mode !== "newForm" && (
              <>
                <div className={styles.field} style={{ flex: 1 }}>
                  <label>שם ברשימת קניות (אם שונה)</label>
                  <input name="purchaseName" type="text" defaultValue={form?.purchaseName ?? ""} />
                </div>
                <div className={styles.field}>
                  <label>יחידה ברשימת קניות</label>
                  <input name="listUnit" type="text" defaultValue={form?.purchaseUnit ?? ""} style={{ width: 100 }} />
                </div>
              </>
            )}
          </>
        )}

        {mode === "move" && (
          <>
            <p className={styles.sectionNote} style={{ width: "100%" }}>
              המרכיב יהפוך לצורה של פריט אחר מהחשבונית, וייקח את המחיר שלו. זה שינוי ידני בלבד, ואפשר לראות בתצוגה המקדימה איך העלויות ישתנו.
            </p>
            <div className={styles.field} style={{ flex: 1 }}>
              <label>הפריט שאליו מעבירים</label>
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
              <label>כמות ביחידת הקנייה של הפריט החדש</label>
              <input name="unitsPerPurchaseUnit" type="number" min="0.00001" step="any" defaultValue={form?.unitsPerPurchaseUnit ?? 1000} required style={{ width: 150 }} />
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
