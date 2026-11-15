"use client";

import { useEffect, useState } from "react";
import { formatMealDateFull } from "@/lib/date";
import type { Locale } from "@/lib/dictionary";
import styles from "./PickupCalendar.module.css";

type DayState = { state: "early" | "closed" | "stock" | "ok"; reason?: string };
interface CalendarData {
  today: string;
  minDate: string;
  last: string;
  days: Record<string, DayState>;
}

const pad = (n: number) => String(n).padStart(2, "0");

const T = {
  he: {
    loading: "טוען תאריכי איסוף...",
    prev: "החודש הקודם",
    next: "החודש הבא",
    okLegend: "אפשר לאסוף, ויש מלאי לכל המוצרים שבעגלה.",
    noLegend: "אי אפשר לאסוף: האיסוף סגור בתאריך הזה, או שאין מספיק מלאי של מוצר שבעגלה. לחיצה על היום מסבירה למה.",
    earlyLegend: "מוקדם מדי: זמן ההכנה של המוצרים בעגלה.",
    early: (date: string) => `זמן ההכנה של המוצרים בעגלה: האיסוף המוקדם ביותר האפשרי הוא ${date}.`,
    out: "התאריך הזה מחוץ לטווח ההזמנה.",
    pick: "בחרו יום איסוף מהלוח.",
    picked: (date: string) => `יום האיסוף שנבחר: ${date}`,
    none: "אין כרגע תאריך איסוף פנוי למוצרים שבעגלה. אפשר לשנות כמויות או ליצור קשר.",
  },
  en: {
    loading: "Loading pickup dates...",
    prev: "Previous month",
    next: "Next month",
    okLegend: "Pickup is possible, and everything in your cart is in stock.",
    noLegend: "Pickup is not possible: pickup is closed on that day, or an item in your cart is not available in the quantity you chose. Tap the day to see why.",
    earlyLegend: "Too early: preparation time for the items in your cart.",
    early: (date: string) => `Because of the preparation time, the earliest possible pickup is ${date}.`,
    out: "This date is outside the ordering range.",
    pick: "Choose a pickup day from the calendar.",
    picked: (date: string) => `Selected pickup day: ${date}`,
    none: "There is no available pickup date for the items in your cart right now. Try changing quantities or contact us.",
  },
};

/**
 * Pickup date picker. Green dot = the cart can be picked up that day (open, and every item in stock); red dot = it
 * can't (pickup closed that day, or an item is out of stock / over its daily limit); grey = too early for the
 * preparation time. Only green days can be chosen; tapping a red day explains the reason.
 */
