import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

// Connection details saved from the admin screen. They take priority over environment variables, so no Vercel edit
// or redeploy is needed. The table is never logged in the audit log (see SKIP_TABLES in lib/audit.ts).

export async function getSettings(names: string[]): Promise<Record<string, string>> {
  const { data } = await supabaseAdmin().from("integration_settings").select("name, value").in("name", names);
  return Object.fromEntries((data ?? []).map((r) => [r.name, String(r.value)]));
}

export async function saveSettings(values: Record<string, string>): Promise<{ error?: string }> {
  const rows = Object.entries(values).map(([name, value]) => ({ name, value, updated_at: new Date().toISOString() }));
  if (rows.length === 0) return {};
  const { error } = await supabaseAdmin().from("integration_settings").upsert(rows, { onConflict: "name" });
  return error ? { error: error.message } : {};
}
