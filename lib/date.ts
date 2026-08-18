import type { Locale } from "@/lib/dictionary";

export function formatMealDateParts(
  isoDate: string,
  locale: Locale = "he"
): { day: string; num: string; month: string } {
  const date = new Date(`${isoDate}T00:00:00`);
  const intlLocale = locale === "en" ? "en-US" : "he-IL";
  const day = new Intl.DateTimeFormat(intlLocale, { weekday: "long" }).format(date);
  const num = new Intl.DateTimeFormat(intlLocale, { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat(intlLocale, { month: "long" }).format(date);
  return { day, num, month };
}

export function formatMealDateFull(isoDate: string, locale: Locale = "he"): string {
  const { day, num, month } = formatMealDateParts(isoDate, locale);
  return locale === "en" ? `${day}, ${month} ${num}` : `${day}, ${num} ב${month}`;
}

/** Today + `days`, as a YYYY-MM-DD string (local date, no time component). */
export function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
