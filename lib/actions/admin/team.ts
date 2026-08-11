"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { AdminRole } from "@/lib/supabase/types";

const VALID_ROLES: AdminRole[] = ["owner", "kitchen", "sales"];

export async function createTeamMember(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return { error: null };
  const db = supabaseAdmin();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as AdminRole;

  if (!email) return { error: "נא להזין אימייל" };
  if (password.length < 8) return { error: "הסיסמה חייבת להכיל לפחות 8 תווים" };
  if (!VALID_ROLES.includes(role)) return { error: "תפקיד לא תקין" };

  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    return { error: error?.message ?? "יצירת המשתמש נכשלה" };
  }

  const { error: profileError } = await db.from("admin_profiles").insert({ id: data.user.id, role });
  if (profileError) {
    await db.auth.admin.deleteUser(data.user.id);
    return { error: profileError.message };
  }

  revalidatePath("/admin/team");
  return { error: null };
}

export async function updateTeamMemberRole(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as AdminRole;
  if (!id || !VALID_ROLES.includes(role)) return;

  await db.from("admin_profiles").update({ role }).eq("id", id);
  revalidatePath("/admin/team");
}

export async function revokeTeamMember(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id || id === admin.id) return;

  await db.from("admin_profiles").delete().eq("id", id);
  await db.auth.admin.deleteUser(id);
  revalidatePath("/admin/team");
}
