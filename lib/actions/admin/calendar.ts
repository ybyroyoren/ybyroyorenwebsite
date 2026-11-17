"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, SECTION_ROLES } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { entryToRow } from "@/lib/calendarEntries";
import { getSettings, saveSettings } from "@/lib/integrationSettings";
import { getCalendar, loadGoogleConfig } from "@/lib/googleCalendar";
import { scheduleCalendarSync, syncCalendar } from "@/lib/calendarSync";

async function requireCalendarUser() {
  const admin = await requireAdmin();
  if (!SECTION_ROLES.calendar.includes(admin.role)) redirect("/admin");
  return admin;
}

async function requireOwner() {
  const admin = await requireAdmin();
  if (admin.role !== "owner") redirect("/admin/calendar");
  return admin;
}

const monthOf = (date: string) => date.slice(0, 7);

// ---------- meetings, notes and blocked dates ----------

export async function saveCalendarEntry(formData: FormData): Promise<void> {
  await requireCalendarUser();
  const id = String(formData.get("id") ?? "");
  const input = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]));
  const result = entryToRow(input);
  const back = id ? `/admin/calendar/entry?id=${id}` : `/admin/calendar/entry?date=${encodeURIComponent(String(input.startDate ?? ""))}&kind=${encodeURIComponent(String(input.kind ?? "meeting"))}`;
  if ("error" in result) redirect(`${back}&error=${encodeURIComponent(result.error)}`);

  const db = supabaseAdmin();
  if (id) {
    const { error } = await db.from("calendar_entries").update(result.row).eq("id", id);
    if (error) redirect(`${back}&error=${encodeURIComponent("שמירה נכשלה")}`);
  } else {
    const { error } = await db.from("calendar_entries").insert(result.row);
    if (error) redirect(`${back}&error=${encodeURIComponent("שמירה נכשלה")}`);
  }
  revalidatePath("/admin/calendar");
  scheduleCalendarSync();
  redirect(`/admin/calendar?m=${monthOf(String(result.row.start_date))}`);
}

export async function deleteCalendarEntry(formData: FormData): Promise<void> {
  await requireCalendarUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabaseAdmin().from("calendar_entries").delete().eq("id", id);
  revalidatePath("/admin/calendar");
  scheduleCalendarSync(); // the sync notices the missing entry and removes its Google copy
  redirect("/admin/calendar");
}

// ---------- Google Calendar connection ----------

/** Saves the calendar id and the service-account key. Empty fields are left as they were; the key is never shown back. */
export async function saveGoogleSettings(formData: FormData): Promise<void> {
  await requireOwner();
  const calendarId = String(formData.get("calendarId") ?? "").trim();
  const key = String(formData.get("key") ?? "").trim();

  if (key) {
    try {
      const parsed = JSON.parse(key) as { client_email?: string; private_key?: string };
      if (!parsed.client_email || !parsed.private_key) throw new Error("missing");
    } catch {
      redirect("/admin/calendar?google=badkey#google");
    }
  }

  const before = await getSettings(["GOOGLE_CALENDAR_ID"]);
  const values: Record<string, string> = {};
  if (calendarId) values.GOOGLE_CALENDAR_ID = calendarId;
  if (key) values.GOOGLE_SERVICE_ACCOUNT_JSON = key;
  if (Object.keys(values).length > 0) {
    const { error } = await saveSettings(values);
    if (error) redirect("/admin/calendar?google=failed#google");
  }

  // A different calendar means every earlier link points at events that are not there: start clean.
  if (calendarId && before.GOOGLE_CALENDAR_ID && before.GOOGLE_CALENDAR_ID !== calendarId) {
    await supabaseAdmin().from("calendar_sync_links").delete().not("id", "is", null);
    await saveSettings({ GCAL_SYNC_TOKEN: "" });
  }
  revalidatePath("/admin/calendar");
  redirect("/admin/calendar?google=saved#google");
}

export async function testGoogleConnection(): Promise<void> {
  await requireOwner();
  const { config, problem } = await loadGoogleConfig();
  if (!config) redirect(`/admin/calendar?google=missing&msg=${encodeURIComponent(problem ?? "")}#google`);
  try {
    const info = await getCalendar(config);
    redirect(`/admin/calendar?google=ok&msg=${encodeURIComponent(info.summary)}#google`);
  } catch (e) {
    // redirect() throws a control-flow signal that must pass through
    if (e && typeof e === "object" && "digest" in e) throw e;
    const msg = e instanceof Error ? e.message : "שגיאה";
    redirect(`/admin/calendar?google=error&msg=${encodeURIComponent(msg.slice(0, 240))}#google`);
  }
}

export async function syncCalendarNow(): Promise<void> {
  await requireOwner();
  const report = await syncCalendar();
  revalidatePath("/admin/calendar");
  if (!report) redirect("/admin/calendar?google=missing#google");
  redirect(`/admin/calendar?google=${report.ok ? "synced" : "syncerror"}#google`);
}

export async function disconnectGoogle(): Promise<void> {
  await requireOwner();
  await saveSettings({ GOOGLE_CALENDAR_ID: "", GOOGLE_SERVICE_ACCOUNT_JSON: "", GCAL_SYNC_TOKEN: "", GCAL_LAST_ERROR: "" });
  await supabaseAdmin().from("calendar_sync_links").delete().not("id", "is", null);
  revalidatePath("/admin/calendar");
  redirect("/admin/calendar?google=disconnected#google");
}
