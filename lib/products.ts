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
  description: string;
  category: string;
  allergens: string;
  imageUrls: string[];
  leadTimeDays: number;
  sizes: ProductSizeView[];
}

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  allergens: string;
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

function mapProduct(row: ProductRow): ProductView {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    allergens: row.allergens,
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
    .select(
      "id, slug, name, description, category, allergens, image_urls, lead_time_days, sort_order, product_sizes(id, label, price_before_vat, stock_status, sort_order)"
    )
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ProductRow[]).map(mapProduct);
}

export async function getProductBySlug(slug: string): Promise<ProductView | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("products")
    .select(
      "id, slug, name, description, category, allergens, image_urls, lead_time_days, product_sizes(id, label, price_before_vat, stock_status, sort_order)"
    )
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapProduct(data as unknown as ProductRow);
}
