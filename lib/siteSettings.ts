import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/cache";

// Minimum order for the shop, in shekels, VAT included, counted on the products before any coupon discount (the
// greeting-card extra is not part of it). 0 = no minimum. Stored in site_settings; changes expire the cache tag.

export const MIN_ORDER_KEY = "min_order";

async function fetchMinOrder(): Promise<number> {
  try {
    const { data } = await supabaseAdmin().from("site_settings").select("value").eq("name", MIN_ORDER_KEY).maybeSingle();
    const value = Number(data?.value);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0; // table not there yet: no minimum
  }
}

/** Cached for the public pages and the cart (the admin screen reads it fresh via fetchMinOrderFresh). */
export const getMinOrder = unstable_cache(fetchMinOrder, ["min-order"], { tags: [CACHE_TAGS.settings], revalidate: 300 });
export const fetchMinOrderFresh = fetchMinOrder;

export async function saveMinOrder(amount: number): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin()
    .from("site_settings")
    .upsert({ name: MIN_ORDER_KEY, value: String(amount), updated_at: new Date().toISOString() }, { onConflict: "name" });
  return error ? { error: error.message } : {};
}
