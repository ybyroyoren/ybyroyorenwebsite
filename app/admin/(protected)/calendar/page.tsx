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
import styles from "../../admin.module.css";
import cal from "./calendar.module.css";

type Kind = "closed" | "open" | "meal" | "mealDone";

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
};

const KIND_LABEL: Record<Kind, string> = {
  closed: "אירוע פרטי — סגור",
  open: "אירוע פרטי — עדיין לא סגור",
  meal: "ארוחה פתוחה",
  mealDone: "ארוחה פתוחה שנסגרה",
};

const byTimeThenTitle = (a: CalItem, b: CalItem) =>
  (a.time || "99:99").localeCompare(b.time || "99:99") || a.title.localeCompare(b.title, "he");

export default async function AdminCalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const admin = await requireAdminSection("calendar");
  const isOwner = admin.role === "owner";

  const today = todayIsraelIso();
  const [ty, tm] = today.split("-").map(Number);
  const { year, month } = parseMonth(m) ?? { year: ty, month: tm };
  const weeks = monthWeeks(year, month);
  const rangeStart = weeks[0][0].iso;
  const rangeEnd = weeks[weeks.length - 1][6].iso;

  const db = supabaseAdmin();
  const [{ data: events }, { data: undatedEvents }, { data: meals }, { data: availability }] = await Promise.all([
    db
      .from("kl_events")
      .select("id, name, date, deal_status, gather_time, start_time, guest_count, event_type, location, category, category_other")
      .gte("date", rangeStart)
      .lte("date", rangeEnd),
    db
      .from("kl_events")
      .select("id, name, deal_status, guest_count, category, category_other")
      .is("date", null),
    db.from("meals").select("id, title, date, total_seats, status").gte("date", rangeStart).lte("date", rangeEnd),
    db.from("meal_availability").select("meal_id, taken_seats"),
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
  const agendaDays = [...byDate.keys()].filter((d) => d >= weeks[0].find((x) => x.inMonth)!.iso && d <= [...weeks.flat()].filter((x) => x.inMonth).at(-1)!.iso).sort();

  const privateCount = items.filter((i) => i.kind === "closed" || i.kind === "open").length;
  const mealCount = items.length - privateCount;

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
        {isOwner && (
          <Link href="/admin/kitchen/events/new" className={styles.btn}>
            + תיק אירוע חדש
          </Link>
        )}
      </div>

      <div className={cal.legend}>
        {(["closed", "open", "meal", "mealDone"] as Kind[]).map((k) => (
          <span key={k}>
            <i className={`${cal.swatch} ${KIND_CLASS[k]}`} />
            {KIND_LABEL[k]}
          </span>
        ))}
        <span className={styles.muted}>
          בחודש הזה: {privateCount} אירועים פרטיים · {mealCount} ארוחות פתוחות
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
                <div key={day.iso} className={`${cal.cell} ${day.inMonth ? "" : cal.outside} ${day.iso === today ? cal.today : ""}`}>
                  <div className={cal.dayHead}>
                    <span className={cal.dayNum}>{day.day}</span>
                    {isOwner && day.inMonth && (
                      <Link href={`/admin/kitchen/events/new?date=${day.iso}`} className={cal.addBtn} aria-label={`תיק אירוע חדש ב-${day.iso}`} title="תיק אירוע חדש ביום הזה">
                        +
                      </Link>
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
    </>
  );
}
