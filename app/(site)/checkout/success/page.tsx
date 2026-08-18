import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { finalizeOrder, getOrderById } from "@/lib/orders";
import { formatCurrency } from "@/lib/pricing";
import { getLocale } from "@/lib/i18n";
import { getDict } from "@/lib/dictionary";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "ההזמנה התקבלה" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; simulated?: string }>;
}) {
  const { orderId, simulated } = await searchParams;
  if (!orderId) notFound();

  const locale = await getLocale();
  const t = getDict(locale).checkout.success;

  let order = await getOrderById(orderId);
  if (!order) notFound();

  if (simulated === "1" && order.status === "pending") {
    order = await finalizeOrder(orderId, `simulated-order:${orderId}`);
  }

  return (
    <div className={styles.wrap}>
      <h1>{order.status === "paid" ? t.paidHeading : t.pendingHeading}</h1>
      <p>{t.thanks(order.customerName)}</p>
      <p>{t.orderNumber(order.id)}</p>
      <p>{t.pickupDate(order.pickupDate)}</p>
      <p>{t.total(formatCurrency(order.total))}</p>
      <p>{t.receiptNote}</p>
      <Link href="/shop" className={styles.back}>
        {t.backToShop}
      </Link>
    </div>
  );
}
