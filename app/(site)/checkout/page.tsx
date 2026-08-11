import type { Metadata } from "next";
import { CheckoutContent } from "@/components/checkout/CheckoutContent";

export const metadata: Metadata = { title: "תשלום" };

export default function CheckoutPage() {
  return <CheckoutContent />;
}
