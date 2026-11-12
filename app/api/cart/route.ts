import { NextResponse } from "next/server";
import { getCartSessionId } from "@/lib/session";
import { addCartItem, getCart, removeCartItem, SoldOutError, updateCartItemQty } from "@/lib/cart";

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

  try {
    const cartId = await addCartItem(sessionId, productSizeId, qty);
    const items = await getCart(sessionId, cartId);
    return NextResponse.json({ items });
  } catch (err) {
    if (err instanceof SoldOutError) return NextResponse.json({ error: err.message, soldOut: true }, { status: 409 });
    throw err;
  }
}

export async function PATCH(request: Request) {
  const sessionId = await getCartSessionId();
  const { cartItemId, qty } = await request.json();

  if (typeof cartItemId !== "string" || typeof qty !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const cartId = await updateCartItemQty(sessionId, cartItemId, qty);
  const items = await getCart(sessionId, cartId);
  return NextResponse.json({ items });
}

export async function DELETE(request: Request) {
  const sessionId = await getCartSessionId();
  const { cartItemId } = await request.json();

  if (typeof cartItemId !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const cartId = await removeCartItem(sessionId, cartItemId);
  const items = await getCart(sessionId, cartId);
  return NextResponse.json({ items });
}
