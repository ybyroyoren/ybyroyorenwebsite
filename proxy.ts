import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const CART_SESSION_COOKIE = "cart_session";

// Hebrew is the default locale and stays unprefixed at the root ("/shop"),
// English lives under a real "/en" prefix ("/en/shop"). The actual route
// files live under app/(site)/[locale]/..., so unprefixed requests are
// rewritten (not redirected) to "/he/..." internally — the URL bar keeps
// showing the clean path. A request that explicitly types "/he/..." is
// redirected to the unprefixed form so there's a single canonical URL per
// page (avoids duplicate-content / two URLs for the same Hebrew page).
/**
 * Keeps an admin signed in. The access token in the session cookie expires after an hour; the
 * browser client renews it only while a page is open, so someone coming back later would find
 * the server rejecting the stale cookie and land on the login page. Renewing it here, on every
 * admin request, uses the long-lived refresh token and writes the new cookies to both the
 * request (so this very render sees them) and the response (so the browser stores them).
 */
async function keepAdminSessionAlive(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const hasSession = request.cookies.getAll().some((c) => /^sb-.*-auth-token/.test(c.name));
  if (!hasSession || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return response;
  try {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser();
  } catch {
    // never let a refresh problem break the request
  }
  return response;
}

export async function proxy(request: NextRequest) {
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
  } else if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    response = await keepAdminSessionAlive(request);
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
