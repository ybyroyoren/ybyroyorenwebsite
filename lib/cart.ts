import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface CartItemView {
  id: string;
  productSizeId: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  sizeLabel: string;
  priceBeforeVat: number;
  qty: number;
  stockStatus: "in_stock" | "out_of_stock";
  leadTimeDays: number;
}

interface CartItemRow {
  id: string;
  qty: number;
  product_sizes: {
    id: string;
    label: string;
    price_before_vat: number;
    stock_status: "in_stock" | "out_of_stock";
    products: {
      id: string;
      name: string;
      slug: string;
      lead_time_days: number;
      image_urls: string[];
    } | null;
  } | null;
}

async function getOrCreateCartId(sessionUserId: string): Promise<string> {
  const db = supabaseAdmin();

  // One round trip instead of select-then-maybe-insert: ON CONFLICT DO
  // UPDATE (upsert's default, not ignoreDuplicates — a DO NOTHING wouldn't
  // return the existing row) resolves to the same row either way.
  const { data, error } = await db
    .from("carts")
    .upsert({ session_user_id: sessionUserId }, { onConflict: "session_user_id" })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create cart");
  return data.id;
}

export async function getCart(sessionUserId: string): Promise<CartItemView[]> {
  const db = supabaseAdmin();
  const cartId = await getOrCreateCartId(sessionUserId);

  const { data, error } = await db
    .from("cart_items")
    .select(
      "id, qty, product_sizes(id, label, price_before_vat, stock_status, products(id, name, slug, lead_time_days, image_urls))"
    )
    .eq("cart_id", cartId);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as CartItemRow[])
    .filter((row) => row.product_sizes && row.product_sizes.products)
    .map((row) => {
      const size = row.product_sizes!;
      const product = size.products!;
      return {
        id: row.id,
        productSizeId: size.id,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        imageUrl: product.image_urls[0] ?? null,
        sizeLabel: size.label,
        priceBeforeVat: size.price_before_vat,
        qty: row.qty,
        stockStatus: size.stock_status,
        leadTimeDays: product.lead_time_days,
      };
    });
}

export async function addCartItem(
  sessionUserId: string,
  productSizeId: string,
  qty: number
): Promise<void> {
  const db = supabaseAdmin();
  const cartId = await getOrCreateCartId(sessionUserId);

  const { data: existing } = await db
    .from("cart_items")
    .select("id, qty")
    .eq("cart_id", cartId)
    .eq("product_size_id", productSizeId)
    .maybeSingle();

  if (existing) {
    const { error } = await db
      .from("cart_items")
      .update({ qty: existing.qty + qty })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await db
    .from("cart_items")
    .insert({ cart_id: cartId, product_size_id: productSizeId, qty });
  if (error) throw new Error(error.message);
}

export async function updateCartItemQty(
  sessionUserId: string,
  cartItemId: string,
  qty: number
): Promise<void> {
  const db = supabaseAdmin();
  const cartId = await getOrCreateCartId(sessionUserId);

  if (qty <= 0) {
    const { error } = await db
      .from("cart_items")
      .delete()
      .eq("id", cartItemId)
      .eq("cart_id", cartId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await db
    .from("cart_items")
    .update({ qty })
    .eq("id", cartItemId)
    .eq("cart_id", cartId);
  if (error) throw new Error(error.message);
}

export async function removeCartItem(sessionUserId: string, cartItemId: string): Promise<void> {
  const db = supabaseAdmin();
  const cartId = await getOrCreateCartId(sessionUserId);

  const { error } = await db
    .from("cart_items")
    .delete()
    .eq("id", cartItemId)
    .eq("cart_id", cartId);
  if (error) throw new Error(error.message);
}

export async function clearCart(sessionUserId: string): Promise<void> {
  const db = supabaseAdmin();
  const cartId = await getOrCreateCartId(sessionUserId);

  const { error } = await db.from("cart_items").delete().eq("cart_id", cartId);
  if (error) throw new Error(error.message);
}
