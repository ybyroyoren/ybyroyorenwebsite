"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function createCoupon(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const discountPct = Number(formData.get("discountPct") ?? 0) / 100;
  if (!code || !(discountPct > 0 && discountPct <= 1)) return;

  await db.from("coupons").insert({ code, discount_pct: discountPct });
  revalidatePath("/admin/coupons");
}

export async function toggleCoupon(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const id = String(formData.get("id") ?? "");
  const current = formData.get("active") === "true";
  if (!id) return;

  await db.from("coupons").update({ active: !current }).eq("id", id);
  revalidatePath("/admin/coupons");
}

export async function deleteCoupon(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.from("coupons").delete().eq("id", id);
  revalidatePath("/admin/coupons");
}
