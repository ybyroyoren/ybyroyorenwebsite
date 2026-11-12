import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/cache";
import type { AllergenTag } from "@/lib/allergenTags";

export interface ProductSizeView {
  id: string;
  label: string;
  priceBeforeVat: number;
  /** Sold out: set by hand, or because the stock quantity ran out. */
  stockStatus: "in_stock" | "out_of_stock";
  /** Units left when a stock quantity is set (never negative); null = no stock limit. */
  stockRemaining: number | null;
}

export interface ProductView {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  description: string;
  descriptionEn: string | null;
  /** Slugs of every shop category the product is listed under (in the owner's category order). */
  categories: string[];
  /** Owner-chosen allergen tags (colored), in the owner's list order. */
  allergens: AllergenTag[];
  imageUrls: string[];
  leadTimeDays: number;
  sizes: ProductSizeView[];
  /** Index into `sizes` of the size that is preselected (the owner's choice; the first one if none was picked). */
  defaultSizeIndex: number;
}

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  name_en: string | null;
  description: string;
  description_en: string | null;
  product_categories: { categories: { slug: string; sort_order: number } | null }[];
  product_allergens: {
    allergens: { id: string; label_he: string; label_en: string; color: string; sort_order: number } | null;
  }[];
  image_urls: string[];
  lead_time_days: number;
  product_sizes: {
    id: string;
    label: string;
    price_before_vat: number;
    stock_status: "in_stock" | "out_of_stock";
    sort_order: number;
    is_default: boolean;
  }[];
}

const PRODUCT_SELECT =
  "id, slug, name, name_en, description, description_en, image_urls, lead_time_days, product_categories(categories(slug, sort_order)), product_allergens(allergens(id, label_he, label_en, color, sort_order)), product_sizes(id, label, price_before_vat, stock_status, sort_order, is_default)";

function mapProduct(row: ProductRow, remainingBySize: Map<string, number>): ProductView {
  const ordered = [...row.product_sizes].sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en,
    description: row.description,
    descriptionEn: row.description_en,
    categories: row.product_categories
      .flatMap((pc) => (pc.categories ? [pc.categories] : []))
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => c.slug),
    allergens: row.product_allergens
      .flatMap((pa) => (pa.allergens ? [pa.allergens] : []))
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((a) => ({ id: a.id, labelHe: a.label_he, labelEn: a.label_en, color: a.color })),
    imageUrls: row.image_urls,
    leadTimeDays: row.lead_time_days,
    sizes: ordered.map((s) => {
      const remaining = remainingBySize.has(s.id) ? Math.max(0, remainingBySize.get(s.id)!) : null;
      return {
        id: s.id,
        label: s.label,
        priceBeforeVat: s.price_before_vat,
        stockStatus: s.stock_status === "out_of_stock" || remaining === 0 ? ("out_of_stock" as const) : ("in_stock" as const),
        stockRemaining: remaining,
      };
    }),
    defaultSizeIndex: Math.max(0, ordered.findIndex((s) => s.is_default)),
  };
}

/** Units left per size, for the sizes that have a stock quantity (see the product_size_stock view). */
async function fetchRemainingBySize(): Promise<Map<string, number>> {
  const { data } = await supabaseAdmin().from("product_size_stock").select("product_size_id, remaining");
  return new Map((data ?? []).map((r) => [r.product_size_id as string, Number(r.remaining)]));
}

export const getActiveProducts = unstable_cache(
  async (): Promise<ProductView[]> => {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("products")
      .select(`${PRODUCT_SELECT}, sort_order`)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    const remaining = await fetchRemainingBySize();
    return ((data ?? []) as unknown as ProductRow[]).map((row) => mapProduct(row, remaining));
  },
  ["active-products"],
  { tags: [CACHE_TAGS.products], revalidate: 300 }
);

// Dynamic route params containing non-ASCII characters (Hebrew slugs) are
// not reliably URL-decoded by the time they reach a page component in this
// Next.js version — Route Handlers decode them, but page params sometimes
// arrive still percent-encoded (e.g. "%D7%A2..."). decodeURIComponent on an
// already-decoded string is a harmless no-op, so this is safe either way.
function safeDecodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export const getProductBySlug = unstable_cache(
  async (slug: string): Promise<ProductView | null> => {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", safeDecodeSlug(slug))
      .eq("active", true)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return mapProduct(data as unknown as ProductRow, await fetchRemainingBySize());
  },
  ["product-by-slug"],
  { tags: [CACHE_TAGS.products], revalidate: 300 }
);
