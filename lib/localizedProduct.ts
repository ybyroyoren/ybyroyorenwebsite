import type { ProductView } from "@/lib/products";
import type { Locale } from "@/lib/dictionary";

// Pure display logic, safe to import from Client Components — unlike
// lib/products.ts (server-only, talks to Supabase), this file has no
// runtime dependency on server-only code, just the ProductView type.
export function localizedProduct(product: ProductView, locale: Locale) {
  return {
    name: (locale === "en" && product.nameEn) || product.name,
    description: (locale === "en" && product.descriptionEn) || product.description,
    allergens: (locale === "en" && product.allergensEn) || product.allergens,
  };
}
