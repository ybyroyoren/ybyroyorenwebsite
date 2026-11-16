"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function createCoupon(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const kind = String(formData.get("kind") ?? "percent");
  const value = Number(formData.get("value") ?? 0);
  const usageLimitType = String(formData.get("usageLimitType") ?? "unlimited");
  const usageLimitCount = Number(formData.get("usageLimitCount") ?? 0);
  const appliesTo = String(formData.get("appliesTo") ?? "shop");
  const mealTarget = String(formData.get("mealTarget") ?? "deposit");

  if (!code || !["percent", "amount"].includes(kind)) return;
  // A percentage is 1-100; an amount is any positive number of shekels.
  if (kind === "percent" ? !(value >= 1 && value <= 100) : !(value > 0 && value <= 100000)) return;
  if (!["single", "limited", "unlimited"].includes(usageLimitType)) return;
  if (usageLimitType === "limited" && !(usageLimitCount > 0)) return;
  if (!["shop", "meals", "both"].includes(appliesTo)) return;
  if (!["deposit", "balance"].includes(mealTarget)) return;

  await db.from("coupons").insert({
    code,
    kind,
    discount_pct: kind === "percent" ? value / 100 : null,
    discount_amount: kind === "amount" ? Math.round(value * 100) / 100 : null,
    applies_to: appliesTo,
    meal_target: mealTarget,
    usage_limit_type: usageLimitType,
    usage_limit_count: usageLimitType === "limited" ? usageLimitCount : null,
  });
  revalidatePath("/admin/coupons");
}

export async function setCouponScope(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  const appliesTo = String(formData.get("appliesTo") ?? "");
  const mealTarget = String(formData.get("mealTarget") ?? "");
  if (!id || !["shop", "meals", "both"].includes(appliesTo) || !["deposit", "balance"].includes(mealTarget)) return;
  await supabaseAdmin().from("coupons").update({ applies_to: appliesTo, meal_target: mealTarget }).eq("id", id);
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
