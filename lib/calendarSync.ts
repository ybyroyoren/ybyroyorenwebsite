import "server-only";
import { createHash } from "node:crypto";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSettings, saveSettings } from "@/lib/integrationSettings";
import { entryFromRow, type CalendarEntry } from "@/lib/calendarEntries";
import { DEAL_STATUS_LABEL, categoryLabel, serviceStyleLabel } from "@/lib/kitchen/eventDossier";
import {
  GoogleError,
  deleteEvent,
  insertEvent,
  listChanges,
  loadGoogleConfig,
  patchEvent,
  type GoogleConfig,
  type GoogleEvent,
  type GoogleEventBody,
  type GoogleTime,
} from "@/lib/googleCalendar";

// Two-way sync with one Google calendar.
//  - Private events (the event files) and open meals are written to Google: the site is the source of truth, so an
//    outside edit of those copies is overwritten at the next sync.
//  - Meetings, notes and blocked dates are two-way: edit them on either side. An event created directly in Google
//    arrives here as a "meeting" entry.
//  - Recurring Google events are not imported.
// Every item gets a fixed Google event id derived from its own id, so a repeated or overlapping sync can never
// create duplicates.

const TZ = "Asia/Jerusalem";
const STATE_NAMES = ["GCAL_SYNC_TOKEN", "GCAL_LAST_SYNC", "GCAL_LAST_ERROR", "GCAL_LAST_SUMMARY"] as const;

type EntityType = "event" | "meal" | "entry";

interface Link {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  google_event_id: string;
  content_hash: string;
  google_updated: string;
}

interface Desired {
  type: EntityType;
  id: string;
  body: GoogleEventBody;
}

export interface SyncReport {
  ok: boolean;
  created: number;
  updated: number;
  deleted: number;
  imported: number;
  appliedFromGoogle: number;
  errors: string[];
}

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const hashOf = (body: GoogleEventBody) => createHash("sha1").update(JSON.stringify(body)).digest("hex");
const googleIdFor = (type: EntityType, id: string) => createHash("sha1").update(`yby:${type}:${id}`).digest("hex");

// ---------- date helpers (YYYY-MM-DD / HH:MM strings; no timezone surprises) ----------

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function plusMinutes(date: string, time: string, minutes: number): { date: string; time: string } {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const dayShift = Math.floor(total / 1440);
  const rest = ((total % 1440) + 1440) % 1440;
  return { date: addDays(date, dayShift), time: `${String(Math.floor(rest / 60)).padStart(2, "0")}:${String(rest % 60).padStart(2, "0")}` };
}

const local = (date: string, time: string): GoogleTime => ({ dateTime: `${date}T${time}:00`, timeZone: TZ });

/** The Google start/end for a day (or range of days), all-day or with times. */
export function whenFor(startDate: string, endDate: string, startTime: string, endTime: string): { start: GoogleTime; end: GoogleTime } {
  if (!startTime) return { start: { date: startDate }, end: { date: addDays(endDate || startDate, 1) } };
  let end = { date: endDate || startDate, time: endTime };
  if (!endTime) end = plusMinutes(startDate, startTime, 120);
  else if (end.date === startDate && endTime <= startTime) end = { date: addDays(startDate, 1), time: endTime };
  return { start: local(startDate, startTime), end: local(end.date, end.time) };
}

