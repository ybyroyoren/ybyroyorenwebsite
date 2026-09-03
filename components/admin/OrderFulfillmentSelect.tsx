"use client";

import { useRouter } from "next/navigation";
import styles from "@/app/admin/admin.module.css";

export type FulfillmentStatus = "open" | "prepared" | "completed" | "partially_fulfilled" | "no_show";

const OPTIONS: { value: FulfillmentStatus; label: string }[] = [
  { value: "open", label: "פתוחה" },
  { value: "prepared", label: "הוכנה, ממתינה לאיסוף" },
  { value: "completed", label: "הושלמה (הוכנה ונאספה)" },
  { value: "partially_fulfilled", label: "סופקה חלקית" },
  { value: "no_show", label: "הלקוח לא הגיע לאיסוף" },
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

  async function handleChange(next: string) {
    const fd = new FormData();
    fd.set("id", orderId);
    fd.set("fulfillmentStatus", next);
    await updateAction(fd);
    router.refresh();
  }

  return (
    <select className={styles.miniSelect} value={value} onChange={(e) => handleChange(e.target.value)}>
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
