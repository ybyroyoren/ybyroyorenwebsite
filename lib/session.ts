import "server-only";
import { cookies } from "next/headers";

const CART_SESSION_COOKIE = "cart_session";

/**
 * Reads the cart session id set by proxy.ts. The proxy guarantees this
 * cookie exists on every request, so this should never be null in practice —
 * the fallback only matters for tooling that bypasses the proxy (e.g. tests).
 */
export async function getCartSessionId(): Promise<string> {
  const store = await cookies();
  return store.get(CART_SESSION_COOKIE)?.value ?? "no-session";
}
