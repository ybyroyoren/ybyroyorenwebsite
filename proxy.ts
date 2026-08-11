import { NextResponse, type NextRequest } from "next/server";

export const CART_SESSION_COOKIE = "cart_session";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get(CART_SESSION_COOKIE)) {
    response.cookies.set(CART_SESSION_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
