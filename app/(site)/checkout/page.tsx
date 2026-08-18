import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";
import { CheckoutContent } from "@/components/checkout/CheckoutContent";

export const metadata: Metadata = { title: "תשלום" };

export default async function CheckoutPage() {
  const locale = await getLocale();
  return <CheckoutContent locale={locale} />;
}
