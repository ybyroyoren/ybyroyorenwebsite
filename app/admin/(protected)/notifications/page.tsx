import { requireAdminSection } from "@/lib/admin-auth";
import { getNotificationRecipients, getWhatsAppRecipients } from "@/lib/notifications";
import { missingWhatsAppConfig } from "@/lib/whatsapp";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  addNotificationRecipient,
  updateNotificationRecipient,
  deleteNotificationRecipient,
  addWhatsAppRecipient,
  updateWhatsAppRecipient,
  deleteWhatsAppRecipient,
  testWhatsAppRecipient,
} from "@/lib/actions/admin/notifications";
import styles from "../../admin.module.css";

const TYPES: { key: string; label: string }[] = [
  { key: "notifyShopOrder", label: "הזמנה חדשה מהחנות" },
  { key: "notifyEventInquiry", label: "פנייה לאירוע פרטי" },
  { key: "notifyMealRegistration", label: "הרשמה לארוחה פתוחה" },
  { key: "notifyContactMessage", label: "פנייה מ״צרו קשר״" },
];

const ERRORS: Record<string, string> = {
  phone: "מספר הטלפון לא תקין. אפשר לכתוב כמו 054-1234567 או עם קידומת מדינה.",
  duplicate: "המספר הזה כבר ברשימה.",
  save: "השמירה נכשלה, אפשר לנסות שוב.",
};

const TYPE_NAMES: Record<string, string> = {
  shop_order: "הזמנה בחנות",
  event_inquiry: "אירוע פרטי",
  meal_registration: "ארוחה פתוחה",
  contact_message: "צרו קשר",
  test: "בדיקה",
};

const dateTime = new Intl.DateTimeFormat("he-IL", {
  timeZone: "Asia/Jerusalem",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminNotificationsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdminSection("notifications");
  const { error } = await searchParams;
  const [recipients, whatsapp, { data: logRows }] = await Promise.all([
    getNotificationRecipients(),
    getWhatsAppRecipients(),
    supabaseAdmin().from("notification_log").select("id, created_at, type, recipient, ok, error").order("created_at", { ascending: false }).limit(25),
  ]);
  const missing = missingWhatsAppConfig();

  return (
    <>
      <h1>התראות</h1>
      <p className={styles.sectionNote}>
        כתובות אלה יקבלו התראה בכל פעם שיש הזמנה חדשה, פנייה לאירוע, הרשמה לארוחה או הודעה מ״צרו קשר״ —
        לפי הסימונים שנבחרו לכל כתובת.
      </p>

      <h2>אימייל</h2>
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

      <h2 style={{ marginTop: 36 }}>וואטסאפ</h2>
      <p className={styles.sectionNote}>
        אותן ארבע ההתראות מגיעות גם כהודעת וואטסאפ למספרים האלה, לפי הסימונים שנבחרו לכל מספר.
      </p>
      {missing.length > 0 ? (
        <div className={styles.explainBox}>
          <b>החיבור לוואטסאפ עוד לא הוגדר.</b> חסר ב-Vercel: {missing.join(", ")}. עד אז המספרים נשמרים אבל ההודעות לא יישלחו (נרשם כשל ביומן
          שלמטה).
        </div>
      ) : (
        <div className={styles.explainBox}>החיבור לוואטסאפ מוגדר. אפשר לשלוח הודעת בדיקה לכל מספר.</div>
      )}
      {error && ERRORS[error] && <p className={styles.error}>{ERRORS[error]}</p>}

      <div className={styles.card}>
        <h2>הוספת מספר</h2>
        <form action={addWhatsAppRecipient} className={styles.form}>
          <div className={styles.field}>
            <label>שם (לא חובה)</label>
            <input name="name" placeholder="למשל: רועי" />
          </div>
          <div className={styles.field}>
            <label>מספר טלפון</label>
            <input name="phone" type="tel" required placeholder="054-1234567" dir="ltr" />
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
              <th>מספר</th>
              {TYPES.map((t) => (
                <th key={t.key}>{t.label}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {whatsapp.map((r) => {
              const formId = `wa-${r.id}`;
              const flags: Record<string, boolean> = {
                notifyShopOrder: r.notifyShopOrder,
                notifyEventInquiry: r.notifyEventInquiry,
                notifyMealRegistration: r.notifyMealRegistration,
                notifyContactMessage: r.notifyContactMessage,
              };
              return (
                <tr key={r.id}>
                  <td>
                    {r.name && <b>{r.name} · </b>}
                    <span dir="ltr">+{r.phone}</span>
                    <form id={formId} action={updateWhatsAppRecipient}>
                      <input type="hidden" name="id" value={r.id} />
                    </form>
                  </td>
                  {TYPES.map((t) => (
                    <td key={t.key} style={{ textAlign: "center" }}>
                      <input form={formId} type="checkbox" name={t.key} defaultChecked={flags[t.key]} />
                    </td>
                  ))}
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button type="submit" form={formId} className={styles.btnSecondary}>
                        שמירה
                      </button>
                      <form action={testWhatsAppRecipient}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className={styles.btnSecondary}>
                          שליחת בדיקה
                        </button>
                      </form>
                      <form action={deleteWhatsAppRecipient}>
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
            {whatsapp.length === 0 && (
              <tr>
                <td colSpan={TYPES.length + 2} className={styles.muted}>
                  אין מספרים מוגדרים עדיין.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.card}>
        <h2>יומן שליחות וואטסאפ (25 אחרונות)</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>מתי</th>
              <th>סוג</th>
              <th>מספר</th>
              <th>תוצאה</th>
            </tr>
          </thead>
          <tbody>
            {(logRows ?? []).map((row) => (
              <tr key={row.id}>
                <td style={{ whiteSpace: "nowrap" }}>{dateTime.format(new Date(row.created_at))}</td>
                <td>{TYPE_NAMES[row.type] ?? row.type}</td>
                <td dir="ltr">+{row.recipient}</td>
                <td>{row.ok ? "נשלח" : <span style={{ color: "var(--danger)" }}>נכשל — {row.error}</span>}</td>
              </tr>
            ))}
            {(logRows ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className={styles.muted}>
                  עוד לא נשלחו הודעות.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className={styles.muted} style={{ marginTop: 8 }}>
          &quot;נשלח&quot; אומר ש-Meta קיבלה את ההודעה. הגעה לטלפון ותבנית שלא אושרה יופיעו כאן כשל.
        </p>
      </div>
    </>
  );
}
