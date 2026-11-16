import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

export type CouponScope = "shop" | "meals";

export interface CouponValidationResult {
  valid: boolean;
  couponId?: string;
  discountPct?: number;
  message: string;
}

export async function validateCoupon(code: string, scope: CouponScope = "shop"): Promise<CouponValidationResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false, message: "" };

  const db = supabaseAdmin();
  const { data } = await db
    .from("coupons")
    .select("id, discount_pct, active, usage_limit_type, usage_limit_count, times_used, applies_to")
    .eq("code", trimmed)
    .maybeSingle();

  if (!data || !data.active) {
    return { valid: false, message: "קוד קופון לא תקין" };
  }

  if (data.applies_to !== "both" && data.applies_to !== scope) {
    return { valid: false, message: scope === "meals" ? "הקוד הזה לא תקף לארוחות פתוחות" : "הקוד הזה לא תקף לחנות" };
  }

  const limit =
    data.usage_limit_type === "single"
      ? 1
      : data.usage_limit_type === "limited"
        ? data.usage_limit_count
        : null;
  if (limit !== null && data.times_used >= limit) {
    return { valid: false, message: "קוד הקופון מוצה" };
  }

  return {
    valid: true,
    couponId: data.id,
    discountPct: data.discount_pct,
    message:
      scope === "meals"
        ? `קוד "${trimmed}" הופעל — ${(data.discount_pct * 100).toFixed(0)}% הנחה על המקדמה`
        : `קוד "${trimmed}" הופעל — ${(data.discount_pct * 100).toFixed(0)}% הנחה`,
  };
}

/** Counts one use of a coupon (called when the order / registration is paid). */
export async function recordCouponUse(couponId: string): Promise<void> {
  const db = supabaseAdmin();
  const { data: coupon } = await db.from("coupons").select("times_used").eq("id", couponId).maybeSingle();
  if (coupon) await db.from("coupons").update({ times_used: coupon.times_used + 1 }).eq("id", couponId);
}
