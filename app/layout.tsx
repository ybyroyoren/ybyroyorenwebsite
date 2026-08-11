import type { Metadata } from "next";
import { Frank_Ruhl_Libre, Assistant } from "next/font/google";
import "./globals.css";

const frankRuhlLibre = Frank_Ruhl_Libre({
  variable: "--font-serif",
  subsets: ["latin", "hebrew"],
  weight: ["300", "400", "500", "700", "900"],
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
    <html lang="he" dir="rtl" className={`${frankRuhlLibre.variable} ${assistant.variable}`}>
      <body>{children}</body>
    </html>
  );
}
