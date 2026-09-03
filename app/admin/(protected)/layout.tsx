import Link from "next/link";
import { accessibleSections, requireAdmin, type AdminSection } from "@/lib/admin-auth";
import { SignOutButton } from "@/components/admin/SignOutButton";
import styles from "../admin.module.css";

const NAV: { section: AdminSection; href: string; label: string }[] = [
  { section: "products", href: "/admin/products", label: "מוצרים" },
  { section: "media", href: "/admin/media", label: "תמונות אתר" },
  { section: "coupons", href: "/admin/coupons", label: "קופונים" },
  { section: "orders", href: "/admin/orders", label: "הזמנות" },
  { section: "meals", href: "/admin/meals", label: "ארוחות פתוחות" },
  { section: "events", href: "/admin/events", label: "אירועים פרטיים" },
  { section: "messages", href: "/admin/messages", label: "פניות וניוזלטר" },
  { section: "notifications", href: "/admin/notifications", label: "התראות אימייל" },
  { section: "kitchen_ledger", href: "/admin/kitchen", label: "ניהול אירועים" },
  { section: "team", href: "/admin/team", label: "צוות" },
];

const ROLE_LABELS = { owner: "בעלים", kitchen: "מטבח", sales: "מכירות" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const allowed = new Set(accessibleSections(admin.role));

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.mark}>
          Y
        </Link>
        <Link href="/" className={styles.siteLink}>
          ← חזרה לאתר
        </Link>
        <div className={styles.subtitle}>
          {admin.email}
          <br />
          {ROLE_LABELS[admin.role]}
        </div>
        <nav className={styles.nav}>
          {NAV.filter((item) => allowed.has(item.section)).map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <SignOutButton />
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
