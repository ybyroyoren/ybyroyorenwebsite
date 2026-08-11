import { NextResponse } from "next/server";
import { finalizeOrder } from "@/lib/orders";
import { finalizeMealRegistration } from "@/lib/meals";

// Grow (via the Make scenario's "notify Url") calls this when a payment's
// status changes. Confirmed from a real sandbox transaction:
//
// - Body is application/x-www-form-urlencoded (NOT JSON), with PHP-style
//   bracket notation for nested fields, e.g. data[customFields][cField1].
// - Top-level `status=1` means the payment succeeded.
// - `data[customFields][cField1]` carries the referenceId we set when
//   creating the payment link (see lib/grow.ts + the Grow module's "Custom
//   Field 1" mapping in Make) — prefixed "order:" or "meal:" to route it.
// - `data[transactionId]` is Grow's id for the transaction, stored as our
//   grow_payment_id.
// - Grow sends no signature header (confirmed against a real payload) —
//   there's nothing to verify against. We rely on the notify Url being
//   effectively secret (known only to Grow/Make) plus referenceId having to
//   match a real pending order/registration in our database.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const params = new URLSearchParams(rawBody);

  const status = params.get("status");
  const referenceId = params.get("data[customFields][cField1]");
  const transactionId = params.get("data[transactionId]");

  if (status !== "1" || !referenceId) {
    return NextResponse.json({ ok: true });
  }

  const [kind, id] = referenceId.split(":");
  const paymentId = transactionId ?? "";

  if (kind === "order") {
    await finalizeOrder(id, paymentId);
  } else if (kind === "meal") {
    await finalizeMealRegistration(id, paymentId);
  } else {
    return NextResponse.json({ error: "Unknown reference" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