export function PickupCalendar({
  locale,
  value,
  onChange,
  cartKey,
}: {
  locale: Locale;
  value: string;
  onChange: (date: string) => void;
  cartKey: string;
}) {
  const t = T[locale];
  const [data, setData] = useState<CalendarData | null>(null);
  const [view, setView] = useState<{ y: number; m: number } | null>(null);
  const [peek, setPeek] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cart/calendar?locale=${locale}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((next: CalendarData | null) => {
        if (cancelled || !next) return;
        setData(next);
        const firstOk = Object.keys(next.days)
          .sort()
          .find((d) => next.days[d].state === "ok");
        const currentOk = value && next.days[value]?.state === "ok";
        if (!currentOk) onChange(firstOk ?? "");
        const focus = (currentOk ? value : firstOk) ?? next.minDate;
        setView((v) => v ?? { y: Number(focus.slice(0, 4)), m: Number(focus.slice(5, 7)) - 1 });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // value/onChange intentionally omitted: refetch only when the cart changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, locale]);

  if (!data || !view) return <div className={styles.loading}>{t.loading}</div>;

  const intl = locale === "en" ? "en-US" : "he-IL";
  const monthTitle = new Intl.DateTimeFormat(intl, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(view.y, view.m, 1)));
  const weekdayNames = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(intl, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 4 + i)))
  ); // 2026-01-04 is a Sunday
  const firstWeekday = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const toIso = (day: number) => `${view.y}-${pad(view.m + 1)}-${pad(day)}`;

  const todayMonth = { y: Number(data.today.slice(0, 4)), m: Number(data.today.slice(5, 7)) - 1 };
  const lastMonth = { y: Number(data.last.slice(0, 4)), m: Number(data.last.slice(5, 7)) - 1 };
  const index = (x: { y: number; m: number }) => x.y * 12 + x.m;
  const shift = (delta: number) => {
    const next = index(view) + delta;
    setView({ y: Math.floor(next / 12), m: next % 12 });
  };

  const hasAnyOk = Object.values(data.days).some((d) => d.state === "ok");
  const dateLabel = (iso: string) => iso.split("-").reverse().join(".");

  function click(iso: string, day: DayState | undefined) {
    if (!day) return setPeek(iso);
    if (day.state === "ok") {
      setPeek(null);
      onChange(iso);
    } else {
      setPeek(iso);
    }
  }

  const peekDay = peek ? data.days[peek] : undefined;
  const peekText = peek
    ? !peekDay
      ? t.out
      : peekDay.state === "early"
        ? t.early(dateLabel(data.minDate))
        : (peekDay.reason ?? "")
    : "";

  return (
    <div>
      <div className={styles.wrap}>
        <div className={styles.head}>
          <button type="button" className={styles.nav} aria-label={t.prev} disabled={index(view) <= index(todayMonth)} onClick={() => shift(-1)}>
            {locale === "en" ? "‹" : "›"}
          </button>
          <span className={styles.month}>{monthTitle}</span>
          <button type="button" className={styles.nav} aria-label={t.next} disabled={index(view) >= index(lastMonth)} onClick={() => shift(1)}>
            {locale === "en" ? "›" : "‹"}
          </button>
        </div>

        <div className={styles.grid}>
          {weekdayNames.map((w) => (
            <div key={w} className={styles.weekday}>
              {w}
            </div>
          ))}
          {Array.from({ length: firstWeekday }, (_, i) => (
            <div key={`b${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const iso = toIso(day);
            const state = data.days[iso];
            const ok = state?.state === "ok";
            const no = state?.state === "closed" || state?.state === "stock";
            const classes = [styles.day, ok ? styles.ok : "", !ok && !no ? styles.muted : "", iso === value && ok ? styles.selected : "", iso === peek && !ok ? styles.peek : ""]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={iso}
                type="button"
                className={classes}
                aria-pressed={iso === value}
                aria-label={`${dateLabel(iso)}${ok ? "" : no ? ` — ${state?.reason ?? ""}` : ""}`}
                onClick={() => click(iso, state)}
              >
                <span>{day}</span>
                {ok && <span className={`${styles.dot} ${styles.dotOk}`} />}
                {no && <span className={`${styles.dot} ${styles.dotNo}`} />}
              </button>
            );
          })}
        </div>

        <div className={styles.legend}>
          <div className={styles.legendRow}>
            <span className={`${styles.dot} ${styles.dotOk}`} />
            <span>{t.okLegend}</span>
          </div>
          <div className={styles.legendRow}>
            <span className={`${styles.dot} ${styles.dotNo}`} />
            <span>{t.noLegend}</span>
          </div>
          <div className={styles.legendRow}>
            <span className={styles.legendGray} />
            <span>{t.earlyLegend}</span>
          </div>
        </div>
      </div>

      {peekText && (
        <p className={styles.info} role="status">
          {peekText}
        </p>
      )}
      {!hasAnyOk ? (
        <p className={styles.info}>{t.none}</p>
      ) : value && data.days[value]?.state === "ok" ? (
        <p className={styles.picked}>{t.picked(formatMealDateFull(value, locale))}</p>
      ) : (
        <p className={styles.picked}>{t.pick}</p>
      )}
    </div>
  );
}
