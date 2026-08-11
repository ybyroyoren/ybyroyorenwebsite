import { getCartSessionId } from "@/lib/session";
import { getCart } from "@/lib/cart";
import { CartProvider } from "@/components/cart/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { BackToTop } from "@/components/site/BackToTop";
import { CookieNotice } from "@/components/site/CookieNotice";
import { AccessibilityWidget } from "@/components/site/AccessibilityWidget";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const sessionId = await getCartSessionId();
  const items = await getCart(sessionId);

  return (
    <CartProvider initialItems={items}>
      <Nav />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
      <CartDrawer />
      <BackToTop />
      <AccessibilityWidget />
      <CookieNotice />
    </CartProvider>
  );
}
