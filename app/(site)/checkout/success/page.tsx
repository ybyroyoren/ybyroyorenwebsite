import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { finalizeOrder, getOrderById } from "@/lib/orders";
import { formatCurrency } from "@/lib/pricing";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "ההזמנה התקבלה" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; simulated?: string }>;
}) {
  const { orderId, simulated } = await searchParams;
  if (!orderId) notFound();

  let order = await getOrderById(orderId);
  if (!order) notFound();

  if (simulated === "1" && order.status === "pending") {
    order = await finalizeOrder(orderId, `simulated-order:${orderId}`);
  }

  return (
    <div className={styles.wrap}>
      <h1>{order.status === "paid" ? "ההזמנה התקבלה!" : "ההזמנה ממתינה לאישור תשלום"}</h1>
      <p>תודה, {order.customerName}.</p>
      <p>מספר הזמנה: {order.id}</p>
      <p>תאריך איסוף: {order.pickupDate}</p>
      <p>סה&quot;כ: {formatCurrency(order.total)}</p>
      <p>קבלה נשלחה אוטומטית למייל. איסוף עצמי מרחוב השוק 34, תל אביב.</p>
      <Link href="/shop" className={styles.back}>
        לחזרה לחנות
      </Link>
    </div>
  );
}
