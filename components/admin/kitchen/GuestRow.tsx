"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/admin/Modal";
import { GuestNameCell, type GuestHistoryEvent } from "@/components/admin/kitchen/GuestNameCell";
import type { KLGuest } from "@/lib/kitchen/types";
import styles from "@/app/admin/admin.module.css";

export function GuestRow({
  guest,
  history,
  updateAction,
  deleteAction,
}: {
  guest: KLGuest;
  history: GuestHistoryEvent[];
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
    fd.set("id", guest.id);
    await deleteAction(fd);
    router.refresh();
  }

  return (
    <>
      <tr>
        <td>
          <GuestNameCell name={guest.name} history={history} />
        </td>
        <td>{guest.phone || "—"}</td>
        <td>{guest.restrictions || "—"}</td>
        <td>
          <button type="button" className={styles.btnSecondary} onClick={() => setEditing(true)}>
            עריכה
          </button>
        </td>
      </tr>
      {editing && (
        <Modal title={`עריכת ${guest.name}`} onClose={() => setEditing(false)}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <input type="hidden" name="id" value={guest.id} />
            <div className={styles.field} style={{ width: "100%" }}>
              <label>שם</label>
              <input name="name" type="text" defaultValue={guest.name} required />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>טלפון</label>
              <input name="phone" type="tel" defaultValue={guest.phone} />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>הגבלות תזונה</label>
              <input name="restrictions" type="text" defaultValue={guest.restrictions} />
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
