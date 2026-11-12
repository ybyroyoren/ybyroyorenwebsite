import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { shiftIso } from "@/lib/date";

export interface AvailabilityLine {
  productSizeId: string;
  productId: string;
  productName: string;
  sizeLabel: string;
  qty: number;
}

/** Hebrew date for messages: 2026-12-01 -> 01.12. */
const short = (iso: string) => iso.split("-").reverse().slice(0, 2).join(".");

interface Loaded {
  limitByProduct: Map<string, number>;
  usage: Map<string, number>; // `${productId}|${date}` -> units already taken
  remainingBySize: Map<string, number>;
}

async function load(lines: AvailabilityLine[], fromDate: string, toDate: string): Promise<Loaded> {
  const db = supabaseAdmin();
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const sizeIds = [...new Set(lines.map((l) => l.productSizeId))];
  const [{ data: products }, { data: usage }, { data: stock }] = await Promise.all([
    db.from("products").select("id, daily_limit").in("id", productIds),
    db.from("product_day_usage").select("product_id, pickup_date, qty").in("product_id", productIds).gte("pickup_date", fromDate).lte("pickup_date", toDate),
    db.from("product_size_stock").select("product_size_id, remaining").in("product_size_id", sizeIds),
  ]);
  return {
    limitByProduct: new Map((products ?? []).filter((p) => p.daily_limit !== null).map((p) => [p.id as string, Number(p.daily_limit)])),
    usage: new Map((usage ?? []).map((u) => [`${u.product_id}|${u.pickup_date}`, Number(u.qty)])),
    remainingBySize: new Map((stock ?? []).map((s) => [s.product_size_id as string, Number(s.remaining)])),
  };
}

function dailyProblems(lines: AvailabilityLine[], date: string, data: Loaded, ownOrderIncluded: boolean): string[] {
  const problems: string[] = [];
  const requestedByProduct = new Map<string, { name: string; qty: number }>();
  for (const l of lines) {
    const cur = requestedByProduct.get(l.productId) ?? { name: l.productName, qty: 0 };
    cur.qty += l.qty;
    requestedByProduct.set(l.productId, cur);
  }
  for (const [productId, { name, qty }] of requestedByProduct) {
    const limit = data.limitByProduct.get(productId);
    if (limit === undefined) continue;
    const used = data.usage.get(`${productId}|${date}`) ?? 0;
    const total = ownOrderIncluded ? used : used + qty; // after the order is saved, `used` already includes it
    if (total > limit) {
      const left = Math.max(0, limit - (ownOrderIncluded ? used - qty : used));
      problems.push(
        left <= 0
          ? `הכמות המקסימלית של "${name}" ליום ${short(date)} כבר תפוסה. אפשר לבחור תאריך איסוף אחר.`
          : `ליום ${short(date)} נשארו רק ${left} יחידות של "${name}" (הזמנתם ${qty}). אפשר להקטין את הכמות או לבחור תאריך אחר.`
      );
    }
  }
  return problems;
}

function stockProblems(lines: AvailabilityLine[], data: Loaded, ownOrderIncluded: boolean): string[] {
  const problems: string[] = [];
  const qtyBySize = new Map<string, AvailabilityLine>();
  for (const l of lines) qtyBySize.set(l.productSizeId, { ...l, qty: (qtyBySize.get(l.productSizeId)?.qty ?? 0) + l.qty });
  for (const l of qtyBySize.values()) {
    const remaining = data.remainingBySize.get(l.productSizeId);
    if (remaining === undefined) continue;
    const label = l.sizeLabel ? `${l.productName} (${l.sizeLabel})` : l.productName;
    if (ownOrderIncluded ? remaining < 0 : l.qty > remaining) {
      const left = Math.max(0, ownOrderIncluded ? remaining + l.qty : remaining);
      problems.push(left <= 0 ? `"${label}" אזל מהמלאי.` : `במלאי נשארו רק ${left} יחידות של "${label}".`);
    }
  }
  return problems;
}

/**
 * Problems that stop this cart from being ordered for `pickupDate`: stock that ran out, and products whose
 * daily limit for that date is already used up. `ownOrderIncluded` = the order is already saved (the final
 * re-check after saving, which also catches two customers taking the last units at the same moment).
 */
export async function checkAvailability(lines: AvailabilityLine[], pickupDate: string, ownOrderIncluded = false): Promise<string[]> {
  if (lines.length === 0) return [];
  const data = await load(lines, pickupDate, pickupDate);
  return [...stockProblems(lines, data, ownOrderIncluded), ...dailyProblems(lines, pickupDate, data, ownOrderIncluded)];
}

/** The next dates (from `fromDate`) on which the whole cart fits within every daily limit. */
export async function nextAvailableDates(lines: AvailabilityLine[], fromDate: string, count = 3, horizonDays = 45): Promise<string[]> {
  if (lines.length === 0) return [];
  const data = await load(lines, fromDate, shiftIso(fromDate, horizonDays));
  const out: string[] = [];
  for (let i = 0; i <= horizonDays && out.length < count; i++) {
    const date = shiftIso(fromDate, i);
    if (dailyProblems(lines, date, data, false).length === 0) out.push(date);
  }
  return out;
}
