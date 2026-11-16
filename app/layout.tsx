import type { Metadata } from "next";
import "./fonts.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Y | Roy Oren — שף פרטי",
    template: "%s — Y | Roy Oren",
  },
  description: "שף פרטי לאירועים, ארוחות פתוחות ומוצרי בית",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the inline script below adds a class to <html>
    // before React hydrates.
    <html lang="he" dir="rtl" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* The fonts the first paint needs (Hebrew and Latin of the body font), fetched early. */}
        <link rel="preload" href="/fonts/assistant-hebrew.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/assistant-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/gveret-levin-hebrew.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* [data-reveal] content is only hidden once JS is known to run; if
            RevealObserver hasn't signalled within 4s, show everything. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'document.documentElement.classList.add("js");setTimeout(function(){if(!document.documentElement.hasAttribute("data-reveal-ready"))document.documentElement.classList.remove("js")},4000)',
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
