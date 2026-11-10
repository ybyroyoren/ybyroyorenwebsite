"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { expireCatalog } from "@/lib/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createUploadTicket, deleteImage, type UploadTicket } from "@/lib/storage";

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || `product-${Date.now()}`
  );
}

/** The ticked categories replace whatever categories the product was in before. */
async function setProductCategories(
  db: ReturnType<typeof supabaseAdmin>,
  productId: string,
  raw: FormDataEntryValue[]
): Promise<void> {
  const categoryIds = raw.map(String).filter(Boolean);
  await db.from("product_categories").delete().eq("product_id", productId);
  if (categoryIds.length > 0) {
    await db
      .from("product_categories")
      .insert(categoryIds.map((category_id) => ({ product_id: productId, category_id })));
  }
}

export async function createProduct(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const descriptionEn = String(formData.get("descriptionEn") ?? "").trim();
  const sizeLabel = String(formData.get("sizeLabel") ?? "").trim();
  const sizePrice = Number(formData.get("sizePrice") ?? 0);
  const leadTimeDays = Number(formData.get("leadTimeDays") ?? 0);

  if (!name || !sizeLabel || !(sizePrice > 0)) return;

  const { data: last } = await db
    .from("products")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: product, error } = await db
    .from("products")
    .insert({
      sort_order: (last?.sort_order ?? -1) + 1,
      name,
      name_en: nameEn || null,
      slug: slugify(name),
      description,
      description_en: descriptionEn || null,
      lead_time_days: Math.max(0, leadTimeDays),
    })
    .select("id")
    .single();

  if (error || !product) return;

  await setProductCategories(db, product.id, formData.getAll("categoryIds"));

  await db.from("product_sizes").insert({
    product_id: product.id,
    label: sizeLabel,
    price_before_vat: sizePrice,
  });

  revalidatePath("/admin/products");
  expireCatalog();
}

export async function updateProduct(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .from("products")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      name_en: String(formData.get("nameEn") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim(),
      description_en: String(formData.get("descriptionEn") ?? "").trim() || null,
      active: formData.get("active") === "on",
      lead_time_days: Math.max(0, Number(formData.get("leadTimeDays") ?? 0)),
    })
    .eq("id", id);

  await setProductCategories(db, id, formData.getAll("categoryIds"));

  // Allergen tags: the ticked ones replace whatever was set before.
  const allergenIds = formData.getAll("allergenIds").map(String).filter(Boolean);
  await db.from("product_allergens").delete().eq("product_id", id);
  if (allergenIds.length > 0) {
    await db
      .from("product_allergens")
      .insert(allergenIds.map((allergen_id) => ({ product_id: id, allergen_id })));
  }

  revalidatePath("/admin/products");
  expireCatalog();
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.from("products").delete().eq("id", id);
  revalidatePath("/admin/products");
  expireCatalog();
}

