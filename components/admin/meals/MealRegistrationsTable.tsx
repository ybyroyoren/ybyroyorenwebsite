"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/admin/Modal";
import { DEPOSIT_PER_SEAT, paymentBreakdown } from "@/lib/mealPayments";
import styles from "@/app/admin/admin.module.css";

export interface DinerData {
  id: string;
  fullName: string;
  age: number | null;
  gender: "male" | "female" | "other" | null;
  restrictions: string[];
  notes: string;
  favorites: string;
  paid: boolean;
}

export interface RegistrationData {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: "pending" | "paid" | "cancelled";
  /** Started on the website but the deposit was never paid (not a registration yet). */
  unpaidWebBooking: boolean;
  /** Booked on the website (false = entered by hand in the admin). */
  fromWeb: boolean;
  /** What the group is celebrating and anything else they wrote when booking online. */
  occasions: string[];
  occasionOther: string;
  extraNotes: string;
  seatingNote: string;
  /** When the visitor confirmed the allergy warning and cancellation policy (online bookings). */
  consentedAt: string | null;
  /** Coupon used on the deposit (code) and the amount it took off. */
  couponCode: string | null;
  depositDiscount: number;
  /** Discount off the balance paid at the table. */
  balanceDiscount: number;
  /** Paid so far toward the deposit. */
  paidAmount: number;
  /** The meal's price per diner (for what is left to pay). */
  pricePerSeat: number;
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
  updateRegistrationPayment: (fd: FormData) => Promise<void>;
  addRegistrationPayment: (fd: FormData) => Promise<void>;
  markRegistrationPaidInFull: (fd: FormData) => Promise<void>;
  moveDinerToMeal: (fd: FormData) => Promise<void>;
}

