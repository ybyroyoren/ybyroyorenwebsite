"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/admin/Modal";
import type { KLIngredient, KLSupplier } from "@/lib/kitchen/types";
import styles from "@/app/admin/admin.module.css";

export function IngredientRow({
  ingredient,
  suppliers,
  isOwner,
  updateAction,
  deleteAction,
}: {
  ingredient: KLIngredient;
  suppliers: KLSupplier[];
  isOwner: boolean;
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const supplierName = suppliers.find((s) => s.id === ingredient.supplierId)?.name ?? "—";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    await updateAction(new FormData(e.currentTarget));
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    setSaving(true);
    const fd = new FormData();
    fd.set("id", ingredient.id);
    await deleteAction(fd);
    router.refresh();
  }

  return (
    <>
      <tr>
        <td>{ingredient.name}</td>
        <td>{ingredient.unit}</td>
        <td>{supplierName}</td>
        <td>{ingredient.purchaseName || "—"}</td>
        <td>{ingredient.purchaseUnit || "—"}</td>
        <td>{ingredient.yieldPercent ?? "—"}</td>
        {isOwner && <td>{ingredient.price ?? "—"}</td>}
        {isOwner && (
          <td>
            <button type="button" className={styles.btnSecondary} onClick={() => setEditing(true)}>
              עריכה
            </button>
          </td>
        )}
      </tr>
      {editing && (
        <Modal title={`עריכת ${ingredient.name}`} onClose={() => setEditing(false)}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <input type="hidden" name="id" value={ingredient.id} />
            <div className={styles.field} style={{ width: "100%" }}>
              <label>שם</label>
              <input name="name" type="text" defaultValue={ingredient.name} required />
            </div>
            <div className={styles.field}>
              <label>יחידה</label>
              <input name="unit" type="text" defaultValue={ingredient.unit} placeholder="גרם / יח'" required style={{ width: 100 }} />
            </div>
            <div className={styles.field} style={{ flex: 1 }}>
              <label>ספק</label>
              <select name="supplierId" defaultValue={ingredient.supplierId ?? ""}>
                <option value="">—</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>שם לרכישה (אם שונה)</label>
              <input name="purchaseName" type="text" defaultValue={ingredient.purchaseName} />
            </div>
            <div className={styles.field}>
              <label>יחידת רכישה (אם שונה)</label>
              <input name="purchaseUnit" type="text" defaultValue={ingredient.purchaseUnit} style={{ width: 100 }} />
            </div>
            <div className={styles.field}>
              <label>אחוז תפוקה</label>
              <input
                name="yieldPercent"
                type="number"
                min="1"
                max="99"
                step="0.1"
                defaultValue={ingredient.yieldPercent ?? ""}
                style={{ width: 90 }}
              />
            </div>
            <div className={styles.field}>
              <label>מחיר ליחידת רכישה</label>
              <input
                name="price"
                type="number"
                min="0"
                step="0.0001"
                defaultValue={ingredient.price ?? ""}
                style={{ width: 110 }}
              />
            </div>
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button type="submit" className={styles.btn} disabled={saving}>
                {saving ? "שומר..." : "שמירה"}
              </button>
              <button type="button" className={styles.btnDanger} onClick={handleDelete} disabled={saving}>
                מחיקה
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
