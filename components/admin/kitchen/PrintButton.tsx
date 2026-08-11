"use client";

import styles from "@/app/admin/admin.module.css";

export function PrintButton() {
  return (
    <button type="button" className={styles.btnSecondary} onClick={() => window.print()}>
      הדפסה
    </button>
  );
}
