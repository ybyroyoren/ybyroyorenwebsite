import "server-only";

// Grow (payments) is wired through a Make.com scenario, not a direct API:
// Custom Webhook -> Grow "Create Payment Link" -> Webhook response.
// POSTing the order/customer/product details to GROW_MAKE_WEBHOOK_URL runs
// that scenario synchronously and returns { paymentUrl, paymentLinkId,
// paymentLinkToken } in the response body.

export interface PaymentLineItem {
  name: string;
  price: number;
  quantity: number;
}

export interface CreatePaymentParams {
  items: PaymentLineItem[];
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  successUrl: string;
  failUrl: string;
  /** Our internal order/registration id, so the webhook can match it back. */
  referenceId: string;
}

export interface CreatePaymentResult {
  paymentUrl: string;
  growPaymentId: string;
}

const isConfigured = () => Boolean(process.env.GROW_MAKE_WEBHOOK_URL);

export async function createPaymentRequest(
  params: CreatePaymentParams
): Promise<CreatePaymentResult> {
  if (!isConfigured()) {
    console.warn(
      "[grow] GROW_MAKE_WEBHOOK_URL not set — simulating an instant successful payment."
    );
    const simulatedUrl = new URL(params.successUrl);
    simulatedUrl.searchParams.set("simulated", "1");
    simulatedUrl.searchParams.set("ref", params.referenceId);

    return {
      paymentUrl: simulatedUrl.toString(),
      growPaymentId: `simulated-${params.referenceId}`,
    };
  }

  const res = await fetch(process.env.GROW_MAKE_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      referenceId: params.referenceId,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      customerEmail: params.customerEmail,
      title: params.description,
      successUrl: params.successUrl,
      products: params.items.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        // vatType 1 = Regular VAT. Confirmed against a real transaction that
        // Grow extracts an implied VAT portion from this price rather than
        // adding VAT on top — so callers must pass the final, already
        // VAT-inclusive price here for the charge to match what was quoted.
        vatType: 1,
      })),
    }),
  });

  if (!res.ok) {
    throw new Error(`Grow payment link creation failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    paymentUrl: string;
    paymentLinkId: string;
    paymentLinkToken: string;
  };

  return { paymentUrl: data.paymentUrl, growPaymentId: data.paymentLinkId };
}
