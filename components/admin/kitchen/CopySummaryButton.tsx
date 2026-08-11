"use client";

import { useState } from "react";
import styles from "@/app/admin/admin.module.css";

export function CopySummaryButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" className={styles.btnSecondary} onClick={handleCopy}>
      {copied ? "הועתק!" : "העתקה כטקסט"}
    </button>
  );
}
