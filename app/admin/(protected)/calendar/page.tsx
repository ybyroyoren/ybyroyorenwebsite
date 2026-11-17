import Link from "next/link";
import { requireAdminSection } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { todayIsraelIso } from "@/lib/date";
import {
  MONTH_NAMES,
  WEEKDAYS_LONG,
  WEEKDAYS_SHORT,
  monthKey,
  monthWeeks,
  parseMonth,
  shiftMonth,
  weekdayOf,
} from "@/lib/calendar";
import { ChevronIcon } from "@/components/site/ChevronIcon";
import { categoryLabel } from "@/lib/kitchen/eventDossier";
import { ENTRY_KIND_LABEL, datesBetween, entryFromRow } from "@/lib/calendarEntries";
import { loadGoogleConfig } from "@/lib/googleCalendar";
import { getSyncStatus, scheduleCalendarSyncIfStale } from "@/lib/calendarSync";
import { disconnectGoogle, saveGoogleSettings, syncCalendarNow, testGoogleConnection } from "@/lib/actions/admin/calendar";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import styles from "../../admin.module.css";
import cal from "./calendar.module.css";

type Kind = "closed" | "open" | "meal" | "mealDone" | "meeting" | "note" | "blocked";

interface CalItem {
  key: string;
  kind: Kind;
  date: string | null;
  time: string;
  title: string;
  meta: string;
  href: string;
}

const KIND_CLASS: Record<Kind, string> = {
  closed: cal.kClosed,
  open: cal.kOpen,
  meal: cal.kMeal,
  mealDone: cal.kMealDone,
  meeting: cal.kMeeting,
  note: cal.kNote,
  blocked: cal.kBlocked,
};

const KIND_LABEL: Record<Kind, string> = {
  closed: "אירוע פרטי — סגור",
  open: "אירוע פרטי — עדיין לא סגור",
  meal: "ארוחה פתוחה",
  mealDone: "ארוחה פתוחה שנסגרה",
  meeting: "פגישה",
  note: "הערה",
  blocked: "לא עובדים",
};

const GOOGLE_FLASH: Record<string, { ok: boolean; text: string }> = {
  saved: { ok: true, text: "הפרטים נשמרו. לחצו על ״בדיקת חיבור״." },
  ok: { ok: true, text: "החיבור תקין." },
  synced: { ok: true, text: "הסנכרון הסתיים." },
  disconnected: { ok: true, text: "החיבור נותק. האירועים שכבר נמצאים ב-Google נשארו שם." },
  badkey: { ok: false, text: "קובץ המפתח לא תקין. צריך להדביק את כל תוכן קובץ ה-JSON שהורד מ-Google." },
  failed: { ok: false, text: "השמירה נכשלה." },
  missing: { ok: false, text: "החיבור עוד לא הוגדר במלואו: חסר מזהה יומן או מפתח." },
  error: { ok: false, text: "החיבור נכשל." },
  syncerror: { ok: false, text: "הסנכרון הסתיים עם שגיאות." },
};

