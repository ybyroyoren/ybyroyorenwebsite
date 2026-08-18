"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import { getDict, type Locale } from "@/lib/dictionary";
import { LanguageToggle } from "./LanguageToggle";
import styles from "./Nav.module.css";

export function Nav({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const cart = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const t = getDict(locale).nav;

  const NAV_LINKS = [
    { href: "/shop", label: t.shop },
    { href: "/meals", label: t.meals },
    { href: "/events", label: t.events },
    { href: "/about", label: t.about },
    { href: "/contact", label: t.contact },
  ];

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
        <div className={styles.rightGroup}>
          <LanguageToggle locale={locale} className={styles.langToggle} />
          <button type="button" className={styles.cartButton} onClick={cart.open}>
            <span>{t.cart}</span>
            <span className={styles.cartCount}>{cart.count}</span>
          </button>
          <button
            type="button"
            className={styles.menuButton}
            aria-label={menuOpen ? t.closeMenu : t.openMenu}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className={`wrap ${styles.mobileMenu}`}>
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
      )}
    </nav>
  );
}
