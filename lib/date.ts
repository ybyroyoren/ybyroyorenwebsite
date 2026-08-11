export function formatMealDateParts(isoDate: string): { day: string; num: string; month: string } {
  const date = new Date(`${isoDate}T00:00:00`);
  const day = new Intl.DateTimeFormat("he-IL", { weekday: "long" }).format(date);
  const num = new Intl.DateTimeFormat("he-IL", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("he-IL", { month: "long" }).format(date);
  return { day, num, month };
}

export function formatMealDateFull(isoDate: string): string {
  const { day, num, month } = formatMealDateParts(isoDate);
  return `${day}, ${num} ב${month}`;
}

/** Today + `days`, as a YYYY-MM-DD string (local date, no time component). */
export function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
