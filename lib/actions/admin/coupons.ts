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
  const usageLimitType = String(formData.get("usageLimitType") ?? "unlimited");
  const usageLimitCount = Number(formData.get("usageLimitCount") ?? 0);
  const appliesTo = String(formData.get("appliesTo") ?? "shop");

  if (!code || !(discountPct > 0 && discountPct <= 1)) return;
  if (!["single", "limited", "unlimited"].includes(usageLimitType)) return;
  if (!["shop", "meals", "both"].includes(appliesTo)) return;
  if (usageLimitType === "limited" && !(usageLimitCount > 0)) return;

  await db.from("coupons").insert({
    code,
    discount_pct: discountPct,
    applies_to: appliesTo,
    usage_limit_type: usageLimitType,
    usage_limit_count: usageLimitType === "limited" ? usageLimitCount : null,
  });
  revalidatePath("/admin/coupons");
}

/** Where a coupon works: the shop, open-meal deposits, or both. */
export async function setCouponScope(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  const appliesTo = String(formData.get("appliesTo") ?? "");
  if (!id || !["shop", "meals", "both"].includes(appliesTo)) return;
  await supabaseAdmin().from("coupons").update({ applies_to: appliesTo }).eq("id", id);
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
