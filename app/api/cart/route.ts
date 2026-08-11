import { NextResponse } from "next/server";
import { getCartSessionId } from "@/lib/session";
import { addCartItem, getCart, removeCartItem, updateCartItemQty } from "@/lib/cart";

export async function GET() {
  const sessionId = await getCartSessionId();
  const items = await getCart(sessionId);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const sessionId = await getCartSessionId();
  const { productSizeId, qty } = await request.json();

  if (typeof productSizeId !== "string" || typeof qty !== "number" || qty <= 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await addCartItem(sessionId, productSizeId, qty);
  const items = await getCart(sessionId);
  return NextResponse.json({ items });
}

export async function PATCH(request: Request) {
  const sessionId = await getCartSessionId();
  const { cartItemId, qty } = await request.json();

  if (typeof cartItemId !== "string" || typeof qty !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await updateCartItemQty(sessionId, cartItemId, qty);
  const items = await getCart(sessionId);
  return NextResponse.json({ items });
}

export async function DELETE(request: Request) {
  const sessionId = await getCartSessionId();
  const { cartItemId } = await request.json();

  if (typeof cartItemId !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await removeCartItem(sessionId, cartItemId);
  const items = await getCart(sessionId);
  return NextResponse.json({ items });
}
