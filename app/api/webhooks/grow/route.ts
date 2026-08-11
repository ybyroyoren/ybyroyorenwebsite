import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/grow";
import { finalizeOrder } from "@/lib/orders";
import { finalizeMealRegistration } from "@/lib/meals";

// Grow calls this once a payment succeeds. Payload shape is a placeholder —
// { referenceId, paymentId, status } — until we have Grow's real webhook
// docs; referenceId is whatever we passed as `referenceId` in
// createPaymentRequest (see lib/grow.ts), prefixed "order:" or "meal:" to
// route it to the right finalizer.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-grow-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as {
    referenceId: string;
    paymentId: string;
    status: string;
  };

  if (payload.status !== "success") {
    return NextResponse.json({ ok: true });
  }

  const [kind, id] = payload.referenceId.split(":");

  if (kind === "order") {
    await finalizeOrder(id, payload.paymentId);
  } else if (kind === "meal") {
    await finalizeMealRegistration(id, payload.paymentId);
  } else {
    return NextResponse.json({ error: "Unknown reference" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
