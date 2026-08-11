"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/admin/Modal";
import styles from "@/app/admin/admin.module.css";

export interface DinerData {
  id: string;
  fullName: string;
  restrictions: string[];
  notes: string;
  paid: boolean;
}

export interface RegistrationData {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: "pending" | "paid" | "cancelled";
  diners: DinerData[];
}

export interface MealOption {
  id: string;
  title: string;
  date: string;
}

export interface MealRegistrationActions {
  updateRegistrationContact: (fd: FormData) => Promise<void>;
  deleteRegistration: (fd: FormData) => Promise<void>;
  moveRegistrationToMeal: (fd: FormData) => Promise<void>;
  addDinerToRegistration: (fd: FormData) => Promise<void>;
  updateDiner: (fd: FormData) => Promise<void>;
  deleteDiner: (fd: FormData) => Promise<void>;
  toggleDinerPaid: (fd: FormData) => Promise<void>;
  moveDinerToMeal: (fd: FormData) => Promise<void>;
}

const STATUS_LABEL: Record<RegistrationData["status"], string> = {
  paid: "שולם דרך האתר",
  pending: "ממתין",
  cancelled: "בוטל",
};

export function MealRegistrationsTable({
  registrations,
  otherMeals,
  isOwner,
  actions,
}: {
  registrations: RegistrationData[];
  otherMeals: MealOption[];
  isOwner: boolean;
  actions?: MealRegistrationActions;
}) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>שולם</th>
          <th>סועד</th>
          <th>הגבלות / הערות</th>
          {isOwner && <th></th>}
        </tr>
      </thead>
      <tbody>
        {registrations.length === 0 && (
          <tr>
            <td colSpan={4} className={styles.muted}>
              אין הרשמות עדיין.
            </td>
          </tr>
        )}
        {registrations.map((reg) =>
          isOwner && actions ? (
            <RegistrationGroup key={reg.id} reg={reg} otherMeals={otherMeals} actions={actions} />
          ) : (
            <ReadOnlyGroup key={reg.id} reg={reg} />
          )
        )}
      </tbody>
    </table>
  );
}

function ReadOnlyGroup({ reg }: { reg: RegistrationData }) {
  return (
    <>
      <tr className={styles.groupHeaderRow}>
        <td colSpan={3}>
          <span className={styles.groupContact}>
            {reg.customerName} <span>· {reg.customerPhone} · {reg.customerEmail} · {STATUS_LABEL[reg.status]}</span>
          </span>
        </td>
      </tr>
      {reg.diners.map((d) => (
        <tr key={d.id}>
          <td>
            <span className={d.paid ? styles.badgePaid : styles.badgePending}>{d.paid ? "שולם" : "לא שולם"}</span>
          </td>
          <td>{d.fullName}</td>
          <td>
            {d.restrictions.length > 0 ? d.restrictions.join(", ") : "—"}
            {d.notes && ` (${d.notes})`}
          </td>
        </tr>
      ))}
    </>
  );
}

