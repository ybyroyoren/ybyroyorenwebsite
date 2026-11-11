import Link from "next/link";
import { requireAdminSection } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/pricing";
import styles from "../../admin.module.css";

interface Summary {
  totals: {
    sessions: number;
    visitors: number;
    pageviews: number;
    avg_duration_ms: number;
    bounce_sessions: number;
    purchase_sessions: number;
    cart_sessions: number;
    abandoned_cart_sessions: number;
  };
  active_now: number;
  daily: { day: string; pageviews: number; sessions: number; visitors: number }[];
  hourly: { hour: number; pageviews: number }[];
  weekday: { dow: number; pageviews: number }[];
  pages: { path: string; views: number; sessions: number; avg_ms: number | null; avg_scroll: number | null; exits: number; entrances: number }[];
  sources: { source: string; sessions: number; carts: number; purchases: number }[];
  devices: { name: string; sessions: number }[];
  browsers: { name: string; sessions: number }[];
  countries: { name: string; sessions: number }[];
  locales: { name: string; sessions: number }[];
  funnels: Record<string, number>;
  products: { name: string; views: number; carts: number }[];
  sold: { name: string; qty: number; revenue: number }[];
  revenue: { orders: number; orders_total: number; meal_registrations: number; meal_deposits: number };
  clicks: { label: string; kind: string; clicks: number }[];
  filters: { filter: string; value: string; uses: number }[];
  errors: { message: string; path: string; occurrences: number }[];
}

const RANGES = [
  { key: "1", label: "היום", days: 1 },
  { key: "7", label: "7 ימים", days: 7 },
  { key: "30", label: "30 ימים", days: 30 },
  { key: "90", label: "90 ימים", days: 90 },
];

const DEVICE_LABELS: Record<string, string> = { mobile: "נייד", desktop: "מחשב", tablet: "טאבלט", unknown: "לא ידוע" };
const LOCALE_LABELS: Record<string, string> = { he: "עברית", en: "אנגלית", unknown: "לא ידוע" };
const FILTER_LABELS: Record<string, string> = { category: "קטגוריה", sort: "מיון", allergen_free: "ללא אלרגן" };
const KIND_LABELS: Record<string, string> = { link: "קישור", button: "כפתור", phone: "טלפון", email: "אימייל", outbound: "קישור חיצוני" };
const WEEKDAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const COUNTRY_NAMES = new Intl.DisplayNames(["he"], { type: "region" });

const STATIC_PAGES: Record<string, string> = {
  "/": "דף הבית",
  "/shop": "חנות",
  "/meals": "ארוחות פתוחות",
  "/events": "אירועים פרטיים",
  "/about": "אודות",
  "/contact": "יצירת קשר",
  "/checkout": "תשלום",
  "/checkout/success": "ההזמנה התקבלה",
  "/meals/success": "ההרשמה התקבלה",
};

function pageLabel(path: string): string {
  const english = path === "/en" || path.startsWith("/en/");
  const clean = english ? path.replace(/^\/en/, "") || "/" : path;
  let label = STATIC_PAGES[clean];
  if (!label && clean.startsWith("/shop/")) {
    try {
      label = `מוצר: ${decodeURIComponent(clean.slice(6))}`;
    } catch {
      label = `מוצר: ${clean.slice(6)}`;
    }
  }
  return `${label ?? clean}${english ? " (EN)" : ""}`;
}

function israelDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(date);
}

/** The instant of Israel midnight at the start of the day `daysAgo` days before today. */
function israelDayStart(daysAgo: number): Date {
  const [y, m, d] = israelDay(new Date()).split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1, d - daysAgo));
  const ymd = target.toISOString().slice(0, 10);
  for (const offset of [2, 3]) {
    const candidate = new Date(Date.parse(`${ymd}T00:00:00Z`) - offset * 3600 * 1000);
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", hourCycle: "h23" }).format(candidate);
    if (israelDay(candidate) === ymd && parts === "00") return candidate;
  }
  return new Date(Date.parse(`${ymd}T00:00:00Z`) - 3 * 3600 * 1000);
}

/** From the start of Israel's day (days - 1) days ago until just after now. */
function rangeBounds(days: number): { from: Date; to: Date } {
  return { from: israelDayStart(days - 1), to: new Date(Date.now() + 60 * 1000) };
}

const duration = (ms: number) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const num = (n: number) => new Intl.NumberFormat("he-IL").format(n);

