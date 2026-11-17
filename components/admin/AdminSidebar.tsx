"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/admin/SignOutButton";
import styles from "@/app/admin/admin.module.css";

interface NavItem {
  section: string;
  href: string;
  label: string;
}

// The admin sections, grouped. A group with a single visible item shows as a plain link; otherwise it opens and
// closes, and the group of the page you are on is always open.
const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "חנות",
    items: [
      { section: "products", href: "/admin/products", label: "מוצרים" },
      { section: "orders", href: "/admin/orders", label: "הזמנות" },
      { section: "coupons", href: "/admin/coupons", label: "קופונים" },
      { section: "pickup_rules", href: "/admin/pickup-rules", label: "סגירת איסוף" },
    ],
  },
  {
    label: "ארוחות פתוחות",
    items: [
      { section: "meals", href: "/admin/meals", label: "ארוחות ורשומים" },
      { section: "open_payments", href: "/admin/open-payments", label: "תשלומים פתוחים" },
    ],
  },
  {
    label: "אירועים",
    items: [
      { section: "calendar", href: "/admin/calendar", label: "לוח שנה" },
      { section: "events", href: "/admin/events", label: "פניות לאירועים" },
      { section: "kitchen_ledger", href: "/admin/kitchen", label: "תיקי אירועים ומטבח" },
    ],
  },
  {
    label: "תוכן האתר",
    items: [
      { section: "media", href: "/admin/media", label: "תמונות אתר" },
      { section: "about_team", href: "/admin/about-team", label: "צוות באודות" },
    ],
  },
  {
    label: "פניות והתראות",
    items: [
      { section: "messages", href: "/admin/messages", label: "פניות וניוזלטר" },
      { section: "notifications", href: "/admin/notifications", label: "התראות" },
    ],
  },
  {
    label: "ניהול המערכת",
    items: [
      { section: "analytics", href: "/admin/analytics", label: "סטטיסטיקות אתר" },
      { section: "team", href: "/admin/team", label: "צוות" },
      { section: "logs", href: "/admin/logs", label: "יומן פעולות" },
    ],
  },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function AdminSidebar({ email, roleLabel, allowed }: { email: string; roleLabel: string; allowed: string[] }) {
  const pathname = usePathname();
  const allow = new Set(allowed);
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => allow.has(i.section)) })).filter((g) => g.items.length > 0);

  const activeGroup = groups.find((g) => g.items.some((i) => isActive(pathname, i.href)))?.label ?? null;
  // A group is open when it holds the page you are on, unless you closed it yourself (or opened another by hand).
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  // The phone drawer remembers the page it was opened on, so going to another page closes it without an effect.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawerOpen = drawerPath === pathname;
  const setDrawerOpen = (open: boolean) => setDrawerPath(open ? pathname : null);

  // The drawer locks the page behind it and closes on Escape.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  const isOpen = (label: string) => overrides[label] ?? label === activeGroup;
  const toggle = (label: string) => setOverrides((prev) => ({ ...prev, [label]: !isOpen(label) }));

  const currentLabel = groups.flatMap((g) => g.items).find((i) => isActive(pathname, i.href))?.label ?? "תוכנת ניהול";

  return (
    <>
      {/* Phones: a slim bar with the menu button; the menu itself opens as a drawer. */}
      <header className={styles.mobileBar}>
        <button type="button" className={styles.menuButton} onClick={() => setDrawerOpen(true)} aria-label="פתיחת התפריט" aria-expanded={drawerOpen}>
          <span aria-hidden="true">☰</span>
        </button>
        <span className={styles.mobileTitle}>{currentLabel}</span>
        <Link href="/" className={styles.mobileMark}>
          Y
        </Link>
      </header>
      {drawerOpen && <button type="button" className={styles.drawerOverlay} aria-label="סגירת התפריט" onClick={() => setDrawerOpen(false)} />}

      <aside className={`${styles.sidebar} ${drawerOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarTop}>
          <div className={styles.sidebarHead}>
            <Link href="/" className={styles.mark}>
              Y
            </Link>
            <button type="button" className={styles.drawerClose} onClick={() => setDrawerOpen(false)} aria-label="סגירת התפריט">
              ✕
            </button>
          </div>
          <Link href="/" className={styles.siteLink}>
            ← חזרה לאתר
          </Link>
          <div className={styles.subtitle}>
            {email}
            <br />
            {roleLabel}
          </div>
        </div>

        <nav className={styles.nav} aria-label="תפריט ניהול">
          {groups.map((group) => {
            if (group.items.length === 1) {
              const item = group.items[0];
              return (
                <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? styles.navActive : undefined}>
                  {item.label}
                </Link>
              );
            }
            const open = isOpen(group.label);
            const hasActive = group.label === activeGroup;
            return (
              <div key={group.label} className={styles.navGroup}>
                <button
                  type="button"
                  className={`${styles.navGroupHead} ${hasActive ? styles.navGroupHeadActive : ""}`}
                  aria-expanded={open}
                  onClick={() => toggle(group.label)}
                >
                  <span>{group.label}</span>
                  <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} aria-hidden="true">
                    ‹
                  </span>
                </button>
                {open && (
                  <div className={styles.navGroupItems}>
                    {group.items.map((item) => (
                      <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? styles.navActive : undefined}>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className={styles.sidebarBottom}>
          <Link href="/admin/account" className={styles.siteLink} style={{ marginBottom: 8 }}>
            החשבון שלי · החלפת סיסמה
          </Link>
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
