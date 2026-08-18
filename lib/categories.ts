import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Locale } from "@/lib/dictionary";

export interface CategoryView {
  id: string;
  slug: string;
  labelHe: string;
  labelEn: string;
  sortOrder: number;
}

export function categoryLabel(category: CategoryView, locale: Locale): string {
  return locale === "en" ? category.labelEn : category.labelHe;
}

export async function getCategories(): Promise<CategoryView[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("categories")
    .select("id, slug, label_he, label_en, sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    labelHe: row.label_he,
    labelEn: row.label_en,
    sortOrder: row.sort_order,
  }));
}