function RegistrationGroup({
  reg,
  otherMeals,
  actions,
}: {
  reg: RegistrationData;
  otherMeals: MealOption[];
  actions: MealRegistrationActions;
}) {
  const router = useRouter();
  const [editingContact, setEditingContact] = useState(false);
  const [addingDiner, setAddingDiner] = useState(false);

  async function handleMoveGroup(targetMealId: string) {
    if (!targetMealId) return;
    const fd = new FormData();
    fd.set("id", reg.id);
    fd.set("targetMealId", targetMealId);
    await actions.moveRegistrationToMeal(fd);
    router.refresh();
  }

  async function handleDeleteGroup() {
    const fd = new FormData();
    fd.set("id", reg.id);
    await actions.deleteRegistration(fd);
    router.refresh();
  }

  async function handleContactSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await actions.updateRegistrationContact(new FormData(e.currentTarget));
    setEditingContact(false);
    router.refresh();
  }

  async function handleAddDinerSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await actions.addDinerToRegistration(new FormData(e.currentTarget));
    setAddingDiner(false);
    router.refresh();
  }

  return (
    <>
      <tr className={styles.groupHeaderRow}>
        <td colSpan={4}>
          <div className={styles.groupHeaderBar}>
            <span className={styles.groupContact}>
              {reg.customerName}{" "}
              <span>
                · {reg.customerPhone || "—"} · {reg.customerEmail || "—"} · {STATUS_LABEL[reg.status]}
              </span>
            </span>
            <div className={styles.groupActions}>
              <button type="button" className={styles.btnSecondary} onClick={() => setEditingContact(true)}>
                עריכת פרטי קשר
              </button>
              <button type="button" className={styles.btnSecondary} onClick={() => setAddingDiner(true)}>
                + הוספת סועד
              </button>
              {otherMeals.length > 0 && (
                <select
                  className={styles.miniSelect}
                  defaultValue=""
                  onChange={(e) => {
                    handleMoveGroup(e.target.value);
                    e.target.value = "";
                  }}
                >
                  <option value="" disabled>
                    העברת הקבוצה לארוחה...
                  </option>
                  {otherMeals.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} — {m.date}
                    </option>
                  ))}
                </select>
              )}
              <button type="button" className={styles.btnDanger} onClick={handleDeleteGroup}>
                מחיקת קבוצה
              </button>
            </div>
          </div>
        </td>
      </tr>

      {reg.diners.map((d) => (
        <DinerRow key={d.id} diner={d} registrationId={reg.id} otherMeals={otherMeals} actions={actions} />
      ))}

      {editingContact && (
        <Modal title={`עריכת פרטי קשר — ${reg.customerName}`} onClose={() => setEditingContact(false)}>
          <form onSubmit={handleContactSubmit} className={styles.form}>
            <input type="hidden" name="id" value={reg.id} />
            <div className={styles.field} style={{ width: "100%" }}>
              <label>שם</label>
              <input name="customerName" type="text" defaultValue={reg.customerName} required />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>טלפון</label>
              <input name="customerPhone" type="tel" defaultValue={reg.customerPhone} />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>אימייל</label>
              <input name="customerEmail" type="email" defaultValue={reg.customerEmail} />
            </div>
            <button type="submit" className={styles.btn}>
              שמירה
            </button>
          </form>
        </Modal>
      )}

      {addingDiner && (
        <Modal title={`הוספת סועד ל${reg.customerName}`} onClose={() => setAddingDiner(false)}>
          <form onSubmit={handleAddDinerSubmit} className={styles.form}>
            <input type="hidden" name="registrationId" value={reg.id} />
            <div className={styles.field} style={{ width: "100%" }}>
              <label>שם הסועד/ת</label>
              <input name="fullName" type="text" required />
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
                <input type="checkbox" name="paid" /> המקדמה שולמה
              </label>
            </div>
            <button type="submit" className={styles.btn}>
              הוספה
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

function DinerRow({
  diner,
  registrationId,
  otherMeals,
  actions,
}: {
  diner: DinerData;
  registrationId: string;
  otherMeals: MealOption[];
  actions: MealRegistrationActions;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  async function handleTogglePaid() {
    const fd = new FormData();
    fd.set("id", diner.id);
    fd.set("current", String(diner.paid));
    await actions.toggleDinerPaid(fd);
    router.refresh();
  }

  async function handleMove(targetMealId: string) {
    if (!targetMealId) return;
    const fd = new FormData();
    fd.set("dinerId", diner.id);
    fd.set("targetMealId", targetMealId);
    await actions.moveDinerToMeal(fd);
    router.refresh();
  }

  async function handleDelete() {
    const fd = new FormData();
    fd.set("id", diner.id);
    fd.set("registrationId", registrationId);
    await actions.deleteDiner(fd);
    router.refresh();
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await actions.updateDiner(new FormData(e.currentTarget));
    setEditing(false);
    router.refresh();
  }

  return (
    <>
      <tr>
        <td>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={diner.paid} onChange={handleTogglePaid} />
            <span className={diner.paid ? styles.badgePaid : styles.badgePending}>
              {diner.paid ? "שולם" : "לא שולם"}
            </span>
          </label>
        </td>
        <td>{diner.fullName}</td>
        <td>
          {diner.restrictions.length > 0 ? diner.restrictions.join(", ") : "—"}
          {diner.notes && ` (${diner.notes})`}
        </td>
        <td>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button type="button" className={styles.btnSecondary} onClick={() => setEditing(true)}>
              עריכה
            </button>
            {otherMeals.length > 0 && (
              <select
                className={styles.miniSelect}
                defaultValue=""
                onChange={(e) => {
                  handleMove(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="" disabled>
                  העברה לארוחה...
                </option>
                {otherMeals.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} — {m.date}
                  </option>
                ))}
              </select>
            )}
            <button type="button" className={styles.btnDanger} onClick={handleDelete}>
              מחיקה
            </button>
          </div>
        </td>
      </tr>

      {editing && (
        <Modal title={`עריכת ${diner.fullName}`} onClose={() => setEditing(false)}>
          <form onSubmit={handleEditSubmit} className={styles.form}>
            <input type="hidden" name="id" value={diner.id} />
            <div className={styles.field} style={{ width: "100%" }}>
              <label>שם</label>
              <input name="fullName" type="text" defaultValue={diner.fullName} required />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>הגבלות תזונה (מופרדות בפסיק)</label>
              <input name="restrictions" type="text" defaultValue={diner.restrictions.join(", ")} />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>הערות</label>
              <input name="notes" type="text" defaultValue={diner.notes} />
            </div>
            <div className={styles.field}>
              <label>
                <input type="checkbox" name="paid" defaultChecked={diner.paid} /> המקדמה שולמה
              </label>
            </div>
            <button type="submit" className={styles.btn}>
              שמירה
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
