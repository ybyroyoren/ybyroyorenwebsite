"use server";

import { redirect } from "next/navigation";
import { getCartSessionId } from "@/lib/session";
import { createPendingOrder } from "@/lib/orders";
import { createPaymentRequest } from "@/lib/grow";

export interface CheckoutState {
  error: string | null;
}

export async function submitCheckout(
  _prevState: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerEmail = String(formData.get("customerEmail") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const pickupDate = String(formData.get("pickupDate") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const couponCode = String(formData.get("couponCode") ?? "");
  const greetingCardMessage = String(formData.get("greetingCardMessage") ?? "").trim().slice(0, 200);

  if (!customerName || !customerEmail || !customerPhone || !pickupDate) {
    return { error: "נא למלא את כל השדות הנדרשים" };
  }

  const sessionId = await getCartSessionId();

  let orderId: string;
  let items: Awaited<ReturnType<typeof createPendingOrder>>["items"];
  let greetingCardFee: number;
  try {
    const result = await createPendingOrder({
      sessionId,
      customerName,
      customerEmail,
      customerPhone,
      pickupDate,
      notes,
      couponCode,
      greetingCardMessage,
    });
    orderId = result.orderId;
    items = result.items;
    greetingCardFee = result.greetingCardFee;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "משהו השתבש, נסו שוב" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const paymentItems = items.map((item) => ({
    name: item.sizeLabel ? `${item.productName} — ${item.sizeLabel}` : item.productName,
    price: item.priceBeforeVat,
    quantity: item.qty,
  }));
  if (greetingCardFee > 0) {
    paymentItems.push({ name: "כרטיס ברכה", price: greetingCardFee, quantity: 1 });
  }

  const payment = await createPaymentRequest({
    items: paymentItems,
    description: `הזמנה מהחנות — ${orderId}`,
    customerName,
    customerEmail,
    customerPhone,
    successUrl: `${siteUrl}/checkout/success?orderId=${orderId}`,
    failUrl: `${siteUrl}/checkout?failed=1`,
    referenceId: `order:${orderId}`,
  });

  redirect(payment.paymentUrl);
}
