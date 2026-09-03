"use client";

import { useRouter } from "next/navigation";
import styles from "@/app/admin/admin.module.css";

export type FulfillmentStatus =
  | "awaiting_payment"
  | "open"
  | "prepared"
  | "completed"
  | "partially_fulfilled"
  | "no_show";

const OPTIONS: { value: FulfillmentStatus; label: string; className: string }[] = [
  { value: "awaiting_payment", label: "ממתין לתשלום", className: styles.fulfillAwaitingPayment },
  { value: "open", label: "פתוחה", className: styles.fulfillOpen },
  { value: "prepared", label: "הוכנה, ממתינה לאיסוף", className: styles.fulfillPrepared },
  { value: "completed", label: "הושלמה (הוכנה ונאספה)", className: styles.fulfillCompleted },
  { value: "partially_fulfilled", label: "סופקה חלקית", className: styles.fulfillPartial },
  { value: "no_show", label: "הלקוח לא הגיע לאיסוף", className: styles.fulfillNoShow },
];

export function OrderFulfillmentSelect({
  orderId,
  value,
  updateAction,
}: {
  orderId: string;
  value: FulfillmentStatus;
  updateAction: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[1];

  async function handleChange(next: string) {
    const fd = new FormData();
    fd.set("id", orderId);
    fd.set("fulfillmentStatus", next);
    await updateAction(fd);
    router.refresh();
  }

  return (
    <select
      className={`${styles.miniSelect} ${current.className}`}
      value={value}
      onChange={(e) => handleChange(e.target.value)}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
