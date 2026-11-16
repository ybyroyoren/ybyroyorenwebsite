import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

export type CouponScope = "shop" | "meals";

export interface CouponValidationResult {
  valid: boolean;
  couponId?: string;
  /** What the coupon takes off: a percentage (0-1) or a fixed amount in shekels. */
  kind?: "percent" | "amount";
  discountPct?: number;
  discountAmount?: number;
  /** For open meals: whether it comes off the deposit or off the balance paid at the table. */
  mealTarget?: "deposit" | "balance";
  message: string;
}

export async function validateCoupon(code: string, scope: CouponScope = "shop"): Promise<CouponValidationResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false, message: "" };

  const db = supabaseAdmin();
  const { data } = await db
    .from("coupons")
    .select("id, kind, discount_pct, discount_amount, meal_target, active, usage_limit_type, usage_limit_count, times_used, applies_to")
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

  const kind = data.kind === "amount" ? "amount" : "percent";
  const what = kind === "amount" ? `₪${Number(data.discount_amount).toLocaleString("he-IL")}` : `${(Number(data.discount_pct) * 100).toFixed(0)}%`;
  const where =
    scope === "meals" ? (data.meal_target === "balance" ? " על יתרת התשלום (מעבר למקדמה)" : " על המקדמה") : "";
  return {
    valid: true,
    couponId: data.id,
    kind,
    discountPct: Number(data.discount_pct ?? 0),
    discountAmount: Number(data.discount_amount ?? 0),
    mealTarget: data.meal_target === "balance" ? "balance" : "deposit",
    message: `קוד "${trimmed}" הופעל — ${what} הנחה${where}`,
  };
}

/** The coupon as plain numbers for the arithmetic helpers. */
export function couponValueOf(result: CouponValidationResult): { kind: "percent" | "amount"; pct: number; amount: number } {
  return { kind: result.kind ?? "percent", pct: result.discountPct ?? 0, amount: result.discountAmount ?? 0 };
}

/** Counts one use of a coupon (called when the order / registration is paid). */
export async function recordCouponUse(couponId: string): Promise<void> {
  const db = supabaseAdmin();
  const { data: coupon } = await db.from("coupons").select("times_used").eq("id", couponId).maybeSingle();
  if (coupon) await db.from("coupons").update({ times_used: coupon.times_used + 1 }).eq("id", couponId);
}
