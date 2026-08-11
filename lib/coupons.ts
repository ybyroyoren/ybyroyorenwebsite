import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface CouponValidationResult {
  valid: boolean;
  couponId?: string;
  discountPct?: number;
  message: string;
}

export async function validateCoupon(code: string): Promise<CouponValidationResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false, message: "" };

  const db = supabaseAdmin();
  const { data } = await db
    .from("coupons")
    .select("id, discount_pct, active")
    .eq("code", trimmed)
    .maybeSingle();

  if (!data || !data.active) {
    return { valid: false, message: "קוד קופון לא תקין" };
  }

  return {
    valid: true,
    couponId: data.id,
    discountPct: data.discount_pct,
    message: `קוד "${trimmed}" הופעל — ${(data.discount_pct * 100).toFixed(0)}% הנחה`,
  };
}
