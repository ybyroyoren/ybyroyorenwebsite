"use server";

import { redirect } from "next/navigation";
import { getCartSessionId } from "@/lib/session";
import { createPendingOrder } from "@/lib/orders";
import { createPaymentRequest } from "@/lib/grow";
import { localePath } from "@/lib/i18n";

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
  const locale = formData.get("locale") === "en" ? "en" : "he";

  if (!customerName || !customerEmail || !customerPhone || !pickupDate) {
    return { error: "נא למלא את כל השדות הנדרשים" };
  }

  const sessionId = await getCartSessionId();

  let orderId: string;
  let total: number;
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
    total = result.total;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "משהו השתבש, נסו שוב" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Grow's vatType:1 extracts an implied VAT portion from whatever price it's
  // given rather than adding VAT on top — so a single line for the final,
  // already-VAT-inclusive total is what guarantees the customer is charged
  // exactly what they were quoted (itemized breakdown + discounts would each
  // need separate VAT-inclusive math that could drift by a few agorot).
  const payment = await createPaymentRequest({
    items: [{ name: `הזמנה מהחנות — Y by Roy Oren`, price: total, quantity: 1 }],
    description: `הזמנה מהחנות — ${orderId}`,
    customerName,
    customerEmail,
    customerPhone,
    successUrl: `${siteUrl}${localePath(locale, "/checkout/success")}?orderId=${orderId}`,
    failUrl: `${siteUrl}${localePath(locale, "/checkout")}?failed=1`,
    referenceId: `order:${orderId}`,
  });

  redirect(payment.paymentUrl);
}