function israelParts(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** A Google event's days and times, as this site stores them. */
export function parseWhen(ev: Pick<GoogleEvent, "start" | "end">): Pick<CalendarEntry, "startDate" | "endDate" | "startTime" | "endTime"> {
  if (ev.start.date) {
    const startDate = ev.start.date;
    let endDate = ev.end?.date ? addDays(ev.end.date, -1) : startDate;
    if (endDate < startDate) endDate = startDate;
    return { startDate, endDate, startTime: "", endTime: "" };
  }
  const s = israelParts(ev.start.dateTime!);
  const e = ev.end?.dateTime ? israelParts(ev.end.dateTime) : null;
  return { startDate: s.date, endDate: e && e.date >= s.date ? e.date : s.date, startTime: s.time, endTime: e?.time ?? "" };
}

// ---------- what should exist in Google ----------

const PREFIX: Record<string, string> = { note: "📝 ", blocked: "⛔ " };
const COLOR = { eventClosed: "10", eventOpen: "5", meal: "9", meeting: "7", note: "8", blocked: "11" };

export function entryBody(entry: CalendarEntry): GoogleEventBody {
  return {
    summary: `${PREFIX[entry.kind] ?? ""}${entry.title}`,
    description: entry.details || undefined,
    location: entry.location || undefined,
    ...whenFor(entry.startDate, entry.endDate, entry.startTime, entry.endTime),
    colorId: COLOR[entry.kind],
    extendedProperties: { private: { ybyType: "entry", ybyId: entry.id } },
  };
}

function eventBody(r: Record<string, unknown>): GoogleEventBody {
  const s = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
  const date = s("date");
  const startTime = s("start_time") || s("gather_time");
  const closed = r.deal_status !== "open";
  const staff = Array.isArray(r.staff) ? (r.staff as { name?: string }[]).map((m) => m.name).filter(Boolean) : [];
  const cat = categoryLabel(s("category"), s("category_other"));
  const times = [s("gather_time") && `התכנסות ${s("gather_time")}`, s("start_time") && `התחלה ${s("start_time")}`, s("end_time") && `סיום ${s("end_time")}`].filter(Boolean);
  const lines = [
    `סטטוס: ${DEAL_STATUS_LABEL[closed ? "closed" : "open"]}`,
    cat && `סוג: ${cat}`,
    serviceStyleLabel(s("service_style")) && `הגשה: ${serviceStyleLabel(s("service_style"))}`,
    `סועדים: ${Number(r.guest_count ?? 0)}${Number(r.kids_count ?? 0) > 0 ? ` (מתוכם ${r.kids_count} ילדים)` : ""}`,
    times.length > 0 && `שעות: ${times.join(" · ")}`,
    (s("client_name") || s("client_phone")) && `איש קשר: ${[s("client_name"), s("client_phone")].filter(Boolean).join(" · ")}`,
    staff.length > 0 && `צוות: ${staff.join(", ")}`,
    s("notes") && `הערות: ${s("notes")}`,
    `תיק האירוע: ${siteUrl()}/admin/kitchen/events/${r.id}`,
  ].filter(Boolean) as string[];
  const offsite = r.event_type === "offsite";
  return {
    summary: `${s("name")}${closed ? "" : " (לא סגור)"}`,
    description: lines.join("\n"),
    location: offsite ? [s("venue_name"), s("location")].filter(Boolean).join(", ") || undefined : undefined,
    ...whenFor(date, date, startTime, s("end_time")),
    colorId: closed ? COLOR.eventClosed : COLOR.eventOpen,
    extendedProperties: { private: { ybyType: "event", ybyId: String(r.id) } },
  };
}

async function desiredItems(): Promise<{ items: Desired[]; entries: Map<string, CalendarEntry> }> {
  const db = supabaseAdmin();
  const [{ data: events }, { data: meals }, { data: availability }, { data: entryRows }] = await Promise.all([
    db.from("kl_events").select("*").not("date", "is", null),
    db.from("meals").select("id, title, date, total_seats"),
    db.from("meal_availability").select("meal_id, taken_seats"),
    db.from("calendar_entries").select("*"),
  ]);
  const taken = new Map<string, number>((availability ?? []).map((a: { meal_id: string; taken_seats: number }) => [a.meal_id, a.taken_seats]));
  const entries = new Map<string, CalendarEntry>((entryRows ?? []).map((r: Record<string, unknown>) => [String(r.id), entryFromRow(r)]));

  const items: Desired[] = [];
  for (const r of (events ?? []) as Record<string, unknown>[]) items.push({ type: "event", id: String(r.id), body: eventBody(r) });
  for (const m of (meals ?? []) as { id: string; title: string; date: string; total_seats: number }[]) {
    items.push({
      type: "meal",
      id: m.id,
      body: {
        summary: `🍽 ${m.title}`,
        description: `ארוחה פתוחה · ${taken.get(m.id) ?? 0}/${m.total_seats} מקומות\n${siteUrl()}/admin/meals`,
        start: { date: m.date },
        end: { date: addDays(m.date, 1) },
        colorId: COLOR.meal,
        extendedProperties: { private: { ybyType: "meal", ybyId: m.id } },
      },
    });
  }
  for (const e of entries.values()) items.push({ type: "entry", id: e.id, body: entryBody(e) });
  return { items, entries };
}

// ---------- state ----------

async function readState(): Promise<Record<(typeof STATE_NAMES)[number], string>> {
  let saved: Record<string, string> = {};
  try {
    saved = await getSettings([...STATE_NAMES]);
  } catch {
    // table missing: behave as never synced
  }
  return Object.fromEntries(STATE_NAMES.map((n) => [n, saved[n] ?? ""])) as Record<(typeof STATE_NAMES)[number], string>;
}

export async function getSyncStatus(): Promise<{ lastSync: string; lastError: string; lastSummary: string }> {
  const s = await readState();
  return { lastSync: s.GCAL_LAST_SYNC, lastError: s.GCAL_LAST_ERROR, lastSummary: s.GCAL_LAST_SUMMARY };
}

// ---------- pull (Google -> site) ----------

async function pull(config: GoogleConfig, links: Link[], report: SyncReport, token: string): Promise<string | null> {
  const db = supabaseAdmin();
  let result = await listChanges(config, token || null);
  if (result.tokenExpired) result = await listChanges(config, null);

  const byGoogleId = new Map(links.map((l) => [l.google_event_id, l]));

  for (const ev of result.events) {
    if (ev.recurrence || ev.recurringEventId) continue; // recurring events are not imported
    const link = byGoogleId.get(ev.id);

    if (link) {
      if (ev.status === "cancelled") {
        if (link.entity_type === "entry") {
          await db.from("calendar_entries").delete().eq("id", link.entity_id);
          report.appliedFromGoogle++;
        }
        await db.from("calendar_sync_links").delete().eq("id", link.id); // events and meals are put back by the push
        byGoogleId.delete(ev.id);
        links.splice(links.indexOf(link), 1);
        continue;
      }
      if ((ev.updated ?? "") === link.google_updated) continue; // our own write coming back

      if (link.entity_type === "entry") {
        const { data: row } = await db.from("calendar_entries").select("*").eq("id", link.entity_id).maybeSingle();
        if (!row) continue;
        const current = entryFromRow(row);
        const prefix = PREFIX[current.kind] ?? "";
        const summary = ev.summary ?? "";
        const next: CalendarEntry = {
          ...current,
          title: (prefix && summary.startsWith(prefix) ? summary.slice(prefix.length) : summary).trim() || current.title,
          details: ev.description ?? "",
          location: ev.location ?? "",
          ...parseWhen(ev),
        };
        await db
          .from("calendar_entries")
          .update({
            title: next.title,
            details: next.details,
            location: next.location,
            start_date: next.startDate,
            end_date: next.endDate,
            start_time: next.startTime,
            end_time: next.endTime,
          })
          .eq("id", next.id);
        const hash = hashOf(entryBody(next));
        await db.from("calendar_sync_links").update({ content_hash: hash, google_updated: ev.updated ?? "" }).eq("id", link.id);
        link.content_hash = hash;
        link.google_updated = ev.updated ?? "";
        report.appliedFromGoogle++;
      } else {
        // Events and meals belong to the site: force the push to write its version back over the outside edit.
        await db.from("calendar_sync_links").update({ content_hash: "", google_updated: ev.updated ?? "" }).eq("id", link.id);
        link.content_hash = "";
        link.google_updated = ev.updated ?? "";
      }
      continue;
    }

    // Not linked: created directly in Google. Skip anything that is ours but lost its link (the push re-links it).
    if (ev.status === "cancelled" || ev.extendedProperties?.private?.ybyType) continue;
    if (!ev.start || !ev.end) continue;
    const when = parseWhen(ev);
    const { data: created } = await db
      .from("calendar_entries")
      .insert({
        kind: "meeting",
        title: (ev.summary ?? "").trim() || "(ללא כותרת)",
        details: ev.description ?? "",
        location: ev.location ?? "",
        start_date: when.startDate,
        end_date: when.endDate,
        start_time: when.startTime,
        end_time: when.endTime,
        source: "google",
      })
      .select("*")
      .single();
    if (!created) continue;
    const entry = entryFromRow(created);
    const { data: newLink, error } = await db
      .from("calendar_sync_links")
      .insert({
        entity_type: "entry",
        entity_id: entry.id,
        google_event_id: ev.id,
        content_hash: hashOf(entryBody(entry)),
        google_updated: ev.updated ?? "",
      })
      .select("*")
      .single();
    if (error || !newLink) {
      await db.from("calendar_entries").delete().eq("id", entry.id); // another run imported it first
      continue;
    }
    // The push that follows must see this link, or it would write a second copy of the event to Google.
    links.push(newLink as Link);
    byGoogleId.set(ev.id, newLink as Link);
    report.imported++;
  }
  return result.nextSyncToken;
}

// ---------- push (site -> Google) ----------

async function push(config: GoogleConfig, links: Link[], report: SyncReport): Promise<void> {
  const db = supabaseAdmin();
  const { items } = await desiredItems();
  const linkByEntity = new Map(links.map((l) => [`${l.entity_type}:${l.entity_id}`, l]));
  const wanted = new Set<string>();

  for (const item of items) {
    const key = `${item.type}:${item.id}`;
    wanted.add(key);
    const link = linkByEntity.get(key);
    const hash = hashOf(item.body);
    if (link && link.content_hash === hash) continue;

    const googleId = link?.google_event_id ?? googleIdFor(item.type, item.id);
    try {
      let res: GoogleEvent;
      if (link) {
        try {
          res = await patchEvent(config, googleId, { ...item.body, status: "confirmed" });
        } catch (e) {
          if (e instanceof GoogleError && (e.status === 404 || e.status === 410)) res = await insertEvent(config, googleId, item.body);
          else throw e;
        }
      } else {
        try {
          res = await insertEvent(config, googleId, item.body);
        } catch (e) {
          // the id exists already (an earlier run, or a deleted event): take it over
          if (e instanceof GoogleError && e.status === 409) res = await patchEvent(config, googleId, { ...item.body, status: "confirmed" });
          else throw e;
        }
      }
      await db
        .from("calendar_sync_links")
        .upsert(
          { entity_type: item.type, entity_id: item.id, google_event_id: googleId, content_hash: hash, google_updated: res.updated ?? "" },
          { onConflict: "entity_type,entity_id" }
        );
      if (link) report.updated++;
      else report.created++;
    } catch (e) {
      report.errors.push(`${item.body.summary}: ${e instanceof Error ? e.message : "שגיאה"}`);
    }
  }

  // Gone from the site (deleted, or its date was removed): remove the Google copy.
  for (const link of links) {
    if (wanted.has(`${link.entity_type}:${link.entity_id}`)) continue;
    try {
      await deleteEvent(config, link.google_event_id);
      await db.from("calendar_sync_links").delete().eq("id", link.id);
      report.deleted++;
    } catch (e) {
      report.errors.push(`מחיקה: ${e instanceof Error ? e.message : "שגיאה"}`);
    }
  }
}

// ---------- run ----------

let inflight: Promise<SyncReport | null> | null = null;

/** Pulls Google's changes, then pushes the site's. Returns null when Google isn't connected. Never throws. */
export function syncCalendar(): Promise<SyncReport | null> {
  if (inflight) return inflight;
  inflight = run().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function run(): Promise<SyncReport | null> {
  const { config } = await loadGoogleConfig();
  if (!config) return null;

  const report: SyncReport = { ok: true, created: 0, updated: 0, deleted: 0, imported: 0, appliedFromGoogle: 0, errors: [] };
  const state = await readState();
  const db = supabaseAdmin();
  try {
    await saveSettings({ GCAL_LAST_SYNC: new Date().toISOString() }); // also keeps other requests from starting at the same moment
    const { data: linkRows } = await db.from("calendar_sync_links").select("*");
    const links = (linkRows ?? []) as Link[];

    const nextToken = await pull(config, links, report, state.GCAL_SYNC_TOKEN);
    await push(config, links, report);
    if (nextToken) await saveSettings({ GCAL_SYNC_TOKEN: nextToken });
  } catch (e) {
    report.errors.push(e instanceof Error ? e.message : "שגיאה לא ידועה");
  }
  report.ok = report.errors.length === 0;
  const summary = `נוספו ${report.created}, עודכנו ${report.updated}, נמחקו ${report.deleted}, יובאו מגוגל ${report.imported}, שונו לפי גוגל ${report.appliedFromGoogle}`;
  try {
    await saveSettings({ GCAL_LAST_SUMMARY: summary, GCAL_LAST_ERROR: report.errors.slice(0, 3).join(" | ") });
  } catch {
    // status is best effort
  }
  if (!report.ok) console.error("[calendar-sync]", report.errors);
  return report;
}

/** Runs a sync after the current response has been sent. Safe to call from any admin change. */
export function scheduleCalendarSync(): void {
  try {
    after(async () => {
      await syncCalendar();
    });
  } catch {
    // called outside a request: nothing to schedule
  }
}

/** Like scheduleCalendarSync, but only when the last sync is older than `maxAgeSeconds`. */
export function scheduleCalendarSyncIfStale(maxAgeSeconds = 120): void {
  try {
    after(async () => {
      const state = await readState();
      const last = state.GCAL_LAST_SYNC ? Date.parse(state.GCAL_LAST_SYNC) : 0;
      if (Date.now() - last < maxAgeSeconds * 1000) return;
      await syncCalendar();
    });
  } catch {
    // outside a request
  }
}

