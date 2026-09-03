import { resolveLocale } from "@/lib/i18n";
import { getDict } from "@/lib/dictionary";
import { CartProvider } from "@/components/cart/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { BackToTop } from "@/components/site/BackToTop";
import { CookieNotice } from "@/components/site/CookieNotice";
import { AccessibilityWidget } from "@/components/site/AccessibilityWidget";

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const t = getDict(locale).common;

  return (
    <CartProvider>
      <div
        lang={locale}
        dir={locale === "en" ? "ltr" : "rtl"}
        style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "100%" }}
      >
        <a href="#main-content" className="skipLink">
          {t.skipToContent}
        </a>
        <Nav locale={locale} />
        <main id="main-content" style={{ flex: 1 }}>
          {children}
        </main>
        <Footer locale={locale} />
        <CartDrawer locale={locale} />
        <BackToTop locale={locale} />
        <AccessibilityWidget locale={locale} />
        <CookieNotice locale={locale} />
      </div>
    </CartProvider>
  );
}
