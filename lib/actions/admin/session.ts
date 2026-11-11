"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { logAdminEvent, logLoginFailure } from "@/lib/audit";

// The sign-in itself happens in the browser (Supabase client), so the login page
// reports the outcome here to get it into the audit log.

export async function recordAdminLogin(): Promise<void> {
  const admin = await requireAdmin();
  await logAdminEvent("login", { admin, entityType: "login", entityLabel: admin.email });
}

export async function recordAdminLogout(): Promise<void> {
  const admin = await requireAdmin();
  await logAdminEvent("logout", { admin, entityType: "login", entityLabel: admin.email });
}

export async function recordFailedLogin(email: string): Promise<void> {
  await logLoginFailure(String(email ?? ""));
}
