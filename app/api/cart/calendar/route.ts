import { NextResponse } from "next/server";
import { getCartSessionId } from "@/lib/session";
import { getCart } from "@/lib/cart";
import { availabilityCalendar, type AvailabilityLine } from "@/lib/availability";
import { closedReason, getPickupRules } from "@/lib/pickupRules";
import { shiftIso, todayIsraelIso } from "@/lib/date";

const HORIZON_DAYS = 120;

export type CalendarDay = { state: "early" | "closed" | "stock" | "ok"; reason?: string };

/**
 * For every day from today on: can the current cart be picked up then?
 *  early  = before the earliest date the cart's preparation time allows
 *  closed = a pickup rule closes the day (whole shop, or a product in the cart)
 *  stock  = a product in the cart has no stock / its daily limit is used up
 *  ok     = pickup works and everything in the cart is available
 */
export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "he";
  const items = await getCart(await getCartSessionId());
  const today = todayIsraelIso();
  const last = shiftIso(today, HORIZON_DAYS);
  const minDate = shiftIso(today, Math.max(0, ...items.map((i) => i.leadTimeDays)));

  const lines: AvailabilityLine[] = items.map((i) => ({
    productSizeId: i.productSizeId,
    productId: i.productId,
    productName: i.productName,
    sizeLabel: i.sizeLabel,
    qty: i.qty,
  }));
  const [rules, problems] = await Promise.all([getPickupRules(true), availabilityCalendar(lines, minDate, last)]);
  const productIds = items.map((i) => i.productId);

  const days: Record<string, CalendarDay> = {};
  for (let date = today; date <= last; date = shiftIso(date, 1)) {
    if (date < minDate) {
      days[date] = { state: "early" };
      continue;
    }
    const closed = closedReason(rules, date, productIds, locale);
    if (closed) {
      days[date] = { state: "closed", reason: closed };
      continue;
    }
    const stock = problems.get(date) ?? [];
    days[date] = stock.length > 0 ? { state: "stock", reason: stock[0] } : { state: "ok" };
  }
  return NextResponse.json({ today, minDate, last, days });
}
