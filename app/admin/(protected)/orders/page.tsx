import { requireAdminSection } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { updateOrderFulfillmentStatus, updateOrderPayment, createManualOrder } from "@/lib/actions/admin/orders";
import { formatCurrency } from "@/lib/pricing";
import { getActiveProducts } from "@/lib/products";
import { OrderFulfillmentSelect } from "@/components/admin/OrderFulfillmentSelect";
import { OrderPaymentControls } from "@/components/admin/OrderPaymentControls";
import { ManualOrderForm } from "@/components/admin/ManualOrderForm";
import styles from "../../admin.module.css";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  website: "אתר",
  credit_card: "אשראי",
  bit: "ביט",
  paybox: "פייבוקס",
  cash: "מזומן",
  bank_transfer: "העברה בנקאית",
};

export default async function AdminOrdersPage() {
  const admin = await requireAdminSection("orders");
  const isOwner = admin.role === "owner";

  const db = supabaseAdmin();
  const { data: orders } = await db
    .from("orders")
    .select(
      "id, customer_name, customer_email, customer_phone, pickup_date, total, status, payment_method, fulfillment_status, created_at, greeting_card_message, order_items(product_name, size_label, unit_price, qty)"
    )
    .order("created_at", { ascending: false });

  const products = isOwner ? await getActiveProducts() : [];
  const sizeOptions = products.flatMap((p) =>
    p.sizes.map((s) => ({ id: s.id, label: `${p.name} — ${s.label}`, priceBeforeVat: s.priceBeforeVat }))
  );

  return (
    <>
      <h1>הזמנות</h1>
      {!isOwner && <p className={styles.muted}>גישת מטבח: פרטי הזמנה והכנה, ללא סכומי תשלום.</p>}

      {isOwner && (
        <div className={styles.card}>
          <h2>הזמנה חדשה (ידנית)</h2>
          <ManualOrderForm sizeOptions={sizeOptions} createAction={createManualOrder} />
        </div>
      )}

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
              <th>סטטוס תשלום</th>
              <th>מצב הכנה</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className={o.fulfillment_status === "completed" ? styles.rowCompleted : ""}>
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
                  {isOwner ? (
                    <OrderPaymentControls
                      orderId={o.id}
                      status={o.status}
                      paymentMethod={o.payment_method}
                      updateAction={updateOrderPayment}
                    />
                  ) : (
                    <span className={styles.muted}>
                      {o.status === "paid" ? "שולם" : o.status === "cancelled" ? "בוטל" : "ממתין לתשלום"}
                      {o.payment_method ? ` · ${PAYMENT_METHOD_LABEL[o.payment_method] ?? o.payment_method}` : ""}
                    </span>
                  )}
                </td>
                <td>
                  <OrderFulfillmentSelect
                    orderId={o.id}
                    value={o.fulfillment_status}
                    updateAction={updateOrderFulfillmentStatus}
                  />
                </td>
              </tr>
            ))}
            {(orders ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className={styles.muted}>
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
