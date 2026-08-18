import type { Metadata } from "next";
import { resolveLocale } from "@/lib/i18n";
import { CheckoutContent } from "@/components/checkout/CheckoutContent";

export const metadata: Metadata = { title: "תשלום" };

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  return <CheckoutContent locale={locale} />;
}
