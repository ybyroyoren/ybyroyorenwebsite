"use server";

import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAdminOrNull } from "@/lib/admin-auth";
import { logAdminEvent } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/resend";

const RESET_REQUESTS_PER_HOUR = 3;

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Sends an admin a password-reset e-mail. The answer is always the same, whether or not the address
 * belongs to an admin, so the form can't be used to find out who has an account. The e-mail is sent by
 * the site itself (Resend, from the site's own address) with a one-time link to /admin/reset-password.
 */
export async function requestPasswordReset(email: string): Promise<{ ok: true }> {
  const address = String(email ?? "").trim().toLowerCase();
  if (!address || address.length > 200 || !address.includes("@")) return { ok: true };

  try {
    const db = supabaseAdmin();

    // At most a few requests per address per hour.
    const { count } = await db
      .from("admin_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("entity_type", "password_reset")
      .eq("entity_label", address)
      .gte("created_at", new Date(Date.now() - 3600 * 1000).toISOString());
    if ((count ?? 0) >= RESET_REQUESTS_PER_HOUR) return { ok: true };

    const { data, error } = await db.auth.admin.generateLink({ type: "recovery", email: address });
    const user = data?.user;
    const tokenHash = data?.properties?.hashed_token;
    if (error || !user || !tokenHash) return { ok: true }; // no such user

    // Only people with an admin profile can use the admin panel at all.
    const { data: profile } = await db.from("admin_profiles").select("id").eq("id", user.id).maybeSingle();
    if (!profile) return { ok: true };

    const link = `${await siteOrigin()}/admin/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
    await sendPasswordResetEmail({ to: address, link });
    await logAdminEvent("other", { admin: null, entityType: "password_reset", entityLabel: address });
  } catch (err) {
    console.error("[password-reset] failed", err);
  }
  return { ok: true };
}

/** Notes a password change / reset in the activity log (the signed-in admin only; never the password itself). */
export async function recordPasswordChange(kind: "change" | "reset"): Promise<boolean> {
  const admin = await getAdminOrNull();
  if (!admin) return false;
  await logAdminEvent("update", {
    admin,
    entityType: "team",
    entityId: admin.id,
    entityLabel: admin.email,
    changes: { password: [null, kind === "reset" ? "שוחזרה בעזרת אימייל" : "הוחלפה"] },
  });
  return true;
}
