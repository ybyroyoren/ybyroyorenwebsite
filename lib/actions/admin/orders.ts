"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { computeCartTotals } from "@/lib/pricing";

const PAYMENT_STATUSES = ["pending", "paid", "cancelled"];
const PAYMENT_METHODS = ["website", "credit_card", "bit", "paybox", "cash", "bank_transfer"];

export async function deleteOrder(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.from("orders").delete().eq("id", id);
  revalidatePath("/admin/orders");
}

export async function updateOrderPayment(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const paymentMethodRaw = String(formData.get("paymentMethod") ?? "");
  const paymentMethod = PAYMENT_METHODS.includes(paymentMethodRaw) ? paymentMethodRaw : null;
  if (!id || !PAYMENT_STATUSES.includes(status)) return;

  await db.from("orders").update({ status, payment_method: paymentMethod }).eq("id", id);
  revalidatePath("/admin/orders");
}

const FULFILLMENT_STATUSES = [
  "awaiting_payment",
  "open",
  "prepared",
  "completed",
  "partially_fulfilled",
  "no_show",
];

export async function updateOrderFulfillmentStatus(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!["owner", "kitchen"].includes(admin.role)) return;
  const db = supabaseAdmin();

  const id = String(formData.get("id") ?? "");
  const fulfillmentStatus = String(formData.get("fulfillmentStatus") ?? "");
  if (!id || !FULFILLMENT_STATUSES.includes(fulfillmentStatus)) return;

  await db.from("orders").update({ fulfillment_status: fulfillmentStatus }).eq("id", id);
  revalidatePath("/admin/orders");
}

export interface ManualOrderItemInput {
  productSizeId: string;
  qty: number;
}

export async function createManualOrder(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const customerEmail = String(formData.get("customerEmail") ?? "").trim();
  const pickupDate = String(formData.get("pickupDate") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const status = String(formData.get("status") ?? "paid");
  const paymentMethodRaw = String(formData.get("paymentMethod") ?? "");
  const paymentMethod = PAYMENT_METHODS.includes(paymentMethodRaw) ? paymentMethodRaw : null;

  let items: ManualOrderItemInput[];
  try {
    items = JSON.parse(String(formData.get("itemsJson") ?? "[]"));
  } catch {
    return;
  }

  if (
    !customerName ||
    !customerPhone ||
    !pickupDate ||
    !PAYMENT_STATUSES.includes(status) ||
    !Array.isArray(items) ||
    items.length === 0 ||
    items.some((i) => !i.productSizeId || !(i.qty > 0))
  ) {
    return;
  }

  const { data: sizes, error: sizesError } = await db
    .from("product_sizes")
    .select("id, label, price_before_vat, products(name)")
    .in(
      "id",
      [...new Set(items.map((i) => i.productSizeId))]
    );
  const sizeById = new Map((sizes ?? []).map((s) => [s.id, s]));
  if (sizesError || items.some((i) => !sizeById.has(i.productSizeId))) return;
  const subtotal = items.reduce((sum, i) => {
    const size = sizeById.get(i.productSizeId);
    return sum + (size ? size.price_before_vat * i.qty : 0);
  }, 0);
  const totals = computeCartTotals(subtotal, 0, 0);

  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      pickup_date: pickupDate,
      notes,
      subtotal: totals.subtotal,
      vat: totals.vat,
      discount: totals.discount,
      total: totals.total,
      status,
      payment_method: paymentMethod,
      fulfillment_status: status === "paid" ? "open" : "awaiting_payment",
    })
    .select("id")
    .single();
  if (orderError || !order) return;

  const orderItems = items.map((i) => {
    const size = sizeById.get(i.productSizeId)!;
    const product = size.products as unknown as { name: string } | null;
    return {
      order_id: order.id,
      product_name: product?.name ?? "",
      size_label: size.label,
      unit_price: size.price_before_vat,
      qty: i.qty,
    };
  });
  await db.from("order_items").insert(orderItems);

  revalidatePath("/admin/orders");
}
