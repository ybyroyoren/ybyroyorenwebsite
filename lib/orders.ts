import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getCart, type CartItemView } from "@/lib/cart";
import { validateCoupon } from "@/lib/coupons";
import { computeCartTotals, formatCurrency, GREETING_CARD_FEE } from "@/lib/pricing";
import { issueReceipt } from "@/lib/green-invoice";
import { sendOrderConfirmationEmail } from "@/lib/resend";
import { addDaysIso } from "@/lib/date";

export interface CreateOrderParams {
  sessionId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pickupDate: string;
  notes: string;
  couponCode: string;
  greetingCardMessage: string;
}

export interface CreateOrderResult {
  orderId: string;
  total: number;
  items: CartItemView[];
  greetingCardFee: number;
}

export async function createPendingOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const items = await getCart(params.sessionId);
  if (items.length === 0) {
    throw new Error("העגלה ריקה");
  }
  const outOfStock = items.find((item) => item.stockStatus === "out_of_stock");
  if (outOfStock) {
    throw new Error(`המוצר "${outOfStock.productName}" אזל מהמלאי`);
  }

  const maxLeadTime = Math.max(0, ...items.map((item) => item.leadTimeDays));
  const earliestPickupDate = addDaysIso(maxLeadTime);
  if (params.pickupDate < earliestPickupDate) {
    throw new Error(`בהתאם למוצרים בעגלה, האיסוף המוקדם ביותר האפשרי הוא ${earliestPickupDate}`);
  }

  const subtotal = items.reduce((sum, item) => sum + item.priceBeforeVat * item.qty, 0);

  let couponId: string | undefined;
  let discountPct = 0;
  if (params.couponCode.trim()) {
    const coupon = await validateCoupon(params.couponCode);
    if (coupon.valid) {
      couponId = coupon.couponId;
      discountPct = coupon.discountPct ?? 0;
    }
  }

  const greetingCardMessage = params.greetingCardMessage.trim().slice(0, 200);
  const greetingCardFee = greetingCardMessage ? GREETING_CARD_FEE : 0;

  const totals = computeCartTotals(subtotal, discountPct, greetingCardFee);
  const db = supabaseAdmin();

  const { data: cartRow } = await db
    .from("carts")
    .select("id")
    .eq("session_user_id", params.sessionId)
    .maybeSingle();

  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      cart_id: cartRow?.id ?? null,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone,
      pickup_date: params.pickupDate,
      notes: params.notes,
      coupon_id: couponId ?? null,
      subtotal: totals.subtotal,
      vat: totals.vat,
      discount: totals.discount,
      total: totals.total,
      greeting_card_message: greetingCardMessage || null,
      greeting_card_fee: greetingCardFee,
      status: "pending",
    })
    .select("id")
    .single();

  if (orderError || !order) throw new Error(orderError?.message ?? "Failed to create order");

  const orderItems = items.map((item) => ({
    order_id: order.id,
    product_name: item.productName,
    size_label: item.sizeLabel,
    unit_price: item.priceBeforeVat,
    qty: item.qty,
  }));

  const { error: itemsError } = await db.from("order_items").insert(orderItems);
  if (itemsError) throw new Error(itemsError.message);

  return { orderId: order.id, total: totals.total, items, greetingCardFee };
}

export interface OrderSummary {
  id: string;
  customerName: string;
  pickupDate: string;
  total: number;
  status: "pending" | "paid" | "cancelled";
}

/**
 * Finalizes an order after payment succeeds — called from the Grow webhook
 * once implemented, and from the simulated success page while Grow isn't
 * configured yet (see lib/grow.ts). Idempotent: re-running on an
 * already-paid order is a no-op.
 *
 * Returns the updated order directly rather than making the caller re-query
 * it — Next.js dedupes identical fetches within a single request, so a
 * fresh `getOrderById` call right after this would silently return the
 * pre-update (still "pending") snapshot.
 */
export async function finalizeOrder(orderId: string, growPaymentId: string): Promise<OrderSummary> {
  const db = supabaseAdmin();

  const { data: order } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) throw new Error("Order not found");
  if (order.status === "paid") {
    return {
      id: order.id,
      customerName: order.customer_name,
      pickupDate: order.pickup_date,
      total: order.total,
      status: order.status,
    };
  }

  const { data: items } = await db
    .from("order_items")
    .select("product_name, size_label, unit_price, qty")
    .eq("order_id", orderId);

  const receiptItems = (items ?? []).map((i) => ({
    description: i.size_label ? `${i.product_name} — ${i.size_label}` : i.product_name,
    quantity: i.qty,
    unitPrice: i.unit_price,
  }));
  if (order.greeting_card_fee > 0) {
    receiptItems.push({ description: "כרטיס ברכה", quantity: 1, unitPrice: order.greeting_card_fee });
  }

  let receiptDocId: string | null = null;
  try {
    const receipt = await issueReceipt({
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      items: receiptItems,
      total: order.total,
    });
    receiptDocId = receipt.documentId;
  } catch (err) {
    console.error(`[green-invoice] Failed to issue receipt for order ${orderId}:`, err);
  }

  await db
    .from("orders")
    .update({ status: "paid", grow_payment_id: growPaymentId, receipt_doc_id: receiptDocId })
    .eq("id", orderId);

  if (order.cart_id) {
    await db.from("cart_items").delete().eq("cart_id", order.cart_id);
  }

  await sendOrderConfirmationEmail({
    to: order.customer_email,
    customerName: order.customer_name,
    orderId: order.id,
    pickupDate: order.pickup_date,
    totalFormatted: formatCurrency(order.total),
  });

  return {
    id: order.id,
    customerName: order.customer_name,
    pickupDate: order.pickup_date,
    total: order.total,
    status: "paid",
  };
}

export async function getOrderById(orderId: string): Promise<OrderSummary | null> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("orders")
    .select("id, customer_name, pickup_date, total, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    customerName: data.customer_name,
    pickupDate: data.pickup_date,
    total: data.total,
    status: data.status,
  };
}
