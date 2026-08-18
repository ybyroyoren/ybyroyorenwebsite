import { NextResponse, type NextRequest } from "next/server";

export const CART_SESSION_COOKIE = "cart_session";

// Hebrew is the default locale and stays unprefixed at the root ("/shop"),
// English lives under a real "/en" prefix ("/en/shop"). The actual route
// files live under app/(site)/[locale]/..., so unprefixed requests are
// rewritten (not redirected) to "/he/..." internally — the URL bar keeps
// showing the clean path. A request that explicitly types "/he/..." is
// redirected to the unprefixed form so there's a single canonical URL per
// page (avoids duplicate-content / two URLs for the same Hebrew page).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isExcluded =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  let response: NextResponse;

  if (!isExcluded && (pathname === "/he" || pathname.startsWith("/he/"))) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    response = NextResponse.redirect(url, 308);
  } else if (!isExcluded && pathname !== "/en" && !pathname.startsWith("/en/")) {
    const url = request.nextUrl.clone();
    url.pathname = `/he${pathname}`;
    response = NextResponse.rewrite(url);
  } else {
    response = NextResponse.next();
  }

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
