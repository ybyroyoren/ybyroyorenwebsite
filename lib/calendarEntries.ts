// Hand-made calendar entries (shared by server and client code): kinds, labels, and the form-value cleaning.

export type EntryKind = "meeting" | "note" | "blocked";

export const ENTRY_KINDS: { value: EntryKind; label: string; hint: string }[] = [
  { value: "meeting", label: "פגישה", hint: "פגישה עם לקוח, ספק או צוות" },
  { value: "note", label: "הערה", hint: "תזכורת או הערה כללית ליום" },
  { value: "blocked", label: "לא עובדים", hint: "תאריכים שאי אפשר לעבוד בהם" },
];

export const ENTRY_KIND_LABEL: Record<EntryKind, string> = {
  meeting: "פגישה",
  note: "הערה",
  blocked: "לא עובדים",
};

export interface CalendarEntry {
  id: string;
  kind: EntryKind;
  title: string;
  details: string;
  location: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  source: "site" | "google";
}

export function entryFromRow(r: Record<string, unknown>): CalendarEntry {
  const s = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
  const kind = r.kind === "note" || r.kind === "blocked" ? r.kind : "meeting";
  return {
    id: String(r.id),
    kind,
    title: s("title"),
    details: s("details"),
    location: s("location"),
    startDate: s("start_date"),
    endDate: s("end_date") || s("start_date"),
    startTime: s("start_time"),
    endTime: s("end_time"),
    source: r.source === "google" ? "google" : "site",
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Cleans the form values into DB columns, or says what is wrong. */
export function entryToRow(input: Record<string, unknown>): { row: Record<string, unknown> } | { error: string } {
  const text = (k: string) => (typeof input[k] === "string" ? (input[k] as string).trim() : "");
  const kind = input.kind === "note" || input.kind === "blocked" ? input.kind : "meeting";
  const title = text("title");
  if (!title) return { error: "נא להזין כותרת" };
  const startDate = text("startDate");
  if (!ISO_DATE.test(startDate)) return { error: "נא לבחור תאריך" };
  const endDate = ISO_DATE.test(text("endDate")) ? text("endDate") : startDate;
  if (endDate < startDate) return { error: "תאריך הסיום לפני תאריך ההתחלה" };
  const startTime = TIME.test(text("startTime")) ? text("startTime") : "";
  // An end time means nothing without a start time.
  const endTime = startTime && TIME.test(text("endTime")) ? text("endTime") : "";
  return {
    row: {
      kind,
      title,
      details: text("details"),
      location: text("location"),
      start_date: startDate,
      end_date: endDate,
      start_time: startTime,
      end_time: endTime,
    },
  };
}

/** Every date from start to end, inclusive (capped, so a typo can't make a huge list). */
export function datesBetween(start: string, end: string, cap = 62): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (d <= last && out.length < cap) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
