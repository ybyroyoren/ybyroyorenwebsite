"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/admin/Modal";
import type { KLEquipment } from "@/lib/kitchen/types";
import styles from "@/app/admin/admin.module.css";

export function EquipmentRow({
  equipment,
  updateAction,
  deleteAction,
}: {
  equipment: KLEquipment;
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
    fd.set("id", equipment.id);
    await deleteAction(fd);
    router.refresh();
  }

  return (
    <>
      <tr>
        <td>{equipment.name}</td>
        <td>{equipment.note || "—"}</td>
        <td>
          <button type="button" className={styles.btnSecondary} onClick={() => setEditing(true)}>
            עריכה
          </button>
        </td>
      </tr>
      {editing && (
        <Modal title={`עריכת ${equipment.name}`} onClose={() => setEditing(false)}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <input type="hidden" name="id" value={equipment.id} />
            <div className={styles.field} style={{ width: "100%" }}>
              <label>שם</label>
              <input name="name" type="text" defaultValue={equipment.name} required />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>הערה</label>
              <input name="note" type="text" defaultValue={equipment.note} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" className={styles.btn} disabled={saving}>
                {saving ? "שומר..." : "שמירה"}
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={handleDelete}
                disabled={saving}
                title="מחיקה תסיר את הציוד ממתכונים שמשתמשים בו"
              >
                מחיקה
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
