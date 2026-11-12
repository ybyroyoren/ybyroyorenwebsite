import { NextResponse } from "next/server";
import { getCartSessionId } from "@/lib/session";
import { getCart } from "@/lib/cart";
import { checkAvailability, nextAvailableDates, type AvailabilityLine } from "@/lib/availability";

/** Can the current cart be picked up on ?date=YYYY-MM-DD? Returns the problems (if any) and the next dates that work. */
export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const items = await getCart(await getCartSessionId());
  const lines: AvailabilityLine[] = items.map((i) => ({
    productSizeId: i.productSizeId,
    productId: i.productId,
    productName: i.productName,
    sizeLabel: i.sizeLabel,
    qty: i.qty,
  }));
  const problems = await checkAvailability(lines, date);
  const alternatives = problems.length > 0 ? await nextAvailableDates(lines, date) : [];
  return NextResponse.json({ problems, alternatives });
}
