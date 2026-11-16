import { accessibleSections, requireAdmin } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import styles from "../admin.module.css";

const ROLE_LABELS = { owner: "בעלים", kitchen: "מטבח", sales: "מכירות" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className={styles.shell}>
      <AdminSidebar email={admin.email} roleLabel={ROLE_LABELS[admin.role]} allowed={accessibleSections(admin.role)} />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
