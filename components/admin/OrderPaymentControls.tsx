"use client";

import { useRouter } from "next/navigation";
import styles from "@/app/admin/admin.module.css";

type PaymentStatus = "pending" | "paid" | "cancelled";
type PaymentMethod = "website" | "credit_card" | "bit" | "paybox" | "cash" | "bank_transfer" | "";

const STATUS_OPTIONS: { value: PaymentStatus; label: string; className: string }[] = [
  { value: "pending", label: "ממתין לתשלום", className: styles.payPending },
  { value: "paid", label: "שולם", className: styles.payPaid },
  { value: "cancelled", label: "בוטל", className: styles.payCancelled },
];

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "", label: "— אמצעי תשלום —" },
  { value: "website", label: "תשלום באתר" },
  { value: "credit_card", label: "אשראי" },
  { value: "bit", label: "ביט" },
  { value: "paybox", label: "פייבוקס" },
  { value: "cash", label: "מזומן" },
  { value: "bank_transfer", label: "העברה בנקאית" },
];

export function OrderPaymentControls({
  orderId,
  status,
  paymentMethod,
  updateAction,
}: {
  orderId: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  updateAction: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const currentStatus = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0];

  async function update(nextStatus: string, nextMethod: string) {
    const fd = new FormData();
    fd.set("id", orderId);
    fd.set("status", nextStatus);
    fd.set("paymentMethod", nextMethod);
    await updateAction(fd);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <select
        className={`${styles.miniSelect} ${currentStatus.className}`}
        value={status}
        onChange={(e) => update(e.target.value, paymentMethod ?? "")}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        className={styles.miniSelect}
        value={paymentMethod ?? ""}
        onChange={(e) => update(status, e.target.value)}
      >
        {METHOD_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
