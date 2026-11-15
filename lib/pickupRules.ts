import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

// Days on which pickup is closed (see supabase/migrations/0030_pickup_rules.sql). Checked by the checkout calendar
// and again when an order is created, so a closed day can't be ordered by editing the page.

export interface PickupRule {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  /** 0 = Sunday ... 6 = Saturday; null = every day inside the date window. */
  weekdays: number[] | null;
  /** Products the rule applies to; null / empty = the whole shop. */
  productIds: string[] | null;
  message: string;
  messageEn: string;
  active: boolean;
}

export async function getPickupRules(onlyActive = false): Promise<PickupRule[]> {
  let query = supabaseAdmin()
    .from("pickup_rules")
    .select("id, name, start_date, end_date, weekdays, product_ids, message, message_en, active")
    .order("created_at", { ascending: true });
  if (onlyActive) query = query.eq("active", true);
  const { data } = await query;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name ?? "",
    startDate: r.start_date,
    endDate: r.end_date,
    weekdays: r.weekdays && r.weekdays.length > 0 ? r.weekdays.map(Number) : null,
    productIds: r.product_ids && r.product_ids.length > 0 ? r.product_ids : null,
    message: r.message ?? "",
    messageEn: r.message_en ?? "",
    active: r.active,
  }));
}

/** 0 = Sunday ... 6 = Saturday for a YYYY-MM-DD date (calendar arithmetic only, no time zones). */
export function weekdayOf(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

export function ruleCoversDate(rule: PickupRule, date: string): boolean {
  if (rule.startDate && date < rule.startDate) return false;
  if (rule.endDate && date > rule.endDate) return false;
  if (rule.weekdays && !rule.weekdays.includes(weekdayOf(date))) return false;
  return true;
}

/** Why pickup on `date` is closed for a cart with these products, or null if no rule closes it. */
export function closedReason(rules: PickupRule[], date: string, productIds: string[], locale: "he" | "en" = "he"): string | null {
  for (const rule of rules) {
    if (!rule.active || !ruleCoversDate(rule, date)) continue;
    if (rule.productIds && !rule.productIds.some((id) => productIds.includes(id))) continue;
    const message = locale === "en" && rule.messageEn ? rule.messageEn : rule.message;
    return message || (locale === "en" ? "Pickup is not available on this date." : "האיסוף לא אפשרי בתאריך הזה.");
  }
  return null;
}
