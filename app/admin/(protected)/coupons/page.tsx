import { requireAdminSection } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createCoupon, deleteCoupon, toggleCoupon } from "@/lib/actions/admin/coupons";
import styles from "../../admin.module.css";

export default async function AdminCouponsPage() {
  await requireAdminSection("coupons");
  const db = supabaseAdmin();
  const { data: coupons } = await db
    .from("coupons")
    .select("id, code, discount_pct, active")
    .order("created_at", { ascending: false });

  return (
    <>
      <h1>קופונים</h1>

      <div className={styles.card}>
        <h2>קופון חדש</h2>
        <form action={createCoupon} className={styles.form}>
          <div className={styles.field}>
            <label>קוד</label>
            <input name="code" type="text" required style={{ textTransform: "uppercase" }} />
          </div>
          <div className={styles.field}>
            <label>אחוז הנחה</label>
            <input name="discountPct" type="number" min="1" max="100" required />
          </div>
          <button type="submit" className={styles.btn}>
            הוספה
          </button>
        </form>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>קוד</th>
              <th>הנחה</th>
              <th>סטטוס</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(coupons ?? []).map((c) => (
              <tr key={c.id}>
                <td>{c.code}</td>
                <td>{(c.discount_pct * 100).toFixed(0)}%</td>
                <td>
                  <form action={toggleCoupon}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={String(c.active)} />
                    <button
                      type="submit"
                      className={c.active ? styles.badgePaid : styles.badgePending}
                      style={{ border: "none", cursor: "pointer" }}
                    >
                      {c.active ? "פעיל" : "כבוי"}
                    </button>
                  </form>
                </td>
                <td>
                  <form action={deleteCoupon}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className={styles.btnDanger}>
                      מחיקה
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
