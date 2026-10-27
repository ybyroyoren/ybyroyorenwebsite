import Link from "next/link";
import styles from "@/app/admin/admin.module.css";

export interface AdminTab {
  key: string;
  label: string;
  count: number;
}

/**
 * Link-based tabs for admin lists: the first tab is the default (no query
 * string), the others use ?tab=<key>. Server-rendered, so the list below can
 * simply filter on the same `tab` search param.
 */
export function AdminTabs({ basePath, active, tabs }: { basePath: string; active: string; tabs: AdminTab[] }) {
  return (
    <nav className={styles.tabs} aria-label="סינון רשימה">
      {tabs.map((tab, i) => (
        <Link
          key={tab.key}
          href={i === 0 ? basePath : `${basePath}?tab=${tab.key}`}
          className={`${styles.tab} ${tab.key === active ? styles.tabActive : ""}`}
          aria-current={tab.key === active ? "page" : undefined}
          scroll={false}
        >
          {tab.label}
          <span className={styles.tabCount}>{tab.count}</span>
        </Link>
      ))}
    </nav>
  );
}
