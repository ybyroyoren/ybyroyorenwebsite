"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/admin/Modal";
import type { KLSupplier } from "@/lib/kitchen/types";
import styles from "@/app/admin/admin.module.css";

export function SupplierRow({
  supplier,
  updateAction,
  deleteAction,
}: {
  supplier: KLSupplier;
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

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
    fd.set("id", supplier.id);
    await deleteAction(fd);
    router.refresh();
  }

  return (
    <>
      <tr>
        <td>{supplier.name}</td>
        <td>{supplier.phone || "—"}</td>
        <td>{supplier.email || "—"}</td>
        <td>{supplier.note || "—"}</td>
        <td>
          <button type="button" className={styles.btnSecondary} onClick={() => setEditing(true)}>
            עריכה
          </button>
        </td>
      </tr>
      {editing && (
        <Modal title={`עריכת ${supplier.name}`} onClose={() => setEditing(false)}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <input type="hidden" name="id" value={supplier.id} />
            <div className={styles.field} style={{ width: "100%" }}>
              <label>שם</label>
              <input name="name" type="text" defaultValue={supplier.name} required />
            </div>
            <div className={styles.field}>
              <label>טלפון</label>
              <input name="phone" type="tel" defaultValue={supplier.phone} style={{ width: 140 }} />
            </div>
            <div className={styles.field} style={{ flex: 1 }}>
              <label>אימייל</label>
              <input name="email" type="email" defaultValue={supplier.email} />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>הערה</label>
              <input name="note" type="text" defaultValue={supplier.note} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
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
