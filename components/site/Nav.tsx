"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import styles from "./Nav.module.css";

const NAV_LINKS = [
  { href: "/shop", label: "חנות" },
  { href: "/meals", label: "ארוחות פתוחות" },
  { href: "/events", label: "אירועים פרטיים" },
  { href: "/about", label: "אודות" },
  { href: "/contact", label: "יצירת קשר" },
];

export function Nav() {
  const pathname = usePathname();
  const cart = useCart();

  return (
    <nav className={styles.nav}>
      <div className={`wrap ${styles.inner}`}>
        <Link className={styles.mark} href="/">
          Y
        </Link>
        <div className={styles.links}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname.startsWith(link.href) ? styles.active : undefined}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <button type="button" className={styles.cartButton} onClick={cart.open}>
          <span>עגלה</span>
          <span className={styles.cartCount}>{cart.count}</span>
        </button>
      </div>
    </nav>
  );
}
