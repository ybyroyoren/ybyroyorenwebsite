"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { deleteImage, uploadImage } from "@/lib/storage";

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || `product-${Date.now()}`
  );
}

export async function createProduct(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const allergens = String(formData.get("allergens") ?? "").trim();
  const sizeLabel = String(formData.get("sizeLabel") ?? "").trim();
  const sizePrice = Number(formData.get("sizePrice") ?? 0);
  const leadTimeDays = Number(formData.get("leadTimeDays") ?? 0);

  if (!name || !category || !sizeLabel || !(sizePrice > 0)) return;

  const { data: product, error } = await db
    .from("products")
    .insert({
      name,
      slug: slugify(name),
      category,
      description,
      allergens,
      lead_time_days: Math.max(0, leadTimeDays),
    })
    .select("id")
    .single();

  if (error || !product) return;

  await db.from("product_sizes").insert({
    product_id: product.id,
    label: sizeLabel,
    price_before_vat: sizePrice,
  });

  revalidatePath("/admin/products");
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
      category: String(formData.get("category") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      allergens: String(formData.get("allergens") ?? "").trim(),
      active: formData.get("active") === "on",
      lead_time_days: Math.max(0, Number(formData.get("leadTimeDays") ?? 0)),
    })
    .eq("id", id);

  revalidatePath("/admin/products");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.from("products").delete().eq("id", id);
  revalidatePath("/admin/products");
}

export async function addProductSize(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const productId = String(formData.get("productId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  if (!productId || !label || !(price > 0)) return;

  await db.from("product_sizes").insert({ product_id: productId, label, price_before_vat: price });
  revalidatePath("/admin/products");
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
}

export async function deleteProductSize(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.from("product_sizes").delete().eq("id", id);
  revalidatePath("/admin/products");
}

export async function uploadProductImage(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const productId = String(formData.get("productId") ?? "");
  const file = formData.get("image");
  if (!productId || !(file instanceof File) || file.size === 0) return;

  const { data: product } = await db
    .from("products")
    .select("image_urls")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return;

  const url = await uploadImage(file, `products/${productId}`);

  await db
    .from("products")
    .update({ image_urls: [...product.image_urls, url] })
    .eq("id", productId);

  revalidatePath("/admin/products");
  revalidatePath("/shop");
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
  revalidatePath("/shop");
}
