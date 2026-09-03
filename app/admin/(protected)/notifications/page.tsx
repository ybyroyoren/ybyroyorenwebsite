import { requireAdminSection } from "@/lib/admin-auth";
import { getNotificationRecipients } from "@/lib/notifications";
import {
  addNotificationRecipient,
  updateNotificationRecipient,
  deleteNotificationRecipient,
} from "@/lib/actions/admin/notifications";
import styles from "../../admin.module.css";

const TYPES: { key: string; label: string }[] = [
  { key: "notifyShopOrder", label: "הזמנה חדשה מהחנות" },
  { key: "notifyEventInquiry", label: "פנייה לאירוע פרטי" },
  { key: "notifyMealRegistration", label: "הרשמה לארוחה פתוחה" },
  { key: "notifyContactMessage", label: "פנייה מ״צרו קשר״" },
];

export default async function AdminNotificationsPage() {
  await requireAdminSection("notifications");
  const recipients = await getNotificationRecipients();

  return (
    <>
      <h1>התראות אימייל</h1>
      <p className={styles.sectionNote}>
        כתובות אלה יקבלו התראה בכל פעם שיש הזמנה חדשה, פנייה לאירוע, הרשמה לארוחה או הודעה מ״צרו קשר״ —
        לפי הסימונים שנבחרו לכל כתובת.
      </p>

      <div className={styles.card}>
        <h2>הוספת כתובת</h2>
        <form action={addNotificationRecipient} className={styles.form}>
          <div className={styles.field} style={{ width: "100%" }}>
            <label>אימייל</label>
            <input name="email" type="email" required />
          </div>
          {TYPES.map((t) => (
            <div className={styles.field} key={t.key}>
              <label>
                <input type="checkbox" name={t.key} defaultChecked /> {t.label}
              </label>
            </div>
          ))}
          <button type="submit" className={styles.btn}>
            הוספה
          </button>
        </form>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>אימייל</th>
              {TYPES.map((t) => (
                <th key={t.key}>{t.label}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((r) => {
              const formId = `notif-${r.id}`;
              return (
                <tr key={r.id}>
                  <td>
                    {r.email}
                    <form id={formId} action={updateNotificationRecipient}>
                      <input type="hidden" name="id" value={r.id} />
                    </form>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <input
                      form={formId}
                      type="checkbox"
                      name="notifyShopOrder"
                      defaultChecked={r.notifyShopOrder}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <input
                      form={formId}
                      type="checkbox"
                      name="notifyEventInquiry"
                      defaultChecked={r.notifyEventInquiry}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <input
                      form={formId}
                      type="checkbox"
                      name="notifyMealRegistration"
                      defaultChecked={r.notifyMealRegistration}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <input
                      form={formId}
                      type="checkbox"
                      name="notifyContactMessage"
                      defaultChecked={r.notifyContactMessage}
                    />
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="submit" form={formId} className={styles.btnSecondary}>
                        שמירה
                      </button>
                      <form action={deleteNotificationRecipient}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className={styles.btnDanger}>
                          מחיקה
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {recipients.length === 0 && (
              <tr>
                <td colSpan={TYPES.length + 2} className={styles.muted}>
                  אין כתובות מוגדרות עדיין.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