const consentFormat = new Intl.DateTimeFormat("he-IL", {
  timeZone: "Asia/Jerusalem",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const GENDER_LABEL = { male: "זכר", female: "נקבה", other: "אחר" } as const;

/** "דנה כהן · 34 · נקבה" for diners who booked online; older / manual diners just have the name. */
function dinerTitle(d: DinerData): string {
  const extra = [d.age ? `גיל ${d.age}` : null, d.gender ? GENDER_LABEL[d.gender] : null].filter(Boolean).join(" · ");
  return extra ? `${d.fullName} (${extra})` : d.fullName;
}

function RegistrationExtras({ reg, colSpan }: { reg: RegistrationData; colSpan: number }) {
  const parts: { label: string; value: string }[] = [];
  if (reg.occasions.length > 0 || reg.occasionOther) {
    parts.push({ label: "חוגגים", value: [...reg.occasions, reg.occasionOther].filter(Boolean).join(", ") });
  }
  if (reg.extraNotes) parts.push({ label: "הערה מהלקוח", value: reg.extraNotes });
  if (reg.seatingNote) parts.push({ label: "רוצים לשבת ליד", value: reg.seatingNote });
  if (reg.couponCode || reg.depositDiscount > 0 || reg.balanceDiscount > 0) {
    const shekels = (n: number) => `₪${n.toLocaleString("he-IL")}`;
    const took = [
      reg.depositDiscount > 0 ? `${shekels(reg.depositDiscount)} מהמקדמה` : null,
      reg.balanceDiscount > 0 ? `${shekels(reg.balanceDiscount)} מהיתרה` : null,
    ].filter(Boolean);
    parts.push({ label: reg.couponCode ? `קופון ${reg.couponCode}` : "הנחה", value: took.join(" + ") });
  }
  if (reg.consentedAt) {
    parts.push({ label: "אישרו אזהרת אלרגנים ומדיניות ביטול", value: consentFormat.format(new Date(reg.consentedAt)) });
  }
  if (parts.length === 0) return null;
  return (
    <tr>
      <td colSpan={colSpan} style={{ fontSize: 14, lineHeight: 1.7 }}>
        {parts.map((p, i) => (
          <span key={p.label}>
            {i > 0 && <span className={styles.muted}> · </span>}
            <b>{p.label}:</b> {p.value}
          </span>
        ))}
      </td>
    </tr>
  );
}

const shekels = (n: number) => `₪${n.toLocaleString("he-IL")}`;

/** How much is paid, still due as deposit, and left for the day of the meal (a number, 0 or more). */
function PaymentLine({ reg }: { reg: RegistrationData }) {
  if (reg.status === "cancelled") return <span className={styles.badgePending}>בוטל</span>;
  const p = paymentBreakdown({
    seats: reg.diners.length,
    pricePerSeat: reg.pricePerSeat,
    paidAmount: reg.paidAmount,
    depositDiscount: reg.depositDiscount,
    balanceDiscount: reg.balanceDiscount,
  });
  return (
    <span className={styles.paymentLine}>
      <span>
        שולם: <b>{shekels(p.paid)}</b>
      </span>
      <span>
        נותר למקדמה: <b style={p.remainingDeposit > 0 ? { color: "var(--danger)" } : undefined}>{shekels(p.remainingDeposit)}</b>
      </span>
      <span>
        נותר ביום האירוע: <b>{shekels(p.remainingAtEvent)}</b>
      </span>
      <span>
        סה&quot;כ נותר לתשלום: <b style={p.remainingTotal > 0 ? { color: "var(--danger)" } : { color: "var(--olive-deep)" }}>{shekels(p.remainingTotal)}</b>
      </span>
    </span>
  );
}

/** What is still to be paid for this booking (deposit and day-of-meal together). */
function paymentLeft(reg: RegistrationData): number {
  if (reg.status === "cancelled") return 0;
  return paymentBreakdown({
    seats: reg.diners.length,
    pricePerSeat: reg.pricePerSeat,
    paidAmount: reg.paidAmount,
    depositDiscount: reg.depositDiscount,
    balanceDiscount: reg.balanceDiscount,
  }).remainingTotal;
}

/** Phone and e-mail, or a plain note when a booking entered by hand has neither. */
function contactLine(reg: RegistrationData): string {
  const parts = [reg.customerPhone, reg.customerEmail].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "אין פרטי קשר";
}

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
          <th>סועד</th>
          <th>הגבלות / הערות</th>
          {isOwner && <th></th>}
        </tr>
      </thead>
      <tbody>
        {registrations.length === 0 && (
          <tr>
            <td colSpan={3} className={styles.muted}>
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
            {reg.customerName} <span>· {contactLine(reg)}</span>
          </span>
          <div style={{ marginTop: 4 }}>
            <PaymentLine reg={reg} />
          </div>
        </td>
      </tr>
      <RegistrationExtras reg={reg} colSpan={3} />
      {reg.diners.map((d) => (
        <tr key={d.id}>
          <td>{dinerTitle(d)}</td>
          <td>
            {d.restrictions.length > 0 ? d.restrictions.join(", ") : "—"}
            {d.notes && ` (${d.notes})`}
            {d.favorites && <div className={styles.muted}>אוהב/ת: {d.favorites}</div>}
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
  const [editingPayment, setEditingPayment] = useState(false);

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

  async function handlePaidInFull() {
    const fd = new FormData();
    fd.set("id", reg.id);
    await actions.markRegistrationPaidInFull(fd);
    router.refresh();
  }

  async function handlePaymentSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await actions.updateRegistrationPayment(new FormData(e.currentTarget));
    setEditingPayment(false);
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
        <td colSpan={3}>
          <div className={styles.groupHeaderBar}>
            <span className={styles.groupContact}>
              {reg.customerName} <span>· {contactLine(reg)}</span>
              <div style={{ marginTop: 4 }}>
                <PaymentLine reg={reg} />
              </div>
            </span>
            <div className={styles.groupActions}>
              <button type="button" className={styles.btnSecondary} onClick={() => setEditingContact(true)}>
                עריכת פרטי קשר
              </button>
              <button type="button" className={styles.btnSecondary} onClick={() => setEditingPayment(true)}>
                עדכון תשלום
              </button>
              {paymentLeft(reg) > 0 && (
                <button type="button" className={styles.btnSecondary} onClick={handlePaidInFull} title="הלקוח שילם את כל מה שנותר">
                  שולם הכל
                </button>
              )}
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

      <RegistrationExtras reg={reg} colSpan={3} />
      {reg.diners.map((d) => (
        <DinerRow key={d.id} diner={d} registrationId={reg.id} otherMeals={otherMeals} actions={actions} />
      ))}

      {editingPayment && (
        <PaymentModal reg={reg} onClose={() => setEditingPayment(false)} onSubmit={handlePaymentSubmit} />
      )}

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
            <div className={styles.field}>
              <label>גיל</label>
              <input name="age" type="number" min="1" max="120" style={{ width: 90 }} />
            </div>
            <div className={styles.field}>
              <label>מין</label>
              <select name="gender" defaultValue="">
                <option value="">לא צוין</option>
                <option value="male">זכר</option>
                <option value="female">נקבה</option>
                <option value="other">אחר</option>
              </select>
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>הגבלות תזונה (מופרדות בפסיק)</label>
              <input name="restrictions" type="text" />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>הערות</label>
              <input name="notes" type="text" />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>אוהב/ת לאכול</label>
              <input name="favorites" type="text" />
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

/** Edit what was paid and the discounts of one booking; shows right away what is left to pay. */
function PaymentModal({
  reg,
  onClose,
  onSubmit,
}: {
  reg: RegistrationData;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const [paid, setPaid] = useState(String(reg.paidAmount));
  const [depositDiscount, setDepositDiscount] = useState(String(reg.depositDiscount));
  const [balanceDiscount, setBalanceDiscount] = useState(String(reg.balanceDiscount));
  const num = (v: string) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
  const p = paymentBreakdown({
    seats: reg.diners.length,
    pricePerSeat: reg.pricePerSeat,
    paidAmount: num(paid),
    depositDiscount: num(depositDiscount),
    balanceDiscount: num(balanceDiscount),
  });
  return (
    <Modal title={`תשלום — ${reg.customerName}`} onClose={onClose}>
      <form onSubmit={onSubmit} className={styles.form}>
        <input type="hidden" name="id" value={reg.id} />
        <p className={styles.muted} style={{ width: "100%", margin: 0 }}>
          {reg.diners.length} סועדים · מחיר ארוחה {shekels(p.mealTotal)} · מקדמה {shekels(DEPOSIT_PER_SEAT)} לסועד
        </p>
        <div className={styles.field}>
          <label>שולם עד כה (₪)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input name="paidAmount" type="number" min="0" step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} style={{ width: 120 }} />
            <button type="button" className={styles.btnSecondary} onClick={() => setPaid(String(p.depositDue))}>
              המקדמה שולמה במלואה
            </button>
            <button type="button" className={styles.btnSecondary} onClick={() => setPaid(String(Math.max(p.netTotal, p.paid)))}>
              שולם הכל
            </button>
          </div>
        </div>
        <div className={styles.field}>
          <label>הנחה על המקדמה (₪)</label>
          <input name="depositDiscount" type="number" min="0" step="0.01" value={depositDiscount} onChange={(e) => setDepositDiscount(e.target.value)} style={{ width: 120 }} />
        </div>
        <div className={styles.field}>
          <label>הנחה על היתרה, מעבר למקדמה (₪)</label>
          <input name="balanceDiscount" type="number" min="0" step="0.01" value={balanceDiscount} onChange={(e) => setBalanceDiscount(e.target.value)} style={{ width: 120 }} />
        </div>
        <div className={styles.explainBox} style={{ width: "100%" }}>
          מקדמה לתשלום: <b>{shekels(p.depositDue)}</b> · שולם: <b>{shekels(p.paid)}</b>
          <br />
          נותר למקדמה: <b>{shekels(p.remainingDeposit)}</b> · נותר ביום האירוע: <b>{shekels(p.remainingAtEvent)}</b> · סה&quot;כ נותר: <b>{shekels(p.remainingTotal)}</b>
        </div>
        <button type="submit" className={styles.btn}>
          שמירה
        </button>
      </form>
    </Modal>
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
        <td>{dinerTitle(diner)}</td>
        <td>
          {diner.restrictions.length > 0 ? diner.restrictions.join(", ") : "—"}
          {diner.notes && ` (${diner.notes})`}
          {diner.favorites && <div className={styles.muted}>אוהב/ת: {diner.favorites}</div>}
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
            <div className={styles.field}>
              <label>גיל</label>
              <input name="age" type="number" min="1" max="120" style={{ width: 90 }} defaultValue={diner.age ?? ""} />
            </div>
            <div className={styles.field}>
              <label>מין</label>
              <select name="gender" defaultValue={diner.gender ?? ""}>
                <option value="">לא צוין</option>
                <option value="male">זכר</option>
                <option value="female">נקבה</option>
                <option value="other">אחר</option>
              </select>
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>הגבלות תזונה (מופרדות בפסיק)</label>
              <input name="restrictions" type="text" defaultValue={diner.restrictions.join(", ")} />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>הערות</label>
              <input name="notes" type="text" defaultValue={diner.notes} />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>אוהב/ת לאכול</label>
              <input name="favorites" type="text" defaultValue={diner.favorites} />
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
