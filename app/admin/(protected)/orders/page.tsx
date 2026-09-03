import { requireAdminSection } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { cancelOrder, updateOrderFulfillmentStatus } from "@/lib/actions/admin/orders";
import { formatCurrency } from "@/lib/pricing";
import { OrderFulfillmentSelect } from "@/components/admin/OrderFulfillmentSelect";
import styles from "../../admin.module.css";

const STATUS_LABEL: Record<string, string> = {
  pending: "ממתין לתשלום",
  paid: "שולם",
  cancelled: "בוטל",
};

export default async function AdminOrdersPage() {
  const admin = await requireAdminSection("orders");
  const isOwner = admin.role === "owner";

  const db = supabaseAdmin();
  const { data: orders } = await db
    .from("orders")
    .select(
      "id, customer_name, customer_email, customer_phone, pickup_date, total, status, fulfillment_status, created_at, greeting_card_message, order_items(product_name, size_label, unit_price, qty)"
    )
    .order("created_at", { ascending: false });

  return (
    <>
      <h1>הזמנות</h1>
      {!isOwner && <p className={styles.muted}>גישת מטבח: פרטי הזמנה והכנה, ללא סכומי תשלום.</p>}
      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>לקוח</th>
              <th>טלפון</th>
              <th>אימייל</th>
              <th>מוצרים</th>
              <th>תאריך איסוף</th>
              {isOwner && <th>סה&quot;כ</th>}
              <th>סטטוס</th>
              <th>מצב הכנה</th>
              {isOwner && <th></th>}
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id}>
                <td>{o.customer_name}</td>
                <td>{o.customer_phone}</td>
                <td>{o.customer_email}</td>
                <td>
                  {o.order_items.map((item, i) => (
                    <div key={i}>
                      {item.product_name}
                      {item.size_label ? ` — ${item.size_label}` : ""} × {item.qty}
                    </div>
                  ))}
                  {o.greeting_card_message && (
                    <div className={styles.muted} style={{ marginTop: 4 }}>
                      🎁 כרטיס ברכה: &quot;{o.greeting_card_message}&quot;
                    </div>
                  )}
                </td>
                <td>{o.pickup_date}</td>
                {isOwner && <td>{formatCurrency(o.total)}</td>}
                <td>
                  <span className={o.status === "paid" ? styles.badgePaid : styles.badgePending}>
                    {STATUS_LABEL[o.status]}
                  </span>
                </td>
                <td>
                  {o.status === "paid" ? (
                    <OrderFulfillmentSelect
                      orderId={o.id}
                      value={o.fulfillment_status}
                      updateAction={updateOrderFulfillmentStatus}
                    />
                  ) : (
                    <span className={styles.muted}>—</span>
                  )}
                </td>
                {isOwner && (
                  <td>
                    {o.status !== "cancelled" && (
                      <form action={cancelOrder}>
                        <input type="hidden" name="id" value={o.id} />
                        <button type="submit" className={styles.btnDanger}>
                          ביטול
                        </button>
                      </form>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {(orders ?? []).length === 0 && (
              <tr>
                <td colSpan={9} className={styles.muted}>
                  אין הזמנות עדיין.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
