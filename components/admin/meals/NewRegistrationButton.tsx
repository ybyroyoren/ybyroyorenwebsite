"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/admin/Modal";
import styles from "@/app/admin/admin.module.css";

export function NewRegistrationButton({
  mealId,
  mealTitle,
  createAction,
}: {
  mealId: string;
  mealTitle: string;
  createAction: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await createAction(new FormData(e.currentTarget));
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" className={styles.btnSecondary} onClick={() => setOpen(true)}>
        + הרשמה ידנית
      </button>
      {open && (
        <Modal title={`הרשמה ידנית — ${mealTitle}`} onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <input type="hidden" name="mealId" value={mealId} />
            <div className={styles.field} style={{ width: "100%" }}>
              <label>שם הלקוח/ה</label>
              <input name="customerName" type="text" required />
            </div>
            <div className={styles.field}>
              <label>טלפון</label>
              <input name="customerPhone" type="tel" style={{ width: 140 }} />
            </div>
            <div className={styles.field} style={{ flex: 1 }}>
              <label>אימייל</label>
              <input name="customerEmail" type="email" />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>שם הסועד/ת</label>
              <input name="dinerName" type="text" required />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>הגבלות תזונה (מופרדות בפסיק)</label>
              <input name="restrictions" type="text" />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>הערות</label>
              <input name="notes" type="text" />
            </div>
            <div className={styles.field}>
              <label>
                <input type="checkbox" name="paid" /> המקדמה שולמה (למשל התקבלה שלא דרך האתר)
              </label>
            </div>
            <button type="submit" className={styles.btn}>
              הוספת הרשמה
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
