import { requireAdminSection } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import styles from "../../admin.module.css";

export default async function AdminMessagesPage() {
  await requireAdminSection("messages");
  const db = supabaseAdmin();
  const { data: messages } = await db
    .from("contact_messages")
    .select("id, name, phone, email, message, created_at")
    .order("created_at", { ascending: false });

  const { data: subscribers } = await db
    .from("newsletter_subscribers")
    .select("id, email, source, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <h1>פניות וניוזלטר</h1>

      <div className={styles.card}>
        <h2>פניות מטופס יצירת קשר</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>שם</th>
              <th>טלפון</th>
              <th>אימייל</th>
              <th>הודעה</th>
            </tr>
          </thead>
          <tbody>
            {(messages ?? []).map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.phone}</td>
                <td>{m.email}</td>
                <td>{m.message}</td>
              </tr>
            ))}
            {(messages ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className={styles.muted}>
                  אין פניות עדיין.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.card}>
        <h2>נרשמים לניוזלטר</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>אימייל</th>
              <th>מקור</th>
            </tr>
          </thead>
          <tbody>
            {(subscribers ?? []).map((s) => (
              <tr key={s.id}>
                <td>{s.email}</td>
                <td>{s.source === "footer" ? "פוטר" : "טופס אירועים"}</td>
              </tr>
            ))}
            {(subscribers ?? []).length === 0 && (
              <tr>
                <td colSpan={2} className={styles.muted}>
                  אין נרשמים עדיין.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
