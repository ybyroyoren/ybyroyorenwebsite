import { requireAdminSection } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { revokeTeamMember, updateTeamMemberRole } from "@/lib/actions/admin/team";
import { CreateTeamMemberForm } from "@/components/admin/CreateTeamMemberForm";
import type { AdminRole } from "@/lib/supabase/types";
import styles from "../../admin.module.css";

const ROLE_LABELS: Record<AdminRole, string> = { owner: "בעלים", kitchen: "מטבח", sales: "מכירות" };

export default async function AdminTeamPage() {
  const admin = await requireAdminSection("team");
  const db = supabaseAdmin();

  const { data: profiles } = await db
    .from("admin_profiles")
    .select("id, role, created_at")
    .order("created_at", { ascending: true });

  const {
    data: { users },
  } = await db.auth.admin.listUsers();
  const emailById = new Map(users.map((u) => [u.id, u.email ?? "—"]));

  return (
    <>
      <h1>צוות</h1>

      <div className={styles.card}>
        <h2>הוספת איש/אשת צוות</h2>
        <p className={styles.muted}>
          מטבח: עדכון מלאי, צפייה בהזמנות ופרטי איסוף. מכירות: צפייה בהרשמות לארוחות ופניות
          לאירועים, עדכון סטטוס.
        </p>
        <CreateTeamMemberForm />
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>אימייל</th>
              <th>תפקיד</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => (
              <tr key={p.id}>
                <td>{emailById.get(p.id) ?? "—"}</td>
                <td>
                  {p.id === admin.id ? (
                    ROLE_LABELS[p.role as AdminRole]
                  ) : (
                    <form action={updateTeamMemberRole} style={{ display: "flex", gap: 6 }}>
                      <input type="hidden" name="id" value={p.id} />
                      <select name="role" defaultValue={p.role}>
                        <option value="kitchen">מטבח</option>
                        <option value="sales">מכירות</option>
                        <option value="owner">בעלים</option>
                      </select>
                      <button type="submit" className={styles.btnSecondary}>
                        שמירה
                      </button>
                    </form>
                  )}
                </td>
                <td>
                  {p.id !== admin.id && (
                    <form action={revokeTeamMember}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className={styles.btnDanger}>
                        הסרת גישה
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
