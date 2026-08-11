"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./Modal.module.css";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="סגירה">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
