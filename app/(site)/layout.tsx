import { getCartSessionId } from "@/lib/session";
import { getCart } from "@/lib/cart";
import { getLocale } from "@/lib/i18n";
import { CartProvider } from "@/components/cart/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { BackToTop } from "@/components/site/BackToTop";
import { CookieNotice } from "@/components/site/CookieNotice";
import { AccessibilityWidget } from "@/components/site/AccessibilityWidget";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const sessionId = await getCartSessionId();
  const [items, locale] = await Promise.all([getCart(sessionId), getLocale()]);

  return (
    <CartProvider initialItems={items}>
      <div
        lang={locale}
        dir={locale === "en" ? "ltr" : "rtl"}
        style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "100%" }}
      >
        <Nav locale={locale} />
        <main style={{ flex: 1 }}>{children}</main>
        <Footer locale={locale} />
        <CartDrawer locale={locale} />
        <BackToTop locale={locale} />
        <AccessibilityWidget locale={locale} />
        <CookieNotice locale={locale} />
      </div>
    </CartProvider>
  );
}
