"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { computeCartTotals, formatCurrency } from "@/lib/pricing";
import styles from "@/app/admin/admin.module.css";

export interface ManualOrderSizeOption {
  id: string;
  label: string;
  priceBeforeVat: number;
}

interface ItemRow {
  key: string;
  productSizeId: string;
  qty: number;
}

export function ManualOrderForm({
  sizeOptions,
  createAction,
}: {
  sizeOptions: ManualOrderSizeOption[];
  createAction: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const rowKey = useId();
  const [rows, setRows] = useState<ItemRow[]>([{ key: `${rowKey}-0`, productSizeId: "", qty: 1 }]);
  const [status, setStatus] = useState("paid");
  const [submitting, setSubmitting] = useState(false);

  const sizeById = new Map(sizeOptions.map((s) => [s.id, s]));
  const subtotal = rows.reduce((sum, r) => {
    const size = sizeById.get(r.productSizeId);
    return sum + (size ? size.priceBeforeVat * r.qty : 0);
  }, 0);
  const totals = computeCartTotals(subtotal, 0, 0);

  function addRow() {
    setRows((r) => [...r, { key: `${rowKey}-${r.length}-${Date.now()}`, productSizeId: "", qty: 1 }]);
  }

  function removeRow(key: string) {
    setRows((r) => r.filter((row) => row.key !== key));
  }

  function updateRow(key: string, patch: Partial<ItemRow>) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validRows = rows.filter((r) => r.productSizeId && r.qty > 0);
    if (validRows.length === 0) return;

    const fd = new FormData(e.currentTarget);
    fd.set(
      "itemsJson",
      JSON.stringify(validRows.map((r) => ({ productSizeId: r.productSizeId, qty: r.qty })))
    );

    setSubmitting(true);
    await createAction(fd);
    setSubmitting(false);
    setRows([{ key: `${rowKey}-reset-${Date.now()}`, productSizeId: "", qty: 1 }]);
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field} style={{ width: "100%" }}>
        <label>שם לקוח</label>
        <input name="customerName" type="text" required />
      </div>
      <div className={styles.field}>
        <label>טלפון</label>
        <input name="customerPhone" type="tel" required />
      </div>
      <div className={styles.field}>
        <label>אימייל (לא חובה)</label>
        <input name="customerEmail" type="email" />
      </div>
      <div className={styles.field}>
        <label>תאריך איסוף</label>
        <input name="pickupDate" type="date" required />
      </div>

      <div className={styles.field} style={{ width: "100%" }}>
        <label>מוצרים</label>
        {rows.map((row) => (
          <div key={row.key} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <select
              className={styles.miniSelect}
              style={{ flex: 1 }}
              value={row.productSizeId}
              onChange={(e) => updateRow(row.key, { productSizeId: e.target.value })}
            >
              <option value="">— בחירת מוצר —</option>
              {sizeOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={row.qty}
              onChange={(e) => updateRow(row.key, { qty: Number(e.target.value) })}
              style={{ width: 60 }}
            />
            <button type="button" className={styles.btnDanger} onClick={() => removeRow(row.key)}>
              הסרה
            </button>
          </div>
        ))}
        <button type="button" className={styles.btnSecondary} onClick={addRow}>
          + הוספת מוצר
        </button>
      </div>

      <div className={styles.field} style={{ width: "100%" }}>
        <label>הערות</label>
        <input name="notes" type="text" />
      </div>

      <div className={styles.field}>
        <label>סטטוס תשלום</label>
        <select name="status" className={styles.miniSelect} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="paid">שולם</option>
          <option value="pending">ממתין לתשלום</option>
          <option value="cancelled">בוטל</option>
        </select>
      </div>
      <div className={styles.field}>
        <label>אמצעי תשלום</label>
        <select name="paymentMethod" className={styles.miniSelect} defaultValue="">
          <option value="">— אמצעי תשלום —</option>
          <option value="website">תשלום באתר</option>
          <option value="credit_card">אשראי</option>
          <option value="bit">ביט</option>
          <option value="paybox">פייבוקס</option>
          <option value="cash">מזומן</option>
          <option value="bank_transfer">העברה בנקאית</option>
        </select>
      </div>

      <p className={styles.sectionNote}>
        סה&quot;כ לפני מע&quot;מ: {formatCurrency(totals.subtotal)} · כולל מע&quot;מ: {formatCurrency(totals.total)}
      </p>

      <button type="submit" className={styles.btn} disabled={submitting}>
        {submitting ? "יוצר..." : "יצירת הזמנה"}
      </button>
    </form>
  );
}
