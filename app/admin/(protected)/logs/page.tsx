import Link from "next/link";
import { requireAdminSection } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ACTION_LABELS, ENTITY_LABELS, fieldLabel, valueLabel } from "@/lib/auditLabels";
import styles from "../../admin.module.css";

const PAGE_SIZE = 50;

interface LogRow {
  id: number;
  created_at: string;
  admin_email: string | null;
  admin_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  changes: Record<string, [unknown, unknown]> | null;
  ip: string | null;
  user_agent: string | null;
}

const ROLE_LABELS: Record<string, string> = { owner: "בעלים", kitchen: "מטבח", sales: "מכירות" };

const dateTime = new Intl.DateTimeFormat("he-IL", {
  timeZone: "Asia/Jerusalem",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function actionClass(action: string): string {
  if (action === "delete" || action === "login_failed") return styles.logDelete;
  if (action === "create") return styles.logCreate;
  if (action === "login" || action === "logout") return styles.logSession;
  return styles.logUpdate;
}

function describe(row: LogRow): string {
  if (row.action === "login" || row.action === "logout") return `${ACTION_LABELS[row.action]}`;
  if (row.action === "login_failed") return `${ACTION_LABELS[row.action]}${row.entity_label ? ` (${row.entity_label})` : ""}`;
  const entity = ENTITY_LABELS[row.entity_type ?? ""] ?? row.entity_type ?? "";
  const name = row.entity_label ? ` ״${row.entity_label}״` : "";
  return `${ACTION_LABELS[row.action] ?? row.action} · ${entity}${name}`;
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ admin?: string; entity?: string; action?: string; from?: string; to?: string; page?: string }>;
}) {
  await requireAdminSection("logs");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const db = supabaseAdmin();
  let query = db
    .from("admin_audit_log")
    .select("id, created_at, admin_email, admin_role, action, entity_type, entity_id, entity_label, changes, ip, user_agent", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (sp.admin) query = query.eq("admin_email", sp.admin);
  if (sp.entity) query = query.eq("entity_type", sp.entity);
  if (sp.action) query = query.eq("action", sp.action);
  if (sp.from) query = query.gte("created_at", `${sp.from}T00:00:00+03:00`);
  if (sp.to) query = query.lt("created_at", `${sp.to}T23:59:59+03:00`);

  const [{ data, count, error }, { data: options }] = await Promise.all([
    query,
    db.from("admin_audit_log").select("admin_email, entity_type").order("created_at", { ascending: false }).limit(2000),
  ]);

  const rows = (data ?? []) as unknown as LogRow[];
  const admins = [...new Set((options ?? []).map((o) => o.admin_email).filter((v): v is string => !!v))].sort();
  const entities = [...new Set((options ?? []).map((o) => o.entity_type).filter((v): v is string => !!v))].sort();
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    for (const key of ["admin", "entity", "action", "from", "to"] as const) if (sp[key]) params.set(key, sp[key]!);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/logs${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <h1>יומן פעולות</h1>
      <p className={styles.muted}>
        כל פעולה שמתבצעת בתוכנת הניהול נרשמת כאן: מי, מתי, מה השתנה ומה היו הערכים לפני ואחרי. הזמנות ותשלומים של לקוחות באתר לא נרשמים כאן אלא בעמודי ההזמנות.
      </p>

      <div className={styles.card}>
        <form method="get" className={styles.form}>
          <div className={styles.field}>
            <label>משתמש</label>
            <select name="admin" defaultValue={sp.admin ?? ""}>
              <option value="">הכל</option>
              {admins.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label>על מה</label>
            <select name="entity" defaultValue={sp.entity ?? ""}>
              <option value="">הכל</option>
              {entities.map((e) => (
                <option key={e} value={e}>
                  {ENTITY_LABELS[e] ?? e}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label>סוג פעולה</label>
            <select name="action" defaultValue={sp.action ?? ""}>
              <option value="">הכל</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label>מתאריך</label>
            <input type="date" name="from" defaultValue={sp.from ?? ""} />
          </div>
          <div className={styles.field}>
            <label>עד תאריך</label>
            <input type="date" name="to" defaultValue={sp.to ?? ""} />
          </div>
          <button type="submit" className={styles.btnSecondary}>
            סינון
          </button>
          <Link href="/admin/logs" className={styles.muted} style={{ alignSelf: "center" }}>
            ניקוי
          </Link>
        </form>
      </div>

      <div className={styles.card}>
        {error && <p className={styles.error}>לא ניתן לטעון את היומן: {error.message}</p>}
        <p className={styles.muted} style={{ marginBottom: 12 }}>
          {total} רשומות {pages > 1 ? `· עמוד ${page} מתוך ${pages}` : ""}
        </p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>מתי</th>
              <th>מי</th>
              <th>מה</th>
              <th>פרטים</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const changes = Object.entries(row.changes ?? {}).filter(([k]) => k !== "_note");
              return (
                <tr key={row.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{dateTime.format(new Date(row.created_at))}</td>
                  <td>
                    {row.admin_email ?? "—"}
                    {row.admin_role && <div className={styles.muted}>{ROLE_LABELS[row.admin_role] ?? row.admin_role}</div>}
                  </td>
                  <td>
                    <span className={`${styles.logBadge} ${actionClass(row.action)}`}>{ACTION_LABELS[row.action] ?? row.action}</span>{" "}
                    {describe(row).replace(`${ACTION_LABELS[row.action] ?? row.action} · `, "")}
                  </td>
                  <td>
                    {changes.length > 0 ? (
                      <ul className={styles.logChanges}>
                        {changes.map(([field, pair]) => {
                          const [before, after] = Array.isArray(pair) ? pair : [null, pair];
                          return (
                            <li key={field}>
                              <b>{fieldLabel(field)}:</b>{" "}
                              {row.action === "create" || row.action === "delete" ? (
                                <span>{valueLabel(row.action === "delete" ? before ?? after : after)}</span>
                              ) : (
                                <>
                                  <span className={styles.logOld}>{valueLabel(before)}</span> ← <span>{valueLabel(after)}</span>
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : row.action === "login" || row.action === "login_failed" ? (
                      <span className={styles.muted}>
                        {row.ip ?? ""} {row.user_agent ? `· ${row.user_agent.slice(0, 60)}` : ""}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.muted}>
                  אין רשומות {sp.admin || sp.entity || sp.action || sp.from || sp.to ? "לפי הסינון הזה" : "עדיין"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {pages > 1 && (
          <div className={styles.pager}>
            {page > 1 && <Link href={pageHref(page - 1)}>→ חדשות יותר</Link>}
            {page < pages && <Link href={pageHref(page + 1)}>ישנות יותר ←</Link>}
          </div>
        )}
      </div>
    </>
  );
}
