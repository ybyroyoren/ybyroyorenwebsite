import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSettings } from "@/lib/integrationSettings";
import { syncCalendar } from "@/lib/calendarSync";

// Called every 15 minutes by the database's own scheduler (supabase/migrations/0041_calendar_sync_schedule.sql), so
// Google Calendar changes reach the site even when nobody has the calendar page open. The shared secret lives in
// integration_settings (CALENDAR_CRON_SECRET), created by that migration.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  let secret = "";
  try {
    secret = (await getSettings(["CALENDAR_CRON_SECRET"])).CALENDAR_CRON_SECRET ?? "";
  } catch {
    // table not there
  }
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!sameSecret(given, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const report = await syncCalendar();
  if (!report) return NextResponse.json({ ok: true, skipped: "google not connected" });
  return NextResponse.json({
    ok: report.ok,
    created: report.created,
    updated: report.updated,
    deleted: report.deleted,
    imported: report.imported,
    appliedFromGoogle: report.appliedFromGoogle,
    errors: report.errors.length,
  });
}
