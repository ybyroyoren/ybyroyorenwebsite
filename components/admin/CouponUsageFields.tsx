"use client";

import { useState } from "react";
import styles from "@/app/admin/admin.module.css";

const OPTIONS: { value: "single" | "limited" | "unlimited"; label: string }[] = [
  { value: "single", label: "חד פעמי" },
  { value: "limited", label: "רב פעמי (מספר קבוע)" },
  { value: "unlimited", label: "ללא הגבלה" },
];

export function CouponUsageFields() {
  const [type, setType] = useState<"single" | "limited" | "unlimited">("unlimited");

  return (
    <>
      <div className={styles.field} style={{ width: "100%" }}>
        <label>מגבלת שימוש</label>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {OPTIONS.map((o) => (
            <label key={o.value} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
              <input
                type="radio"
                name="usageLimitType"
                value={o.value}
                checked={type === o.value}
                onChange={() => setType(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>
      {type === "limited" && (
        <div className={styles.field}>
          <label>מספר מימושים</label>
          <input name="usageLimitCount" type="number" min="1" required />
        </div>
      )}
    </>
  );
}
