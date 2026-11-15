import { requireAdminSection } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getPickupRules, type PickupRule } from "@/lib/pickupRules";
import { todayIsraelIso } from "@/lib/date";
import { addPickupRule, deletePickupRule, togglePickupRule } from "@/lib/actions/admin/pickup-rules";
import styles from "../../admin.module.css";

const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

const ERRORS: Record<string, string> = {
  empty: "צריך לבחור לפחות תאריך התחלה, תאריך סיום או יום בשבוע.",
  order: "תאריך ההתחלה חייב להיות לפני תאריך הסיום או באותו יום.",
  save: "השמירה נכשלה, אפשר לנסות שוב.",
};

const dmy = (iso: string) => iso.split("-").reverse().join(".");

function describeWhen(rule: PickupRule): string {
  const days = rule.weekdays ? `בימי ${rule.weekdays.map((d) => WEEKDAYS[d]).join(", ")}` : "";
  let window = "";
  if (rule.startDate && rule.endDate) window = rule.startDate === rule.endDate ? `ב-${dmy(rule.startDate)}` : `מ-${dmy(rule.startDate)} עד ${dmy(rule.endDate)}`;
  else if (rule.startDate) window = `מ-${dmy(rule.startDate)} ואילך`;
  else if (rule.endDate) window = `עד ${dmy(rule.endDate)} (כולל)`;
  if (days && window) return `${days}, ${window}`;
  return days || window || "—";
}

export default async function AdminPickupRulesPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  await requireAdminSection("pickup_rules");
  const { error, saved } = await searchParams;
  const [rules, { data: products }] = await Promise.all([
    getPickupRules(),
    supabaseAdmin().from("products").select("id, name").order("name"),
  ]);
  const productName = new Map((products ?? []).map((p) => [p.id as string, p.name as string]));
  const today = todayIsraelIso();

  return (
    <>
      <h1>סגירת איסוף</h1>
      <div className={styles.explainBox}>
        חוקים שקובעים באילו ימים אי אפשר לאסוף הזמנות מהחנות. הלקוחות עדיין רואים את החנות ויכולים להזמין, אבל בלוח השנה של בחירת תאריך האיסוף
        הימים האלה מסומנים באדום ולא ניתן לבחור בהם. אפשר לסגור טווח תאריכים (עד תאריך, מתאריך, או בין תאריכים), ימים קבועים בשבוע (למשל שבת),
        או שילוב ביניהם, לכל החנות או למוצרים מסוימים. הזמנות שמזינים בעצמכם במסך ההזמנות לא נחסמות.
      </div>

      {error && ERRORS[error] && <p className={styles.error}>{ERRORS[error]}</p>}
      {saved && <p className={styles.success}>החוק נשמר.</p>}

      <div className={styles.card}>
        <h2>חוק חדש</h2>
        <form action={addPickupRule} className={styles.form}>
          <div className={styles.field} style={{ width: "100%" }}>
            <label>שם פנימי (לא חובה, רק כדי שתזהו אותו)</label>
            <input name="name" placeholder="למשל: פתיחת החנות" />
          </div>

          <div className={styles.field}>
            <label>סגור מתאריך (לא חובה)</label>
            <input name="startDate" type="date" />
          </div>
          <div className={styles.field}>
            <label>עד תאריך, כולל (לא חובה)</label>
            <input name="endDate" type="date" />
          </div>
          <p className={styles.muted} style={{ width: "100%", margin: 0 }}>
            רק &quot;עד תאריך&quot; = סגור מההתחלה ועד אותו יום. רק &quot;מתאריך&quot; = סגור מאותו יום ואילך. שניהם = בין התאריכים.
          </p>

          <div className={styles.field} style={{ width: "100%" }}>
            <label>ימים בשבוע (לא חובה)</label>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {WEEKDAYS.map((name, index) => (
                <label key={name} style={{ display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 400 }}>
                  <input type="checkbox" name="weekday" value={index} /> {name}
                </label>
              ))}
            </div>
            <p className={styles.muted} style={{ margin: "6px 0 0" }}>
              בלי ימים: נסגרים כל הימים בטווח התאריכים. עם ימים ובלי תאריכים: חוק קבוע שחוזר כל שבוע. עם ימים ותאריכים: רק אותם ימים בתוך הטווח.
            </p>
          </div>

          <div className={styles.field} style={{ width: "100%" }}>
            <label>למה זה חל</label>
            <details>
              <summary style={{ cursor: "pointer" }}>ברירת מחדל: כל החנות. אפשר לבחור מוצרים מסוימים</summary>
              <p className={styles.muted} style={{ margin: "8px 0" }}>
                אם תסמנו מוצרים, החוק יחסום איסוף רק בעגלות שיש בהן לפחות אחד מהם. בלי סימון, הוא חל על כל החנות.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
                {(products ?? []).map((p) => (
                  <label key={p.id} style={{ display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 400 }}>
                    <input type="checkbox" name="productId" value={p.id} /> {p.name}
                  </label>
                ))}
              </div>
            </details>
          </div>

          <div className={styles.field} style={{ width: "100%" }}>
            <label>ההודעה שהלקוח יראה כשילחץ על יום סגור</label>
            <input name="message" placeholder="למשל: האיסוף הראשון האפשרי הוא ב-24.11" />
          </div>
          <div className={styles.field} style={{ width: "100%" }}>
            <label>הודעה באנגלית (לא חובה)</label>
            <input name="messageEn" dir="ltr" placeholder="e.g. The first possible pickup date is 24.11" />
          </div>

          <button type="submit" className={styles.btn}>
            הוספת חוק
          </button>
        </form>
      </div>

      <div className={styles.card}>
        <h2>החוקים הקיימים</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>מתי סגור</th>
              <th>על מה חל</th>
              <th>הודעה ללקוח</th>
              <th>מצב</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => {
              const ended = rule.endDate !== null && rule.endDate < today;
              return (
                <tr key={rule.id}>
                  <td>
                    {rule.name && <b>{rule.name}</b>}
                    {rule.name && <br />}
                    {describeWhen(rule)}
                  </td>
                  <td>{rule.productIds ? rule.productIds.map((id) => productName.get(id) ?? "מוצר שנמחק").join(", ") : "כל החנות"}</td>
                  <td>{rule.message || <span className={styles.muted}>(ברירת מחדל)</span>}</td>
                  <td>{!rule.active ? "כבוי" : ended ? "הסתיים" : "פעיל"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <form action={togglePickupRule}>
                        <input type="hidden" name="id" value={rule.id} />
                        <input type="hidden" name="active" value={rule.active ? "false" : "true"} />
                        <button type="submit" className={styles.btnSecondary}>
                          {rule.active ? "כיבוי" : "הפעלה"}
                        </button>
                      </form>
                      <form action={deletePickupRule}>
                        <input type="hidden" name="id" value={rule.id} />
                        <button type="submit" className={styles.btnDanger}>
                          מחיקה
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rules.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.muted}>
                  אין חוקים עדיין. כל ימי האיסוף פתוחים (בכפוף לזמן ההכנה ולמלאי של המוצרים).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
