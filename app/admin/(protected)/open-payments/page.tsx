import { requireAdminSection } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { paymentBreakdown } from "@/lib/mealPayments";
import { todayIsraelIso } from "@/lib/date";
import { addRegistrationPayment, markMealPaidInFull, markRegistrationPaidInFull } from "@/lib/actions/admin/meal-registrations";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import styles from "../../admin.module.css";

const shekels = (n: number) => `₪${n.toLocaleString("he-IL")}`;

interface Row {
  id: string;
  mealId: string;
  customer: string;
  contact: string;
  meal: string;
  date: string;
  past: boolean;
  seats: number;
  paid: number;
  remainingDeposit: number;
  remainingAtEvent: number;
  remainingTotal: number;
}

function PaymentRows({ rows }: { rows: Row[] }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>לקוח</th>
          <th>ארוחה</th>
          <th>סועדים</th>
          <th>שולם</th>
          <th>נותר למקדמה</th>
          <th>נותר ביום האירוע</th>
          <th>סה&quot;כ נותר</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>
              <b>{r.customer}</b>
              <div className={styles.muted}>{r.contact}</div>
            </td>
            <td>
              {r.meal}
              <div className={r.past ? undefined : styles.muted} style={r.past ? { color: "var(--danger)", fontWeight: 600 } : undefined}>
                {r.date}
                {r.past ? " · האירוע עבר" : ""}
              </div>
            </td>
            <td>{r.seats}</td>
            <td>{shekels(r.paid)}</td>
            <td style={r.remainingDeposit > 0 ? { color: "var(--danger)", fontWeight: 600 } : undefined}>{shekels(r.remainingDeposit)}</td>
            <td>{shekels(r.remainingAtEvent)}</td>
            <td>
              <b>{shekels(r.remainingTotal)}</b>
            </td>
            <td>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <form action={addRegistrationPayment} style={{ display: "flex", gap: 6 }}>
                  <input type="hidden" name="id" value={r.id} />
                  <input name="amount" type="number" min="0.01" step="0.01" placeholder="סכום ₪" required style={{ width: 90 }} aria-label="סכום ששולם" />
                  <button type="submit" className={styles.btnSecondary}>
                    הוספת תשלום
                  </button>
                </form>
                <form action={markRegistrationPaidInFull}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className={styles.btn} title="הלקוח שילם את כל מה שנותר, וההזמנה תיעלם מהרשימה הזו">
                    שולם הכל
                  </button>
                </form>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Every open-meal booking that still owes money: what was paid, what is left, and a way to record payments. */
export default async function AdminOpenPaymentsPage() {
  await requireAdminSection("open_payments");
  const today = todayIsraelIso();

  const { data } = await supabaseAdmin()
    .from("meal_registrations")
    .select(
      "id, meal_id, customer_name, customer_email, customer_phone, status, source, paid_amount, deposit_discount, balance_discount, meals(title, date, price_per_seat), meal_diners(id)"
    );

  const owing: Row[] = [];
  const unpaidWeb: Row[] = [];
  for (const r of data ?? []) {
    if (r.status === "cancelled") continue;
    const meal = r.meals as unknown as { title: string; date: string; price_per_seat: number } | null;
    if (!meal) continue;
    const seats = (r.meal_diners as unknown as { id: string }[]).length;
    const p = paymentBreakdown({
      seats,
      pricePerSeat: Number(meal.price_per_seat),
      paidAmount: Number(r.paid_amount),
      depositDiscount: Number(r.deposit_discount),
      balanceDiscount: Number(r.balance_discount),
    });
    if (p.remainingTotal <= 0.005) continue;
    const row: Row = {
      id: r.id,
      mealId: r.meal_id,
      customer: r.customer_name,
      contact: [r.customer_phone, r.customer_email].filter(Boolean).join(" · ") || "אין פרטי קשר",
      meal: meal.title,
      date: meal.date,
      past: meal.date < today,
      seats,
      paid: p.paid,
      remainingDeposit: p.remainingDeposit,
      remainingAtEvent: p.remainingAtEvent,
      remainingTotal: p.remainingTotal,
    };
    // Started on the website but never paid: not a registration yet, listed apart.
    (r.status === "pending" && r.source !== "admin" ? unpaidWeb : owing).push(row);
  }
  const byDate = (a: Row, b: Row) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.customer.localeCompare(b.customer, "he"));
  owing.sort(byDate);
  unpaidWeb.sort(byDate);

  // One block per meal, oldest first: meals that already took place usually have the day-of-meal balance paid at the
  // table and never recorded, so they can be cleared in one go.
  const mealGroups = [...new Set(owing.map((r) => r.mealId))].map((mealId) => {
    const rows = owing.filter((r) => r.mealId === mealId);
    return { mealId, meal: rows[0].meal, date: rows[0].date, past: rows[0].past, rows, left: rows.reduce((sum, r) => sum + r.remainingTotal, 0) };
  });

  const totalLeft = owing.reduce((sum, r) => sum + r.remainingTotal, 0);
  const totalPaid = owing.reduce((sum, r) => sum + r.paid, 0);

  return (
    <>
      <h1>תשלומים פתוחים</h1>
      <div className={styles.explainBox}>
        כל הלקוחות שנרשמו לארוחות פתוחות ועוד לא שילמו הכל. כאן רואים כמה כל אחד שילם, כמה נותר למקדמה וכמה ליום האירוע. &quot;הוספת תשלום&quot; מוסיפה
        את הסכום ששולם, ו&quot;שולם הכל&quot; מסמנת שהלקוח שילם את כל מה שנותר. ברגע שההזמנה שולמה במלואה היא נעלמת מהמסך הזה. הנחות וקופונים כבר
        מחושבים בסכומים.
      </div>

      <div className={styles.statGrid}>
        <div className={styles.stat}>
          <div className={styles.muted}>לקוחות שנותר להם לשלם</div>
          <b style={{ fontSize: 26 }}>{owing.length}</b>
        </div>
        <div className={styles.stat}>
          <div className={styles.muted}>סה&quot;כ נותר לגבות</div>
          <b style={{ fontSize: 26 }}>{shekels(totalLeft)}</b>
        </div>
        <div className={styles.stat}>
          <div className={styles.muted}>כבר שולם על ידם</div>
          <b style={{ fontSize: 26 }}>{shekels(totalPaid)}</b>
        </div>
      </div>

      {owing.length === 0 && (
        <div className={styles.card}>
          <p className={styles.muted}>אין כרגע לקוחות שנותר להם לשלם. 🎉</p>
        </div>
      )}
      {mealGroups.map((g) => (
        <div key={g.mealId} className={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>
              {g.meal} — {g.date}{" "}
              <span className={styles.muted}>
                ({g.rows.length} הזמנות · נותר {shekels(g.left)})
              </span>
              {g.past && <span className={styles.badgePending} style={{ marginInlineStart: 8 }}>האירוע עבר</span>}
            </h2>
            <form action={markMealPaidInFull}>
              <input type="hidden" name="mealId" value={g.mealId} />
              <ConfirmButton
                className={styles.btnSecondary}
                message={`לסמן את כל ההזמנות של הארוחה הזו (${g.rows.length}) כשולמו במלואן? הן ייעלמו מהמסך הזה.`}
              >
                סימון כל הארוחה כשולמה
              </ConfirmButton>
            </form>
          </div>
          <PaymentRows rows={g.rows} />
        </div>
      ))}

      {unpaidWeb.length > 0 && (
        <details className={styles.card}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
            התחילו הרשמה באתר ולא שילמו מקדמה ({unpaidWeb.length})
          </summary>
          <p className={styles.muted} style={{ margin: "8px 0" }}>
            אלה לא רשומים לארוחה ולא נספרים למעלה. אם שילמו בדרך אחרת, &quot;הוספת תשלום&quot; או &quot;שולם הכל&quot; ירשמו אותם לארוחה.
          </p>
          <PaymentRows rows={unpaidWeb} />
        </details>
      )}
    </>
  );
}