const byTimeThenTitle = (a: CalItem, b: CalItem) =>
  (a.time || "99:99").localeCompare(b.time || "99:99") || a.title.localeCompare(b.title, "he");

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; google?: string; msg?: string }>;
}) {
  const { m, google, msg } = await searchParams;
  const admin = await requireAdminSection("calendar");
  const isOwner = admin.role === "owner";

  // Keep the Google copy fresh whenever someone looks at the calendar (at most once every two minutes).
  scheduleCalendarSyncIfStale();

  const today = todayIsraelIso();
  const [ty, tm] = today.split("-").map(Number);
  const { year, month } = parseMonth(m) ?? { year: ty, month: tm };
  const weeks = monthWeeks(year, month);
  const rangeStart = weeks[0][0].iso;
  const rangeEnd = weeks[weeks.length - 1][6].iso;

  const db = supabaseAdmin();
  const [{ data: events }, { data: undatedEvents }, { data: meals }, { data: availability }, { data: entryRows }] = await Promise.all([
    db
      .from("kl_events")
      .select("id, name, date, deal_status, gather_time, start_time, guest_count, event_type, location, category, category_other")
      .gte("date", rangeStart)
      .lte("date", rangeEnd),
    db.from("kl_events").select("id, name, deal_status, guest_count, category, category_other").is("date", null),
    db.from("meals").select("id, title, date, total_seats, status").gte("date", rangeStart).lte("date", rangeEnd),
    db.from("meal_availability").select("meal_id, taken_seats"),
    db.from("calendar_entries").select("*").lte("start_date", rangeEnd).gte("end_date", rangeStart),
  ]);

  const takenByMeal = new Map<string, number>((availability ?? []).map((a: { meal_id: string; taken_seats: number }) => [a.meal_id, a.taken_seats]));
  const eventHref = (id: string) => (isOwner ? `/admin/kitchen/events/${id}` : `/admin/kitchen/events/${id}/summary`);

  type EventRow = {
    id: string;
    name: string;
    date?: string | null;
    deal_status: string;
    gather_time?: string;
    start_time?: string;
    guest_count: number;
    event_type?: string;
    location?: string;
    category: string;
    category_other: string;
  };
  const toItem = (e: EventRow): CalItem => {
    const cat = categoryLabel(e.category, e.category_other);
    const where = e.event_type === "offsite" ? (e.location ? `חוץ · ${e.location}` : "חוץ") : "אצלנו";
    return {
      key: `e-${e.id}`,
      kind: e.deal_status === "closed" ? "closed" : "open",
      date: e.date ?? null,
      time: e.start_time || e.gather_time || "",
      title: e.name,
      meta: [cat, `${e.guest_count} סועדים`, e.date ? where : ""].filter(Boolean).join(" · "),
      href: eventHref(e.id),
    };
  };

  const items: CalItem[] = [
    ...((events ?? []) as EventRow[]).map(toItem),
    ...(meals ?? []).map((meal: { id: string; title: string; date: string; total_seats: number; status: string }): CalItem => ({
      key: `m-${meal.id}`,
      kind: meal.status === "closed" ? "mealDone" : "meal",
      date: meal.date,
      time: "",
      title: `🍽 ${meal.title}`,
      meta: `ארוחה פתוחה · ${takenByMeal.get(meal.id) ?? 0}/${meal.total_seats} מקומות`,
      href: "/admin/meals",
    })),
  ];

  // Hand-made entries: one chip per day they cover.
  const blockedDays = new Set<string>();
  for (const row of entryRows ?? []) {
    const entry = entryFromRow(row);
    for (const day of datesBetween(entry.startDate, entry.endDate)) {
      if (day < rangeStart || day > rangeEnd) continue;
      if (entry.kind === "blocked") blockedDays.add(day);
      items.push({
        key: `n-${entry.id}-${day}`,
        kind: entry.kind,
        date: day,
        time: entry.startTime,
        title: entry.title,
        meta: [ENTRY_KIND_LABEL[entry.kind], entry.location, entry.details].filter(Boolean).join(" · "),
        href: `/admin/calendar/entry?id=${entry.id}`,
      });
    }
  }
  const undated = ((undatedEvents ?? []) as EventRow[]).map(toItem);

  const byDate = new Map<string, CalItem[]>();
  for (const it of items) {
    if (!it.date) continue;
    const list = byDate.get(it.date) ?? [];
    list.push(it);
    byDate.set(it.date, list);
  }
  for (const list of byDate.values()) list.sort(byTimeThenTitle);

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const thisMonth = monthKey(ty, tm);
  const inMonth = weeks.flat().filter((x) => x.inMonth);
  const agendaDays = [...byDate.keys()].filter((d) => d >= inMonth[0].iso && d <= inMonth[inMonth.length - 1].iso).sort();

  const monthItems = agendaDays.flatMap((d) => byDate.get(d) ?? []);
  const privateCount = monthItems.filter((i) => i.kind === "closed" || i.kind === "open").length;
  const mealCount = monthItems.filter((i) => i.kind === "meal" || i.kind === "mealDone").length;
  const otherCount = monthItems.length - privateCount - mealCount;

  const addLinks = (date?: string) => {
    const q = date ? `&date=${date}` : "";
    return (
      <div className={cal.menuList}>
        {isOwner && <Link href={date ? `/admin/kitchen/events/new?date=${date}` : "/admin/kitchen/events/new"}>תיק אירוע</Link>}
        <Link href={`/admin/calendar/entry?kind=meeting${q}`}>פגישה</Link>
        <Link href={`/admin/calendar/entry?kind=note${q}`}>הערה</Link>
        <Link href={`/admin/calendar/entry?kind=blocked${q}`}>לא עובדים</Link>
      </div>
    );
  };

  // Google connection (owner only)
  const google_ = isOwner ? await loadGoogleConfig() : null;
  const status = isOwner ? await getSyncStatus() : null;
  const flash = google ? GOOGLE_FLASH[google] : undefined;

  return (
    <>
      <h1>לוח שנה</h1>

      <div className={cal.toolbar}>
        <Link className={cal.navBtn} href={`/admin/calendar?m=${monthKey(prev.year, prev.month)}`} aria-label="החודש הקודם">
          <ChevronIcon dir="prev" />
        </Link>
        <h2 className={cal.monthTitle}>
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <Link className={cal.navBtn} href={`/admin/calendar?m=${monthKey(next.year, next.month)}`} aria-label="החודש הבא">
          <ChevronIcon dir="next" />
        </Link>
        {monthKey(year, month) !== thisMonth && (
          <Link className={styles.btnSecondary} href="/admin/calendar">
            חזרה להיום
          </Link>
        )}
        <form className={cal.jump} method="get">
          <input type="month" name="m" defaultValue={monthKey(year, month)} aria-label="קפיצה לחודש" />
          <button type="submit" className={styles.btnSecondary}>
            מעבר
          </button>
        </form>
        <details className={cal.addMenu}>
          <summary className={styles.btn}>+ הוספה</summary>
          {addLinks()}
        </details>
      </div>

      <div className={cal.legend}>
        {(["closed", "open", "meal", "meeting", "note", "blocked"] as Kind[]).map((k) => (
          <span key={k}>
            <i className={`${cal.swatch} ${KIND_CLASS[k]}`} />
            {KIND_LABEL[k]}
          </span>
        ))}
        <span className={styles.muted}>
          בחודש הזה: {privateCount} אירועים פרטיים · {mealCount} ארוחות פתוחות · {otherCount} פגישות והערות
        </span>
      </div>

      {undated.length > 0 && (
        <>
          <p className={styles.muted} style={{ margin: "0 0 8px" }}>
            תיקי אירוע בלי תאריך עדיין ({undated.length}):
          </p>
          <div className={cal.undated}>
            {undated.map((u) => (
              <Link key={u.key} href={u.href} className={`${cal.chip} ${KIND_CLASS[u.kind]}`}>
                <b>{u.title}</b> · {u.meta}
              </Link>
            ))}
          </div>
        </>
      )}

      <div className={cal.grid} role="grid" aria-label={`${MONTH_NAMES[month - 1]} ${year}`}>
        <div className={cal.weekdays}>
          {WEEKDAYS_SHORT.map((w, i) => (
            <div key={w} title={`יום ${WEEKDAYS_LONG[i]}`}>
              {w}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className={cal.week}>
            {week.map((day) => {
              const list = byDate.get(day.iso) ?? [];
              return (
                <div
                  key={day.iso}
                  className={`${cal.cell} ${day.inMonth ? "" : cal.outside} ${day.iso === today ? cal.today : ""} ${blockedDays.has(day.iso) ? cal.blockedDay : ""}`}
                >
                  <div className={cal.dayHead}>
                    <span className={cal.dayNum}>{day.day}</span>
                    {day.inMonth && (
                      <details className={cal.addMenu}>
                        <summary className={cal.addBtn} aria-label={`הוספה ב-${day.iso}`} title="הוספה ליום הזה">
                          +
                        </summary>
                        {addLinks(day.iso)}
                      </details>
                    )}
                  </div>
                  {list.map((it) => (
                    <Link key={it.key} href={it.href} className={`${cal.chip} ${KIND_CLASS[it.kind]}`} title={`${it.title} — ${it.meta}`}>
                      {it.time && <b>{it.time} </b>}
                      {it.title}
                    </Link>
                  ))}
                  {list.length > 0 && (
                    <div className={cal.dots} aria-hidden="true">
                      {list.map((it) => (
                        <i key={it.key} className={`${cal.dot} ${KIND_CLASS[it.kind]}`} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <h2 className={cal.sectionTitle}>רשימת החודש</h2>
      {agendaDays.length === 0 ? (
        <p className={cal.empty}>אין אירועים בחודש הזה.</p>
      ) : (
        <div className={cal.agenda}>
          {agendaDays.map((iso) => (
            <div key={iso} className={cal.agendaDay}>
              <div className={cal.agendaDate}>
                <strong>{Number(iso.slice(8))}</strong>
                <span>יום {WEEKDAYS_LONG[weekdayOf(iso)]}</span>
              </div>
              <div className={cal.agendaItems}>
                {(byDate.get(iso) ?? []).map((it) => (
                  <Link key={it.key} href={it.href} className={`${cal.agendaItem} ${KIND_CLASS[it.kind]}`}>
                    {it.time && <span>{it.time}</span>}
                    <span className={cal.title}>{it.title}</span>
                    <span className={cal.meta}>{it.meta}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isOwner && google_ && status && (
        <div className={`${styles.card} ${cal.googleCard}`} id="google">
          <h2>סנכרון עם Google Calendar</h2>

          {flash && (
            <p className={flash.ok ? styles.success : styles.error}>
              {flash.text}
              {msg ? ` ${msg}` : ""}
            </p>
          )}

          <div className={cal.googleStatus}>
            {google_.config ? (
              <span className={cal.ok}>מחובר ליומן: {google_.calendarId}</span>
            ) : (
              <span className={cal.bad}>עוד לא מחובר{google_.problem ? ` — ${google_.problem}` : ""}</span>
            )}
            {google_.clientEmail && (
              <span>
                חשבון השירות (את היומן ב-Google צריך לשתף איתו, עם הרשאה &quot;ביצוע שינויים באירועים&quot;): <code dir="ltr">{google_.clientEmail}</code>
              </span>
            )}
            {status.lastSync && <span>סנכרון אחרון: {new Date(status.lastSync).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}</span>}
            {status.lastSummary && <span className={styles.muted}>{status.lastSummary}</span>}
            {status.lastError && <span className={cal.bad}>שגיאה אחרונה: {status.lastError}</span>}
          </div>

          <form action={saveGoogleSettings} className={styles.form} style={{ marginBottom: 14 }}>
            <div className={styles.field} style={{ flex: "1 1 280px" }}>
              <label htmlFor="calendarId">מזהה היומן (Calendar ID)</label>
              <input id="calendarId" name="calendarId" dir="ltr" placeholder="abc123@group.calendar.google.com" defaultValue={google_.calendarId} />
            </div>
            <div className={styles.field} style={{ flex: "1 1 100%" }}>
              <label htmlFor="key">
                קובץ המפתח (JSON) {google_.clientEmail ? "· שמור. הדבקה חדשה תחליף אותו" : "· עוד לא הוגדר"}
              </label>
              <textarea id="key" name="key" className={cal.keyBox} placeholder='{"type": "service_account", ...}' spellCheck={false} />
            </div>
            <button type="submit" className={styles.btn}>
              שמירה
            </button>
          </form>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <form action={testGoogleConnection}>
              <button type="submit" className={styles.btnSecondary}>
                בדיקת חיבור
              </button>
            </form>
            <form action={syncCalendarNow}>
              <button type="submit" className={styles.btnSecondary} disabled={!google_.config}>
                סנכרון עכשיו
              </button>
            </form>
            {google_.config && (
              <form action={disconnectGoogle}>
                <ConfirmButton className={styles.btnDanger} message="לנתק את הסנכרון עם Google? מה שכבר נמצא ב-Google יישאר שם.">
                  ניתוק
                </ConfirmButton>
              </form>
            )}
          </div>

          <details style={{ marginTop: 18 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>איך מחברים (חד פעמי)</summary>
            <ol className={cal.steps}>
              <li>
                נכנסים ל-<code>console.cloud.google.com</code> עם חשבון Google שלכם, יוצרים פרויקט חדש ומפעילים בו את <b>Google Calendar API</b>.
              </li>
              <li>
                בתפריט <b>IAM and admin ← Service accounts</b> יוצרים חשבון שירות. בלשונית <b>Keys</b> לוחצים <b>Add key ← JSON</b>, והקובץ יורד למחשב.
              </li>
              <li>
                ב-<code>calendar.google.com</code> יוצרים יומן חדש (למשל &quot;Y — אירועים&quot;). בהגדרות היומן ← <b>Share with specific people</b> מוסיפים את כתובת
                חשבון השירות (<code>…@…iam.gserviceaccount.com</code>, מופיעה גם בקובץ ה-JSON) עם ההרשאה <b>Make changes to events</b>.
              </li>
              <li>
                באותן הגדרות, תחת <b>Integrate calendar</b>, מעתיקים את <b>Calendar ID</b>.
              </li>
              <li>
                מדביקים כאן את מזהה היומן ואת כל תוכן קובץ ה-JSON, לוחצים <b>שמירה</b>, אחר כך <b>בדיקת חיבור</b> ו<b>סנכרון עכשיו</b>.
              </li>
            </ol>
            <p className={styles.muted} style={{ marginTop: 12 }}>
              אירועים פרטיים וארוחות פתוחות נכתבים ל-Google והאתר הוא המקור שלהם (שינוי שלהם ב-Google יידרס). פגישות, הערות ותאריכים חסומים מסתנכרנים לשני הכיוונים,
              ואירוע שיוצרים ישירות ב-Google מופיע כאן כפגישה. אירועים חוזרים מ-Google לא מיובאים.
            </p>
          </details>
        </div>
      )}
    </>
  );
}
