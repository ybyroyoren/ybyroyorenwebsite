// Coupon arithmetic shared by the server (orders, meal registrations) and the pages that preview the result.
// A coupon is a percentage (0-1) or a fixed amount in shekels.

import { VAT_RATE } from "@/lib/pricing";

export interface CouponValue {
  kind: "percent" | "amount";
  /** 0-1, for kind "percent". */
  pct: number;
  /** Shekels, for kind "amount". */
  amount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** How much a coupon takes off `base` (never more than `base`). */
export function discountOf(base: number, coupon: CouponValue): number {
  if (!(base > 0)) return 0;
  const raw = coupon.kind === "percent" ? base * coupon.pct : coupon.amount;
  return round2(Math.min(base, Math.max(0, raw)));
}

/**
 * The shop works with a percentage taken off the amount before VAT. A fixed-amount coupon is an amount the customer
 * sees, VAT included, so it is turned into the equivalent percentage of this cart.
 */
export function pctForCart(subtotalBeforeVat: number, coupon: CouponValue): number {
  if (coupon.kind === "percent") return coupon.pct;
  if (!(subtotalBeforeVat > 0)) return 0;
  return Math.min(1, coupon.amount / (1 + VAT_RATE) / subtotalBeforeVat);
}
