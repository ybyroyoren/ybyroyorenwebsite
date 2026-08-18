import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface ProductSizeView {
  id: string;
  label: string;
  priceBeforeVat: number;
  stockStatus: "in_stock" | "out_of_stock";
}

export interface ProductView {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  description: string;
  descriptionEn: string | null;
  category: string;
  allergens: string;
  allergensEn: string | null;
  imageUrls: string[];
  leadTimeDays: number;
  sizes: ProductSizeView[];
}

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  name_en: string | null;
  description: string;
  description_en: string | null;
  category: string;
  allergens: string;
  allergens_en: string | null;
  image_urls: string[];
  lead_time_days: number;
  product_sizes: {
    id: string;
    label: string;
    price_before_vat: number;
    stock_status: "in_stock" | "out_of_stock";
    sort_order: number;
  }[];
}

const PRODUCT_SELECT =
  "id, slug, name, name_en, description, description_en, category, allergens, allergens_en, image_urls, lead_time_days, product_sizes(id, label, price_before_vat, stock_status, sort_order)";

function mapProduct(row: ProductRow): ProductView {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en,
    description: row.description,
    descriptionEn: row.description_en,
    category: row.category,
    allergens: row.allergens,
    allergensEn: row.allergens_en,
    imageUrls: row.image_urls,
    leadTimeDays: row.lead_time_days,
    sizes: [...row.product_sizes]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({
        id: s.id,
        label: s.label,
        priceBeforeVat: s.price_before_vat,
        stockStatus: s.stock_status,
      })),
  };
}

export async function getActiveProducts(): Promise<ProductView[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("products")
    .select(`${PRODUCT_SELECT}, sort_order`)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ProductRow[]).map(mapProduct);
}

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

export async function getProductBySlug(slug: string): Promise<ProductView | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", safeDecodeSlug(slug))
    .eq("active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapProduct(data as unknown as ProductRow);
}
