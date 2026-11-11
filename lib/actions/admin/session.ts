"use server";

import { getAdminOrNull } from "@/lib/admin-auth";
import { logAdminEvent, logLoginFailure } from "@/lib/audit";

// The sign-in itself happens in the browser (Supabase client), so the login page
// reports the outcome here to get it into the audit log.
//
// These never redirect (the login page must not be sent anywhere by a logging call)
// and return false when the session cookie isn't visible yet, so the caller can retry.

export async function recordAdminLogin(): Promise<boolean> {
  const admin = await getAdminOrNull();
  if (!admin) return false;
  await logAdminEvent("login", { admin, entityType: "login", entityLabel: admin.email });
  return true;
}

export async function recordAdminLogout(): Promise<boolean> {
  const admin = await getAdminOrNull();
  if (!admin) return false;
  await logAdminEvent("logout", { admin, entityType: "login", entityLabel: admin.email });
  return true;
}

export async function recordFailedLogin(email: string): Promise<void> {
  await logLoginFailure(String(email ?? ""));
}
