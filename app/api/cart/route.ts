import { NextResponse } from "next/server";
import { getCartSessionId } from "@/lib/session";
import { getMinOrder } from "@/lib/siteSettings";
import { addCartItem, getCart, removeCartItem, SoldOutError, updateCartItemQty } from "@/lib/cart";

export async function GET() {
  const sessionId = await getCartSessionId();
  const [items, minOrder] = await Promise.all([getCart(sessionId), getMinOrder()]);
  return NextResponse.json({ items, minOrder });
}

export async function POST(request: Request) {
  const sessionId = await getCartSessionId();
  const { productSizeId, qty } = await request.json();

  if (typeof productSizeId !== "string" || typeof qty !== "number" || qty <= 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const cartId = await addCartItem(sessionId, productSizeId, qty);
    const [items, minOrder] = await Promise.all([getCart(sessionId, cartId), getMinOrder()]);
    return NextResponse.json({ items, minOrder });
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
  const [items, minOrder] = await Promise.all([getCart(sessionId, cartId), getMinOrder()]);
  return NextResponse.json({ items, minOrder });
}

export async function DELETE(request: Request) {
  const sessionId = await getCartSessionId();
  const { cartItemId } = await request.json();

  if (typeof cartItemId !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const cartId = await removeCartItem(sessionId, cartItemId);
  const [items, minOrder] = await Promise.all([getCart(sessionId, cartId), getMinOrder()]);
  return NextResponse.json({ items, minOrder });
}
