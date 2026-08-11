import { NextResponse } from "next/server";

// TEMPORARY: capturing the real shape of Grow's payment-notify webhook
// before wiring up real handling. Logs everything Vercel receives here so we
// can inspect it and rewrite this properly. Do not leave this in place once
// we know the real payload — see git history for the previous placeholder
// implementation this replaced.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const headers = Object.fromEntries(request.headers.entries());
  console.log(
    "[grow-webhook] Received:",
    JSON.stringify({ headers, body: rawBody }, null, 2)
  );
  return NextResponse.json({ ok: true });
}