export async function addProductSize(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const productId = String(formData.get("productId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  if (!productId || !label || !(price > 0)) return;

  const { data: last } = await db
    .from("product_sizes")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await db
    .from("product_sizes")
    .insert({ product_id: productId, label, price_before_vat: price, sort_order: (last?.sort_order ?? -1) + 1 });
  revalidatePath("/admin/products");
  expireCatalog();
}

export async function updateProductSize(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .from("product_sizes")
    .update({
      label: String(formData.get("label") ?? "").trim(),
      price_before_vat: Number(formData.get("price") ?? 0),
    })
    .eq("id", id);

  revalidatePath("/admin/products");
  expireCatalog();
}

/**
 * Moves `id` one step up/down inside `order` (the ids exactly as the admin
 * page shows them) and returns the new list — or null when there is nothing to
 * move. Positions are then rewritten as 0..n-1, so rows that used to share a
 * sort_order end up with distinct ones.
 */
function movedOrder(order: string[], id: string, direction: string): string[] | null {
  const i = order.indexOf(id);
  const j = direction === "up" ? i - 1 : direction === "down" ? i + 1 : -1;
  if (i < 0 || j < 0 || j >= order.length) return null;
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

const parseIds = (raw: FormDataEntryValue | null) =>
  String(raw ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

/** Shop order of the products. `order` = the ids as currently listed, `direction` = up | down. */
export async function moveProduct(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const next = movedOrder(parseIds(formData.get("order")), String(formData.get("id") ?? ""), String(formData.get("direction") ?? ""));
  if (!next) return;
  const db = supabaseAdmin();
  await Promise.all(next.map((id, i) => db.from("products").update({ sort_order: i }).eq("id", id)));
  revalidatePath("/admin/products");
  expireCatalog();
}

/** Order of one product's sizes. `order` = that product's size ids as currently listed. */
export async function moveProductSize(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const productId = String(formData.get("productId") ?? "");
  const next = movedOrder(parseIds(formData.get("order")), String(formData.get("id") ?? ""), String(formData.get("direction") ?? ""));
  if (!productId || !next) return;
  const db = supabaseAdmin();
  await Promise.all(
    next.map((id, i) => db.from("product_sizes").update({ sort_order: i }).eq("id", id).eq("product_id", productId))
  );
  revalidatePath("/admin/products");
  expireCatalog();
}

/** The size that is preselected in the shop — independent of where it sits in the list. */
export async function setDefaultSize(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const productId = String(formData.get("productId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!productId || !id) return;
  const db = supabaseAdmin();
  await db.from("product_sizes").update({ is_default: false }).eq("product_id", productId);
  await db.from("product_sizes").update({ is_default: true }).eq("id", id).eq("product_id", productId);
  revalidatePath("/admin/products");
  expireCatalog();
}

export async function toggleSizeStock(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner" && admin.role !== "kitchen") return;
  const db = supabaseAdmin();

  const id = String(formData.get("id") ?? "");
  const current = String(formData.get("current") ?? "in_stock");
  if (!id) return;

  await db
    .from("product_sizes")
    .update({ stock_status: current === "in_stock" ? "out_of_stock" : "in_stock" })
    .eq("id", id);

  revalidatePath("/admin/products");
  expireCatalog();
}

export async function deleteProductSize(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.from("product_sizes").delete().eq("id", id);
  revalidatePath("/admin/products");
  expireCatalog();
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export async function createAllergen(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const labelHe = String(formData.get("labelHe") ?? "").trim();
  const labelEn = String(formData.get("labelEn") ?? "").trim();
  const color = String(formData.get("color") ?? "");
  if (!labelHe) return;
  const db = supabaseAdmin();
  const { data: last } = await db
    .from("allergens")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  await db.from("allergens").insert({
    label_he: labelHe,
    label_en: labelEn,
    color: HEX_COLOR.test(color) ? color : "#c9923a",
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  revalidatePath("/admin/products");
  expireCatalog();
}

export async function updateAllergen(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  const labelHe = String(formData.get("labelHe") ?? "").trim();
  const color = String(formData.get("color") ?? "");
  if (!id || !labelHe || !HEX_COLOR.test(color)) return;
  await supabaseAdmin()
    .from("allergens")
    .update({ label_he: labelHe, label_en: String(formData.get("labelEn") ?? "").trim(), color })
    .eq("id", id);
  revalidatePath("/admin/products");
  expireCatalog();
}

/** Deleting a tag also removes it from every product that had it (cascade). */
export async function deleteAllergen(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabaseAdmin().from("allergens").delete().eq("id", id);
  revalidatePath("/admin/products");
  expireCatalog();
}

export async function createCategory(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const labelHe = String(formData.get("labelHe") ?? "").trim();
  const labelEn = String(formData.get("labelEn") ?? "").trim();
  if (!labelHe || !labelEn) return;

  const { count } = await db.from("categories").select("id", { count: "exact", head: true });

  await db.from("categories").insert({
    slug: slugify(labelHe),
    label_he: labelHe,
    label_en: labelEn,
    sort_order: count ?? 0,
  });

  revalidatePath("/admin/products");
  expireCatalog();
}

/** Removes the category; products that were in it simply stop being listed under it. */
export async function deleteCategory(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.from("categories").delete().eq("id", id);
  revalidatePath("/admin/products");
  expireCatalog();
}

// The actual file bytes never touch this server — see lib/storage.ts for
// why (Vercel's serverless body-size ceiling). This just authorizes the
// upload and hands the browser a short-lived signed URL to upload directly
// to Supabase Storage; attachProductImage below records the result.
export async function getProductImageUploadTicket(
  productId: string,
  filename: string
): Promise<UploadTicket | null> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return null;
  if (!productId) return null;
  return createUploadTicket(`products/${productId}`, filename);
}

export async function attachProductImage(productId: string, url: string): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  if (!productId || !url) return;
  const db = supabaseAdmin();

  const { data: product } = await db
    .from("products")
    .select("image_urls")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return;

  await db
    .from("products")
    .update({ image_urls: [...product.image_urls, url] })
    .eq("id", productId);

  revalidatePath("/admin/products");
  expireCatalog();
}

export async function removeProductImage(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const productId = String(formData.get("productId") ?? "");
  const url = String(formData.get("url") ?? "");
  if (!productId || !url) return;

  const { data: product } = await db
    .from("products")
    .select("image_urls")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return;

  await db
    .from("products")
    .update({ image_urls: product.image_urls.filter((u: string) => u !== url) })
    .eq("id", productId);

  await deleteImage(url);

  revalidatePath("/admin/products");
  expireCatalog();
}