function Bars({ values, labels, formatTitle }: { values: number[]; labels: [string, string]; formatTitle: (i: number) => string }) {
  const max = Math.max(...values, 1);
  return (
    <>
      <div className={styles.chart} role="img" aria-label="תרשים">
        {values.map((v, i) => (
          <div key={i} className={styles.chartBar} style={{ height: `${Math.max((v / max) * 100, v > 0 ? 3 : 0.5)}%` }} title={formatTitle(i)} />
        ))}
      </div>
      <div className={styles.chartLabels}>
        <span>{labels[0]}</span>
        <span>{labels[1]}</span>
      </div>
    </>
  );
}

function Funnel({ title, steps }: { title: string; steps: { label: string; count: number }[] }) {
  const first = Math.max(steps[0]?.count ?? 0, 1);
  return (
    <div className={styles.card}>
      <h2>{title}</h2>
      {steps.map((step, i) => (
        <div key={step.label} className={styles.funnelRow}>
          <span>{step.label}</span>
          <div className={styles.funnelTrack}>
            <div className={styles.funnelFill} style={{ width: `${Math.max((step.count / first) * 100, step.count > 0 ? 2 : 0)}%` }} />
          </div>
          <span>
            <b>{num(step.count)}</b>
            {i > 0 && steps[i - 1].count > 0 && <span className={styles.muted}> · {pct(step.count, steps[i - 1].count)}% מהשלב הקודם</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function Breakdown({ title, rows, total, format }: { title: string; rows: { name: string; sessions: number }[]; total: number; format?: (n: string) => string }) {
  return (
    <div className={styles.card}>
      <h2>{title}</h2>
      <table className={styles.table}>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>{format ? format(r.name) : r.name}</td>
              <td>{num(r.sessions)}</td>
              <td className={styles.muted}>{pct(r.sessions, total)}%</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className={styles.muted}>אין נתונים עדיין</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function buildInsights(s: Summary): string[] {
  const out: string[] = [];
  const t = s.totals;
  if (t.sessions === 0) return ["עדיין אין מספיק נתונים בטווח הזה. הנתונים נאספים מרגע שהמעקב עלה לאוויר."];

  const topSource = s.sources[0];
  if (topSource) out.push(`מקור התנועה הגדול ביותר: ${topSource.source === "direct" ? "כניסה ישירה / לא ידוע" : topSource.source} (${pct(topSource.sessions, t.sessions)}% מהביקורים).`);

  const bestDay = [...s.daily].sort((a, b) => b.sessions - a.sessions)[0];
  if (bestDay && bestDay.sessions > 0 && s.daily.length > 2) out.push(`היום עם הכי הרבה ביקורים: ${bestDay.day.split("-").reverse().join(".")} (${num(bestDay.sessions)} ביקורים).`);

  const mobile = s.devices.find((d) => d.name === "mobile");
  if (mobile) out.push(`${pct(mobile.sessions, t.sessions)}% מהגולשים מגיעים מהנייד${pct(mobile.sessions, t.sessions) > 60 ? ", כדאי לבדוק כל שינוי בעיצוב קודם כל בנייד" : ""}.`);

  const peak = [...s.hourly].sort((a, b) => b.pageviews - a.pageviews)[0];
  if (peak && peak.pageviews > 0) out.push(`שעת השיא באתר: ${String(peak.hour).padStart(2, "0")}:00. זה זמן טוב לפרסם ברשתות או לשלוח ניוזלטר.`);

  if (t.abandoned_cart_sessions > 0) out.push(`${num(t.abandoned_cart_sessions)} גולשים הוסיפו מוצר לעגלה ולא השלימו הזמנה. זה הפוטנציאל הכי קרוב לכסף.`);

  const f = s.funnels;
  const shopSteps = [
    ["כניסה לחנות", f.shop_visit],
    ["צפייה במוצר", f.product_view],
    ["הוספה לעגלה", f.add_to_cart],
    ["כניסה לתשלום", f.checkout_start],
    ["הזמנה", f.purchase],
  ] as const;
  let worst: { from: string; to: string; drop: number } | null = null;
  for (let i = 1; i < shopSteps.length; i++) {
    const prev = shopSteps[i - 1][1] ?? 0;
    const cur = shopSteps[i][1] ?? 0;
    if (prev >= 5) {
      const drop = 100 - pct(cur, prev);
      if (!worst || drop > worst.drop) worst = { from: shopSteps[i - 1][0], to: shopSteps[i][0], drop };
    }
  }
  if (worst && worst.drop > 0) out.push(`הנפילה הגדולה ביותר במשפך החנות: בין "${worst.from}" ל"${worst.to}", ${Math.round(worst.drop)}% מהגולשים לא ממשיכים.`);

  const risky = s.pages.filter((p) => p.views >= 10 && p.exits / Math.max(p.views, 1) > 0.6 && !/success|checkout/.test(p.path)).sort((a, b) => b.exits - a.exits)[0];
  if (risky) out.push(`בעמוד "${pageLabel(risky.path)}" ${pct(risky.exits, risky.views)}% מהצפיות הן סוף הביקור. שווה לבדוק אם חסר שם הצעד הבא (כפתור, קישור).`);

  const errors = s.errors.reduce((n, e) => n + e.occurrences, 0);
  if (errors > 0) out.push(`נרשמו ${num(errors)} שגיאות בדפדפן של גולשים. הפירוט בתחתית העמוד.`);
  return out;
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireAdminSection("analytics");
  const { range } = await searchParams;
  const active = RANGES.find((r) => r.key === range) ?? RANGES[1];

  const { from, to } = rangeBounds(active.days);
  const { data, error } = await supabaseAdmin().rpc("analytics_summary", { p_from: from.toISOString(), p_to: to.toISOString() });

  if (error || !data) {
    return (
      <>
        <h1>סטטיסטיקות אתר</h1>
        <div className={styles.card}>
          <p className={styles.error}>לא ניתן לטעון את הנתונים: {error?.message ?? "אין תשובה"}</p>
          <p className={styles.muted}>אם זה קורה אחרי עדכון, ייתכן שהמיגרציה של הסטטיסטיקות עדיין לא הורצה ב-Supabase.</p>
        </div>
      </>
    );
  }

  const s = data as Summary;
  const t = s.totals;
  const f = s.funnels;
  const insights = buildInsights(s);
  const dayLabel = (d: string) => d.split("-").reverse().slice(0, 2).join(".");

  return (
    <>
      <h1>סטטיסטיקות אתר</h1>
      <p className={styles.muted}>
        נתונים אנונימיים: בלי עוגיות ובלי שמירת כתובות IP. משתמשי הניהול שמחוברים לא נספרים.
        כדי שהכניסות שלך מדפדפן אחר לא ייספרו, פתח פעם אחת את האתר עם <code>?notrack=1</code> בסוף הכתובת.
      </p>

      <nav className={styles.rangeLinks} aria-label="טווח זמן">
        {RANGES.map((r) => (
          <Link key={r.key} href={`/admin/analytics?range=${r.key}`} className={r.key === active.key ? styles.rangeOn : undefined}>
            {r.label}
          </Link>
        ))}
      </nav>

      <div className={styles.statGrid}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{num(s.active_now)}</div>
          <div className={styles.statLabel}>באתר עכשיו</div>
          <div className={styles.statHint}>ב-5 הדקות האחרונות</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{num(t.visitors)}</div>
          <div className={styles.statLabel}>גולשים</div>
          <div className={styles.statHint}>בערך, מזהה שמתחלף כל יום</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{num(t.sessions)}</div>
          <div className={styles.statLabel}>ביקורים</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{num(t.pageviews)}</div>
          <div className={styles.statLabel}>צפיות בעמודים</div>
          <div className={styles.statHint}>{t.sessions > 0 ? `${(t.pageviews / t.sessions).toFixed(1)} לביקור` : ""}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{duration(t.avg_duration_ms)}</div>
          <div className={styles.statLabel}>זמן ממוצע באתר</div>
          <div className={styles.statHint}>זמן פעיל בלבד</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{pct(t.bounce_sessions, t.sessions)}%</div>
          <div className={styles.statLabel}>נטשו אחרי עמוד אחד</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{pct(t.purchase_sessions, t.sessions)}%</div>
          <div className={styles.statLabel}>המרה להזמנה</div>
          <div className={styles.statHint}>{num(t.purchase_sessions)} ביקורים עם הזמנה</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{formatCurrency(s.revenue.orders_total)}</div>
          <div className={styles.statLabel}>הכנסות מהחנות</div>
          <div className={styles.statHint}>{num(s.revenue.orders)} הזמנות ששולמו</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{formatCurrency(s.revenue.meal_deposits)}</div>
          <div className={styles.statLabel}>מקדמות ארוחות</div>
          <div className={styles.statHint}>{num(s.revenue.meal_registrations)} הרשמות ששולמו</div>
        </div>
      </div>

      {insights.length > 0 && (
        <div className={styles.card}>
          <h2>מה כדאי לשים לב אליו</h2>
          {insights.map((text) => (
            <div key={text} className={styles.insight}>
              {text}
            </div>
          ))}
        </div>
      )}

      <div className={styles.card}>
        <h2>ביקורים לפי יום</h2>
        <Bars
          values={s.daily.map((d) => d.sessions)}
          labels={[dayLabel(s.daily[0]?.day ?? ""), dayLabel(s.daily[s.daily.length - 1]?.day ?? "")]}
          formatTitle={(i) => `${dayLabel(s.daily[i].day)}: ${s.daily[i].sessions} ביקורים, ${s.daily[i].pageviews} צפיות`}
        />
      </div>

      <Funnel
        title="משפך החנות"
        steps={[
          { label: "נכנסו לחנות", count: f.shop_visit ?? 0 },
          { label: "צפו במוצר", count: f.product_view ?? 0 },
          { label: "הוסיפו לעגלה", count: f.add_to_cart ?? 0 },
          { label: "נכנסו לתשלום", count: f.checkout_start ?? 0 },
          { label: "שלחו הזמנה", count: f.checkout_submit ?? 0 },
          { label: "הגיעו לדף ״ההזמנה התקבלה״", count: f.purchase ?? 0 },
        ]}
      />
      <div className={styles.twoCols}>
        <Funnel
          title="ארוחות פתוחות"
          steps={[
            { label: "נכנסו לעמוד", count: f.meals_visit ?? 0 },
            { label: "פתחו הרשמה לארוחה", count: f.meal_register_open ?? 0 },
            { label: "שלחו הרשמה", count: f.meal_register_submit ?? 0 },
            { label: "שילמו מקדמה", count: f.meal_paid ?? 0 },
          ]}
        />
        <Funnel
          title="אירועים פרטיים וקשר"
          steps={[
            { label: "נכנסו לעמוד אירועים", count: f.events_visit ?? 0 },
            { label: "פתחו את הטופס", count: f.event_inquiry_open ?? 0 },
            { label: "שלחו פנייה לאירוע", count: f.event_inquiry_submit ?? 0 },
            { label: "נכנסו ליצירת קשר", count: f.contact_visit ?? 0 },
            { label: "שלחו הודעה", count: f.contact_submit ?? 0 },
            { label: "נרשמו לניוזלטר", count: f.newsletter_signup ?? 0 },
          ]}
        />
      </div>

      <div className={styles.card}>
        <h2>העמודים</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>עמוד</th>
              <th>צפיות</th>
              <th>ביקורים</th>
              <th>זמן ממוצע</th>
              <th>גלילה ממוצעת</th>
              <th>נכנסו דרכו</th>
              <th>סיימו בו</th>
            </tr>
          </thead>
          <tbody>
            {s.pages.map((p) => (
              <tr key={p.path}>
                <td>{pageLabel(p.path)}</td>
                <td>{num(p.views)}</td>
                <td>{num(p.sessions)}</td>
                <td>{p.avg_ms ? duration(p.avg_ms) : "—"}</td>
                <td>{p.avg_scroll !== null && p.avg_scroll !== undefined ? `${Math.round(Number(p.avg_scroll))}%` : "—"}</td>
                <td>{num(p.entrances)}</td>
                <td>
                  {num(p.exits)} <span className={styles.muted}>({pct(p.exits, p.views)}%)</span>
                </td>
              </tr>
            ))}
            {s.pages.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.muted}>
                  אין נתונים עדיין
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.card}>
        <h2>מאיפה מגיעים</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>מקור</th>
              <th>ביקורים</th>
              <th>הוסיפו לעגלה</th>
              <th>הזמינו</th>
            </tr>
          </thead>
          <tbody>
            {s.sources.map((r) => (
              <tr key={r.source}>
                <td>{r.source === "direct" ? "ישיר / לא ידוע" : r.source}</td>
                <td>
                  {num(r.sessions)} <span className={styles.muted}>({pct(r.sessions, t.sessions)}%)</span>
                </td>
                <td>{num(r.carts)}</td>
                <td>{num(r.purchases)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={styles.sectionNote}>
          כדי לדעת בדיוק מאיזה קמפיין הגיעו, הוסף לקישורים ברשתות ובניוזלטר סיומת כמו <code>?utm_source=instagram</code>.
        </p>
      </div>

      <div className={styles.twoCols}>
        <Breakdown title="מכשירים" rows={s.devices} total={t.sessions} format={(n) => DEVICE_LABELS[n] ?? n} />
        <Breakdown title="שפה" rows={s.locales} total={t.sessions} format={(n) => LOCALE_LABELS[n] ?? n} />
        <Breakdown title="דפדפנים" rows={s.browsers} total={t.sessions} />
        <Breakdown
          title="מדינות"
          rows={s.countries}
          total={t.sessions}
          format={(n) => {
            try {
              return n.length === 2 ? (COUNTRY_NAMES.of(n.toUpperCase()) ?? n) : "לא ידוע";
            } catch {
              return n;
            }
          }}
        />
      </div>

      <div className={styles.twoCols}>
        <div className={styles.card}>
          <h2>שעות פעילות</h2>
          <Bars
            values={s.hourly.map((h) => h.pageviews)}
            labels={["00:00", "23:00"]}
            formatTitle={(i) => `${String(s.hourly[i].hour).padStart(2, "0")}:00: ${s.hourly[i].pageviews} צפיות`}
          />
        </div>
        <div className={styles.card}>
          <h2>ימות השבוע</h2>
          <Bars
            values={s.weekday.map((d) => d.pageviews)}
            labels={[WEEKDAYS[0], WEEKDAYS[6]]}
            formatTitle={(i) => `${WEEKDAYS[s.weekday[i].dow]}: ${s.weekday[i].pageviews} צפיות`}
          />
        </div>
      </div>

      <div className={styles.twoCols}>
        <div className={styles.card}>
          <h2>מוצרים: צפיות והוספות לעגלה</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>מוצר</th>
                <th>צפיות</th>
                <th>לעגלה</th>
              </tr>
            </thead>
            <tbody>
              {s.products.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td>{num(p.views)}</td>
                  <td>{num(p.carts)}</td>
                </tr>
              ))}
              {s.products.length === 0 && (
                <tr>
                  <td colSpan={3} className={styles.muted}>
                    אין נתונים עדיין
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.card}>
          <h2>מה נמכר (הזמנות ששולמו)</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>מוצר</th>
                <th>יחידות</th>
                <th>הכנסה</th>
              </tr>
            </thead>
            <tbody>
              {s.sold.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td>{num(p.qty)}</td>
                  <td>{formatCurrency(p.revenue)}</td>
                </tr>
              ))}
              {s.sold.length === 0 && (
                <tr>
                  <td colSpan={3} className={styles.muted}>
                    אין מכירות בטווח
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.twoCols}>
        <div className={styles.card}>
          <h2>על מה לוחצים</h2>
          <table className={styles.table}>
            <tbody>
              {s.clicks.map((c) => (
                <tr key={`${c.kind}-${c.label}`}>
                  <td>{c.label}</td>
                  <td className={styles.muted}>{KIND_LABELS[c.kind] ?? c.kind}</td>
                  <td>{num(c.clicks)}</td>
                </tr>
              ))}
              {s.clicks.length === 0 && (
                <tr>
                  <td className={styles.muted}>אין נתונים עדיין</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.card}>
          <h2>סינון בחנות</h2>
          <table className={styles.table}>
            <tbody>
              {s.filters.map((c) => (
                <tr key={`${c.filter}-${c.value}`}>
                  <td>
                    {FILTER_LABELS[c.filter] ?? c.filter}: {c.value}
                  </td>
                  <td>{num(c.uses)}</td>
                </tr>
              ))}
              {s.filters.length === 0 && (
                <tr>
                  <td className={styles.muted}>אין נתונים עדיין</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {s.errors.length > 0 && (
        <div className={styles.card}>
          <h2>שגיאות בדפדפן של גולשים</h2>
          <table className={styles.table}>
            <tbody>
              {s.errors.map((e) => (
                <tr key={`${e.path}-${e.message}`}>
                  <td>{e.message}</td>
                  <td className={styles.muted}>{pageLabel(e.path)}</td>
                  <td>{num(e.occurrences)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
