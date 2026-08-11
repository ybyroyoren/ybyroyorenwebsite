"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./kitchen.module.css";

const TABS = [
  { href: "/admin/kitchen/ingredients", label: "מרכיבים" },
  { href: "/admin/kitchen/suppliers", label: "ספקים" },
  { href: "/admin/kitchen/equipment", label: "ציוד" },
  { href: "/admin/kitchen/guests", label: "סועדים" },
  { href: "/admin/kitchen/recipes", label: "מתכונים" },
  { href: "/admin/kitchen/events", label: "אירועים" },
];

export function KitchenSubnav() {
  const pathname = usePathname();
  return (
    <nav className={styles.subnav}>
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={pathname.startsWith(tab.href) ? styles.active : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
