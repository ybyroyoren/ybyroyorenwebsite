import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/cache";
import type { AllergenTag } from "@/lib/allergenTags";

export interface AllergenRow extends AllergenTag {
  sortOrder: number;
}

// The owner's full allergen list (admin editor and the shop filter).
export const getAllergens = unstable_cache(
  async (): Promise<AllergenRow[]> => {
    const { data, error } = await supabaseAdmin()
      .from("allergens")
      .select("id, label_he, label_en, color, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      labelHe: r.label_he,
      labelEn: r.label_en,
      color: r.color,
      sortOrder: r.sort_order,
    }));
  },
  ["allergens"],
  { tags: [CACHE_TAGS.products], revalidate: 300 }
);
