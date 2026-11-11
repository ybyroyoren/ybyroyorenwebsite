import { requireAdmin } from "@/lib/admin-auth";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import styles from "../../admin.module.css";

const ROLE_LABELS = { owner: "בעלים", kitchen: "מטבח", sales: "מכירות" };

export default async function AdminAccountPage() {
  const admin = await requireAdmin();
  return (
    <>
      <h1>החשבון שלי</h1>
      <div className={styles.card}>
        <p>
          מחוברים כ-<b>{admin.email}</b> ({ROLE_LABELS[admin.role]}).
        </p>
        <p className={styles.muted}>החיבור נשמר בדפדפן הזה, ואין צורך להזין סיסמה בכל כניסה. ״התנתקות״ בתפריט מנתקת אותו.</p>
      </div>
      <div className={styles.card}>
        <h2>החלפת סיסמה</h2>
        <ChangePasswordForm email={admin.email} />
      </div>
    </>
  );
}
