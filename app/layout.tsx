import type { Metadata } from "next";
import { Frank_Ruhl_Libre, Assistant } from "next/font/google";
import "./globals.css";

const frankRuhlLibre = Frank_Ruhl_Libre({
  variable: "--font-serif",
  subsets: ["latin", "hebrew"],
  weight: ["700", "900"], // only the Y logo mark still uses the serif face
  display: "swap",
});

const assistant = Assistant({
  variable: "--font-sans",
  subsets: ["latin", "hebrew"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

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
    <html lang="he" dir="rtl" data-scroll-behavior="smooth" className={`${frankRuhlLibre.variable} ${assistant.variable}`} suppressHydrationWarning>
      <head>
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
